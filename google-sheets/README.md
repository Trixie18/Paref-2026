# Google Sheets setup

The backend uses a single Google Spreadsheet as its database when
`REPOSITORY_BACKEND=google_sheets`. This document covers creating that
spreadsheet and the credentials the backend needs to read/write it, plus
the exact worksheet layout it expects.

## 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a new project (or reuse an existing one).
2. Note the project ID — you won't need it directly, but it's useful for finding things later.

## 2. Enable the Google Sheets API

1. In the Cloud Console, go to **APIs & Services → Library**.
2. Search for "Google Sheets API" and click **Enable**.

## 3. Create a service account

1. Go to **APIs & Services → Credentials → Create Credentials → Service account**.
2. Give it a name (e.g. `paref-sheets-backend`) and finish the wizard (no roles needed at the project level).
3. Open the new service account, go to the **Keys** tab, **Add Key → Create new key → JSON**.
4. Save the downloaded JSON file somewhere on your machine outside the repo, or as `backend/service-account.json` (already covered by `.gitignore` — never commit it).
5. Note the service account's email address (looks like `paref-sheets-backend@<project>.iam.gserviceaccount.com`) — you'll need it in the next step.

## 4. Create the spreadsheet

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com).
2. Name it whatever you like (e.g. "Paref Football Event DB").
3. Copy the spreadsheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/`**`<THIS_PART>`**`/edit`

You do not need to create the individual worksheets (tabs) yourself — the
backend creates any missing worksheet, with the correct header row, the
first time it starts up against a given spreadsheet ID. You only need the
spreadsheet itself to exist and be shared with the service account.

## 5. Share the spreadsheet with the service account

Open the spreadsheet's **Share** dialog and add the service account's
email address (from step 3) as an **Editor**.

## 6. Configure environment variables

In `backend/.env` (copy from `.env.example`):

```
REPOSITORY_BACKEND=google_sheets
GOOGLE_SHEET_ID=<the spreadsheet id from step 4>
GOOGLE_SERVICE_ACCOUNT=./service-account.json
```

## 7. Run the backend

```
cd backend
uvicorn app.main:app --reload
```

On first startup the backend will create any of the worksheets below that
don't already exist, with the header row filled in. Then run the seed
script once to populate development data:

```
python -m seed.seed_data
```

## Worksheet layout

Each worksheet's first row is the header; the backend matches columns by
name, not position, so the columns may be reordered but must not be
renamed.

### Users
`user_id | firebase_uid | name | email | phone | created_at | active`

### Players
`player_id | user_id | player_name | team | age_group | jersey_number | created_at`

### Products
`product_id | name | description | category | price | stock | active | image_url | variant_required | created_at | updated_at`

`category` is `SHIRT` or `ITEM`. `stock` is only meaningful when
`variant_required` is `FALSE` — shirts track stock per size in
Product_Variants instead.

### Product_Variants
`product_id | variant | stock`

One row per (product, size) combination — e.g. `VINTA | S | 40`.

### Bundles
`bundle_id | name | description | price | active | created_at | updated_at`

### Bundle_Items
`bundle_id | product_id | quantity`

One row per component product in a bundle — e.g. `BUNDLE-4 | PHOTOBOOTH | 1`.

### Orders
`order_id | user_id | order_date | total_amount | payment_method | payment_status | fulfillment_status | notes | created_at | updated_at | claimed_at | claimed_by`

### Order_Items
`order_item_id | order_id | product_id | product_name | quantity | unit_price | subtotal | variant | bundle_id`

`product_name` and `unit_price` are captured at the time of purchase, so
editing a product's name or price later does not change historical
orders. `bundle_id` is set when the line is a bundle purchase (in which
case `product_id` is the bundle's id); it is blank for a directly
purchased shirt or item.

### Admins
`admin_id | firebase_uid | name | email | role | active`

`role` is `ADMIN` or `STAFF`.

### Audit_Log
`log_id | timestamp | admin_id | action | entity_type | entity_id | details`

## Known limitations of Google Sheets as a database

Google Sheets has no row-level locking and no transactions. The backend
mitigates this as follows, but the mitigations only hold within a single
backend process:

- All writes to a given worksheet go through one process-wide lock
  (`SheetTable` in `app/repositories/sheets_client.py`), so two requests
  handled by the *same* running backend can't corrupt the same row.
- Inventory checks and decrements happen inside a single locked
  read-modify-write, so two checkouts handled by the same process can't
  both oversell the last unit of stock.

What this does **not** protect against:

- Running more than one backend process (e.g. multiple `uvicorn` workers,
  or two separate deployments) against the same spreadsheet at once. Run a
  single worker process for this MVP.
- Someone manually editing the spreadsheet at the same moment as a
  checkout.
- A write to the Orders/Order_Items sheet failing *after* inventory has
  already been decremented for that checkout (a rare failure-during-write
  case) — the stock decrement is not automatically rolled back. An admin
  can correct stock manually via the admin product screen if this ever
  occurs.

Moving to PostgreSQL (see the root README's future-proofing notes) removes
all of these caveats by replacing the repository implementation with one
backed by real transactions, without changing any service or API code.

### Write quota (`429 Quota exceeded ... Write requests per minute`)

Google's Sheets API defaults to **60 write requests per minute per user**.
Every create/update in this backend is its own API call rather than a
batch, so a burst of many writes in quick succession can hit that ceiling
— most notably `python -m seed.seed_data`, which does around 60-70 writes
in a tight loop (one per user, player, product, variant, bundle, bundle
item, order, and order item).

`SheetTable` (`app/repositories/sheets_client.py`) automatically retries
a `429` with exponential backoff (up to ~2 minutes total) before giving
up, so this is usually self-healing — the seed script will just pause and
resume, not crash. If you see a `429` that isn't retried away (e.g. it
happens repeatedly), just wait a minute for the quota window to reset and
re-run.

**If `seed.seed_data` fails partway through**, re-running it will
duplicate whatever it already wrote (it always appends, it doesn't check
for existing seed rows). Before re-running, reset the spreadsheet with:

```
python -m seed.clear_google_sheet
```

This deletes every data row (keeping headers) from every sheet — it asks
for confirmation first, and only runs at all when
`REPOSITORY_BACKEND=google_sheets`. **Never run it against a spreadsheet
holding real event data.** Then re-run `python -m seed.seed_data`.

You can request a higher quota for your Google Cloud project from the
[Sheets API quotas page](https://console.cloud.google.com/apis/api/sheets.googleapis.com/quotas)
if you'll be seeding or bulk-editing regularly.
