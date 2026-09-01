# Paref — Football Event Registration & Shop

An MVP web app for a youth football event: parents register, add their
players, browse a shop (event shirts, individual items, and bundles), and
check out; admins/staff verify payments, manage fulfillment, and view
analytics. Google Sheets is the database for this version.

## Architecture

- **Backend**: Python + FastAPI. All business logic (auth, pricing,
  inventory, bundle resolution, order creation, admin operations,
  analytics) lives here. The frontend never talks to Google Sheets
  directly and is never trusted for price/total/inventory/permission
  decisions — the backend recomputes and re-validates everything server
  side on every request.
- **Frontend**: Next.js + React + TypeScript + Tailwind, mobile-first.
- **Database**: Google Sheets, accessed only through a repository layer
  (`backend/app/repositories/`). An in-memory implementation of the same
  interface backs local dev and the test suite, so nothing needs a real
  spreadsheet to be exercised. See "Future-proofing" below for how this
  makes a later move to PostgreSQL low-risk.
- **Auth**: Firebase Authentication (email/password) if available in your
  Firebase project's free tier (it is, as of this writing). The frontend
  signs in with the Firebase JS SDK and sends the resulting ID token to
  the backend, which verifies it with the Firebase Admin SDK before
  trusting anything about "who this request is". A `dev` auth mode
  (fake `Bearer dev:<uid>` tokens) exists for local development and CI
  without a Firebase project — see below. **Never enable it outside
  local dev.**

```
football-event-app/           (this repo, named "Paref")
├── frontend/                 Next.js app (parent + admin UI)
├── backend/
│   └── app/
│       ├── api/              route handlers only — no business logic
│       ├── api/admin/        admin/staff-only routes
│       ├── auth/             Firebase/dev token verification, FastAPI deps
│       ├── core/             settings, typed errors, rate limiting
│       ├── models/           domain records (mirror sheet rows)
│       ├── schemas/          API request/response shapes
│       ├── services/         business logic (the OrderService section
│       │                     below is the clearest example)
│       └── repositories/     the only code that touches storage
│           ├── base.py       the interface everything else depends on
│           ├── memory.py     in-memory implementation (dev/tests)
│           ├── google_sheets.py + sheets_client.py   real Sheets backend
│           └── factory.py    picks an implementation from REPOSITORY_BACKEND
├── backend/seed/              development seed data
├── backend/tests/             pytest suite
├── google-sheets/README.md    spreadsheet setup + worksheet schema
├── .env.example
└── .gitignore
```

## Local development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env         # then edit backend/.env — see below
uvicorn app.main:app --reload
```

Runs at **http://localhost:8000**. Interactive API docs (Swagger UI) at
**http://localhost:8000/docs**; ReDoc at **http://localhost:8000/redoc**.

For local development without any Google/Firebase credentials, set in
`backend/.env`:

```
REPOSITORY_BACKEND=memory
AUTH_BACKEND=dev
SEED_ON_STARTUP=true
```

This runs entirely in-process (data resets whenever the server restarts)
and seeds development data — 5 parents, 8 players, both shirts, all 7
individual items, all 4 bundles, and 10 sample orders (see
`backend/seed/seed_data.py`; every price in it is a placeholder). With
`AUTH_BACKEND=dev`, authenticate requests with `Authorization: Bearer
dev:<any-uid>`; the seeded accounts are `dev:dev-admin-1` (ADMIN),
`dev:dev-staff-1` (STAFF), and `dev:dev-parent-1` through `dev:dev-parent-5`.

To run against the real Google Sheets + Firebase backends instead, see
[google-sheets/README.md](google-sheets/README.md) and "Firebase setup"
below, then set `REPOSITORY_BACKEND=google_sheets` and
`AUTH_BACKEND=firebase` in `backend/.env`.

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # then edit — see frontend/README.md
npm run dev
```

Runs at **http://localhost:3000**.

### Running both together

Start the backend first (port 8000), then the frontend (port 3000) in a
second terminal. `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local`
should point at the backend; `CORS_ORIGINS` in `backend/.env` should
include the frontend's origin (`http://localhost:3000` by default).

### Tests

```bash
cd backend
source venv/bin/activate
pytest
```

The suite runs entirely against the in-memory repository (no credentials
needed) and covers registration, auth verification, player ownership,
product/variant/bundle retrieval, cart calculation, order total
calculation, bundle-to-component inventory resolution, inventory
validation (including rejecting an out-of-stock checkout without
mutating stock), order creation, duplicate-checkout prevention, admin
role authorization, payment/fulfillment status updates, order lookup,
and already-claimed-order prevention.

## Environment variables

See `.env.example` at the repo root for the full list with comments.
Copy the relevant parts into `backend/.env` and `frontend/.env.local`.
Never commit either filled-in file — both are covered by `.gitignore`.

## Google Sheets setup

See [google-sheets/README.md](google-sheets/README.md) for creating the
Google Cloud project, service account, and spreadsheet, and for the exact
worksheet/column schema the backend expects.

## Firebase setup

