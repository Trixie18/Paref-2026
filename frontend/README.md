# Paref Cup - frontend

A plain HTML + Tailwind (CDN) + vanilla JavaScript client for the Paref Cup
backend. No React, no Next.js, no build step - every file here is exactly
what the browser runs. It talks to the FastAPI backend at `../backend` over
plain HTTP, and never talks to Google Sheets directly - the backend is the
only source of truth for prices, totals, inventory, and access decisions.

## Running it locally

1. Start the backend (from `../backend`), if it isn't already running:

   ```bash
   cd ../backend
   source venv/bin/activate
   REPOSITORY_BACKEND=memory AUTH_BACKEND=dev SEED_ON_STARTUP=true uvicorn app.main:app --port 8000
   ```

   Check it's up with `curl -s http://localhost:8000/health`.

2. Serve this folder as static files - no build step, just a plain file
   server. From inside `frontend/`:

   ```bash
   python3 -m http.server 5500
   ```

   Then open `http://localhost:5500/index.html`.

   Port **5500** is used consistently everywhere in this project (this
   README, the backend's CORS allowlist) - if you serve on a different
   port, update `CORS_ORIGINS` in `../backend/.env` to match, or requests
   from the browser will be blocked by CORS.

### Why the backend needs a CORS change

The backend only accepts browser requests from origins listed in its
`CORS_ORIGINS` env var. `../backend/.env` and the root `../.env.example`
both list:

```
CORS_ORIGINS=http://localhost:5500
```

If you copy `.env.example` to a fresh `backend/.env`, this is already
included. Restart the backend after changing `CORS_ORIGINS` for the
change to take effect.

## Auth: dev mode and real Firebase

`assets/js/auth.js` exposes one small interface - `signUp`, `signIn`,
`signOut`, `getIdToken`, `getCurrentUser` - implemented two ways, selected
by a single constant at the top of that file:

```js
export const AUTH_MODE = "dev"; // "dev" | "firebase"
```

**Dev mode** (the default) mirrors the backend's `dev:<uid>:<email>` fake
bearer token format (`AUTH_BACKEND=dev` on the backend). It keeps an
email -> uid map in `localStorage`, pre-seeded with the exact accounts
`../backend/seed/seed_data.py` creates, so you can sign in immediately as:

| Email | Role |
|---|---|
| `dana.admin@example.test` | Admin |
| `sam.staff@example.test` | Staff |
| `maria.delacruz@example.test` ... `liza.fernandez@example.test` | Parents (5 seeded) |

Passwords aren't checked in dev mode (the backend can't verify them without
Firebase) - any password works for the seeded accounts, and signing up
with a brand-new email creates a fresh uid.

**Firebase mode**: set `AUTH_MODE = "firebase"` and fill in the
`FIREBASE_API_KEY` / `FIREBASE_AUTH_DOMAIN` / `FIREBASE_PROJECT_ID` /
`FIREBASE_APP_ID` constants near the top of `assets/js/auth.js` (same
values as a Firebase web app's config — see the root README's Firebase
setup section). This mode loads the real Firebase JS SDK from Google's
CDN (`gstatic.com`) and uses
`createUserWithEmailAndPassword` / `signInWithEmailAndPassword` /
`onAuthStateChanged` for real - unlike a server-side script, a browser can
use the Firebase client SDK directly. The corresponding backend must then
run with `AUTH_BACKEND=firebase` and its Firebase Admin SDK credentials
set. **This mode is implemented against Firebase's documented client SDK
contract but has not been exercised against a real Firebase project as
part of building this site** - dev mode is what's been verified end to
end.

## How shared markup works

There's no framework and no build step, so "shared" markup here means two
different, deliberately simple things:

