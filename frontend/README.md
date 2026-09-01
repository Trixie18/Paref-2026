# Paref Cup — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS frontend for the Paref Cup
football event registration & shop MVP. Talks to the FastAPI backend in
`../backend` over HTTP — there is no Node/Express layer in between.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # already done in this checkout; adjust if needed
npm run dev
```

Open http://localhost:3000. The app expects the backend to be running at
the URL configured by `NEXT_PUBLIC_API_BASE_URL` (default
`http://localhost:8000`). To start the backend locally with fully seeded
sample data and no Google/Firebase credentials required:

```bash
cd ../backend
source venv/bin/activate
REPOSITORY_BACKEND=memory AUTH_BACKEND=dev SEED_ON_STARTUP=true uvicorn app.main:app --port 8000
```

## Auth modes

Set via `NEXT_PUBLIC_AUTH_MODE` in `.env.local`:

- **`dev` (default)** — no Firebase project needed. Sign-up/sign-in are
  simulated locally (see `services/auth/devAuthProvider.tsx`) and the app
  sends fake `Bearer dev:<uid>:<email>` tokens, which only the backend's own
  `AUTH_BACKEND=dev` verifier accepts. An email→uid map is kept in
  `localStorage` so returning "sign in" as the same email reuses the same
  backend profile. It's pre-seeded with the accounts created by the
  backend's seed script, so you can sign in immediately as:
  - `dana.admin@example.test` (any password) → seeded ADMIN account
  - `sam.staff@example.test` (any password) → seeded STAFF account
  - `maria.delacruz@example.test`, `jose.santos@example.test`, etc. → seeded parents with existing players/orders

  Any other email you sign up with creates a brand-new parent account.

- **`firebase`** — real Firebase Authentication. Fill in
  `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID` in
  `.env.local`, set `NEXT_PUBLIC_AUTH_MODE=firebase`, and point the backend
  at `AUTH_BACKEND=firebase` with its Firebase Admin SDK credentials. The
  code path (`services/auth/firebaseAuthProvider.tsx`) is fully implemented
  but has not been exercised against a real Firebase project in this
  environment — verify it once real credentials are available.

Both modes implement the same `AuthContextValue` shape
(`services/auth/types.ts`) so the rest of the app never needs to know which
one is active.

## Project structure

- `app/` — routes (App Router). `(parent)/` and `admin/(protected)/` are
  route groups that add auth guards + navigation without affecting the URL.
- `components/` — shared UI (`ui/`), layout/nav, shop cards, order views,
  and admin-only widgets (charts, product/bundle forms).
- `services/api/` — typed API client, one module per backend resource. All
  `fetch` calls and bearer-token attachment live here.
- `services/auth/` — the `AuthProvider` and its two implementations.
- `contexts/CartContext.tsx` — cart state, persisted to `localStorage`
  (ids/quantities/labels only — never prices; totals always come fresh from
  `POST /api/cart/calculate`).
- `hooks/` — `useCartCalculation`, `useAdminSession` (infers ADMIN vs STAFF
  by probing which admin endpoints the account can call, since there's no
  single "who am I" endpoint for admins).
- `types/` — TypeScript interfaces mirroring the backend's Pydantic schemas.

## Testing

```bash
npm test        # runs once
npm run test:watch
```

Vitest + React Testing Library, covering the cart context's add/merge/
update/remove logic, the registration form's client-side validation, and a
rendering test for the shop page against mocked product/bundle data. Not
exhaustive — proportionate to an MVP.

Note: on Node 22+, the test scripts pass `NODE_OPTIONS=--no-experimental-webstorage`
so Node's built-in `localStorage` global doesn't shadow jsdom's — the
`localStorage`-backed cart tests only pass with this flag. This works as
written on macOS/Linux shells; Windows users running outside WSL should set
that env var another way (e.g. via `cross-env`).

## Build

```bash
npm run build
```