1. Go to the [Firebase console](https://console.firebase.google.com/) and create a project (the free Spark plan covers everything this app needs).
2. **Build → Authentication → Get started**, then enable the **Email/Password** sign-in provider.
3. **Project settings → General → Your apps → Add app → Web app**. Copy the config values into `frontend/.env.local`:
   `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`. Set `NEXT_PUBLIC_AUTH_MODE=firebase`.
4. **Project settings → Service accounts → Generate new private key**. This downloads a JSON file with `project_id`, `client_email`, and `private_key`. Put those into `backend/.env` as `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (keep the `\n` sequences in the private key literal — the backend converts them back to real newlines). Set `AUTH_BACKEND=firebase`.
5. The frontend signs users up/in with the Firebase JS SDK and sends the ID token as `Authorization: Bearer <token>`; the backend verifies it with the Firebase Admin SDK (`app/auth/firebase.py`) on every request and only ever trusts the UID that verification returns — not anything the client claims about itself.
6. A Firebase UID is associated with a Users-sheet row the first time `POST /api/auth/register` is called after sign-up (see `app/services/user_service.py`), and with an Admins-sheet row for admin/staff accounts (see below).

### Provisioning admin/staff accounts

There is deliberately no self-service admin sign-up. To create the first
real admin or staff account once you're on the `firebase`/`google_sheets`
backends:

1. Have the person create a Firebase account any way you like (e.g.
   temporarily let them go through the parent `/register` flow, or create
   one directly in the Firebase console under Authentication → Users →
   Add user).
2. Find their UID in the Firebase console's Users list.
3. Add a row to the **Admins** worksheet with that `firebase_uid`, their
   name/email, and `role` set to `ADMIN` or `STAFF`, `active` = `TRUE`.

They can then log in at `/admin/login`. Further admins can be added the
same way — there's intentionally no UI for it in this MVP.

## Security notes

- Every access-control decision (which user owns which player/order,
  whether an account is ADMIN vs STAFF, whether a product can be edited)
  is enforced in the FastAPI backend, never by hiding a page in the
  frontend.
- Price, order total, and inventory are always recalculated server-side
  from the current Products/Bundles data at checkout time — nothing the
  client sends for those is trusted (see `app/services/order_service.py`,
  `cart_service.py`, `inventory_service.py`).
- Passwords are never stored anywhere in this app — Firebase owns them
  entirely; the Users sheet only stores the Firebase UID.
- A minimal in-process rate limiter (`app/core/rate_limit.py`) throttles
  request bursts per client IP. It resets on restart and doesn't
  coordinate across multiple processes — adequate for this MVP's
  single-worker deployment, not a substitute for a real API gateway at
  larger scale.

## Known limitations (by design, for this MVP)

- **Google Sheets is not transactional.** See
  [google-sheets/README.md](google-sheets/README.md#known-limitations-of-google-sheets-as-a-database)
  for exactly what safeguards exist and what they don't cover. Run a
  single backend worker process against a given spreadsheet.
- No payment gateway — payment is marked PAID manually by an admin/staff
  after they confirm GCash/bank transfer/cash payment out of band.
- No QR codes/scanning — fulfillment staff look orders up by ID, parent
  name, email, or phone instead.
- See the app description's "Future-proofing" list for everything else
  intentionally deferred (multiple events, coupons, SMS/email receipts,
  demand forecasting, etc.) — none of it is implemented, and none of the
  code above tries to anticipate it beyond the repository-pattern
  boundary already in place.

## Future-proofing: moving off Google Sheets

Every place that touches storage goes through the `Repository` interface
in `backend/app/repositories/base.py`. To move to PostgreSQL later:
write one new class implementing that interface (e.g.
`PostgresRepository`, likely with SQLAlchemy models mirroring
`app/models/`), add a branch for it in
`backend/app/repositories/factory.py`, and point `REPOSITORY_BACKEND` at
it. No service, API route, or frontend code needs to change, because
none of them import `gspread` or know Sheets exists.

## Deployment (outline)

This MVP has no deployment pipeline configured; the notes below are
enough to get a working deployment.

**Backend** — any host that runs a long-lived Python process (Render,
Railway, Fly.io, a small VM, etc.):
1. Set the same environment variables as `backend/.env` (production
   values: `REPOSITORY_BACKEND=google_sheets`, `AUTH_BACKEND=firebase`,
   `SEED_ON_STARTUP=false`, real `GOOGLE_SHEET_ID`/`GOOGLE_SERVICE_ACCOUNT`/
   Firebase Admin credentials, `CORS_ORIGINS` including your deployed
   frontend's URL).
2. `pip install -r requirements.txt`, then run
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. **Run exactly one worker process** against a given spreadsheet — see
   the Google Sheets concurrency limitations above.
4. Upload the service account JSON as a secret file rather than
   committing it, and point `GOOGLE_SERVICE_ACCOUNT` at its path.

**Frontend** — Vercel is the path of least resistance for Next.js:
1. Import the `frontend/` directory as the project root.
2. Set the `NEXT_PUBLIC_*` environment variables (Firebase config,
   `NEXT_PUBLIC_AUTH_MODE=firebase`, `NEXT_PUBLIC_API_BASE_URL` pointing
   at the deployed backend).
3. Deploy.

Once both are live, add the frontend's real URL to the backend's
`CORS_ORIGINS`.