- **The `<head>` block** (Tailwind's CDN script + its inline theme config +
  the Google Fonts link + the favicon) is short enough that it's just
  **copy-pasted literally** at the top of every page's `<head>`. This is
  plain duplication on purpose - see `partials/head.html` for the
  canonical copy of that block (with an explanatory comment). If you
  change the color palette or fonts, edit that reference copy first, then
  copy the change into every page (a project-wide find-and-replace on the
  exact block works well since it's identical everywhere).

- **The nav bars** (`partials/parent-nav.html`, `partials/admin-nav.html`)
  are genuinely shared at runtime, not copy-pasted, because they carry
  interactive state (which link is active, the cart badge count, the
  signed-in admin's role/email) that would drift if duplicated by hand.
  Each page has an empty `<div id="nav" data-nav-type="parent"
  data-nav-page="shop"></div>` right after `<body>`. `assets/js/nav.js`:
  1. `fetch()`es the matching partial file,
  2. inserts its HTML into that `<div>` with `innerHTML`,
  3. highlights the link matching `data-nav-page`,
  4. fills in the cart badge (parent nav) or role/email and hides
     admin-only links for STAFF (admin nav),
  5. wires up the "Sign out" button(s).

  This is a plain `fetch` + `innerHTML` + `addEventListener` pattern - no
  virtual DOM, no templating engine, nothing "magic." Open
  `assets/js/nav.js` directly to see exactly what it does.

## Where images go

**`assets/images/`** - see the README inside that folder for details. In
short: nothing in the app requires a file to exist there. It's where you'd
put a real event logo (currently just an inline SVG shield mark in the
nav/login pages) or any local product photos, if you have them. A
product's `image_url` from the backend is used exactly as returned in an
`<img>` tag, wherever it points; a product or bundle with no `image_url`
just renders a plain placeholder block on the shop page.

## Folder layout

```
frontend/
  index.html, register.html, login.html,                    - public pages
  admin-login.html, forgot-password.html
  dashboard.html, players.html, player-form.html,            - parent pages
  shop.html, cart.html, checkout.html, order.html,             (guarded by
  orders.html, profile.html                                    guard.js)
  admin/                                                      - admin/staff
    dashboard.html, products.html, bundles.html, orders.html,   pages
    order.html, users.html, user.html, audit-log.html
  assets/
    images/        put local image files here (see its own README)
    css/site.css   Tailwind theme + hand-written component classes
    js/
      api.js         one function per backend endpoint
      auth.js        dev mode + Firebase auth (see above)
      cart.js        cart state (localStorage) - add/update/remove/merge
      nav.js         loads + wires up the shared nav partials
      guard.js       requireParent()/requireAdmin() route guards
      validation.js  pure form-validation helpers
      modal.js       tiny reusable modal (admin create/edit forms)
      charts.js      inline-SVG bar/line charts (admin dashboard)
      order-view.js  shared order-detail rendering (parent + admin)
      pages/         one file per HTML page, its own DOM logic only
  partials/
    head.html          reference copy of the shared <head> snippet
    parent-nav.html    fetched by nav.js
    admin-nav.html     fetched by nav.js
  tests/               node:test unit tests (see below)
```

Every JS module under `assets/js/` (outside of `pages/`) is plain,
DOM-free logic where practical (`cart.js`, `validation.js`, `auth.js`'s
dev-mode uid bookkeeping) precisely so it can be unit tested without a
browser.

## Backend API contract

Every page talks to the FastAPI backend at `http://localhost:8000` (the
`API_BASE_URL` constant at the top of `assets/js/api.js`) over plain HTTP,
with a `dev:<uid>:<email>` or real Firebase bearer token attached. Nothing
in this app computes a price, a total, stock, or a permission decision -
every number and every access decision comes straight from the backend's
JSON response, and every error is shown using the backend's own `detail`
message. See `assets/js/api.js` for the full list of endpoints it calls.

## Tests

Pure logic - the cart's add/update/remove/merge math, email/phone/password
validation, and dev-mode auth's email -> uid persistence - is covered with
Node's built-in test runner (no dependencies, no browser, no jsdom).
`localStorage` is stubbed with a tiny in-memory object
(`tests/helpers/fake-local-storage.js`) since Node doesn't have it
natively.

```bash
node --test tests/
```

This is deliberately not an attempt at full DOM/UI coverage - it targets
the logic that's genuinely risky to get wrong (cart math, validation, id
persistence), the same way the rest of this codebase favors plain,
readable code over broad abstraction.
