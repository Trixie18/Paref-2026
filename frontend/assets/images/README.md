# assets/images/

This is where any local image files for the site go: an event logo file,
sponsor logos, product photos, etc. Drop a file in here and reference it
from a page with a normal relative path, e.g.:

```html
<img src="/assets/images/event-logo.png" alt="Paref Cup" />
```

## Nothing is required here to make the app work

The app does **not** need any files in this folder to function. Two things
that might make you think otherwise:

- The event mark used in the nav bar and login pages is a small inline
  SVG (a shield with a "P"), written directly in the HTML/partials - not a
  file loaded from here. If you'd rather use a real logo image, save it
  here (e.g. `assets/images/logo.png`) and swap the inline `<svg>...</svg>`
  markup in `partials/parent-nav.html`, `partials/admin-nav.html`, and the
  public pages (`index.html`, `register.html`, `login.html`,
  `admin-login.html`) for an `<img src="/assets/images/logo.png" ...>` tag.

- Products and bundles from the backend (`GET /api/products`,
  `GET /api/bundles`) have an `image_url` field. When a product has one
  set, the shop page uses it directly in an `<img>` tag, exactly as the
  backend returns it - it does **not** need to point at a file in this
  folder; it can be any URL. When a product has no `image_url` set (the
  common case - the seed data doesn't set any), the shop page shows a
  plain placeholder block instead of a broken image. So this folder isn't
  wired into product data at all - it's just a place to keep local image
  files if/when you have some (e.g. if you decide to host product photos
  yourself rather than linking to an external image host).

## Adding the real event logo later

Once there's a real logo file, put it here and update the small inline SVG
mark referenced above. Keep filenames plain and descriptive (`logo.png`,
`event-banner.jpg`) - no spaces, no version numbers in the name.
