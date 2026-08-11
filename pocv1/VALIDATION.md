# POC V1 Validation Record

Validation date: **2026-08-11**

## Static validation — passed

- `index.html` parses successfully.
- `shop/index.html` parses successfully.
- Exactly one `<h1>` is present on each page.
- No duplicate IDs were found on either page.
- All local stylesheet, script, and image references resolve inside `pocv1`.
- `node --check app.js` passes.
- CSS opening and closing brace counts match.
- The POC contains no external font or JavaScript runtime dependency.

## Chromium rendering — passed

The actual HTML, CSS, JavaScript, and image bytes were loaded in headless Chromium at desktop and mobile viewport sizes. This environment blocks Chromium navigation to `file://` and loopback HTTP URLs with an administrator policy, so the validation harness inlined the same local CSS, JavaScript, and asset bytes into the page for rendering. The distributable source files were not replaced by the harness.

### Desktop

Viewport: `1440 × 1000`

- homepage rendered at 1440px document width
- shop rendered successfully
- one homepage `<h1>` confirmed
- prototype cart opened and closed
- initial shop catalogue count: 10
- Just Gina filter result: 1
- search for `mug`: 1 result
- product quick-view dialog opened
- add-to-cart updated count to 1
- add-to-cart opened the cart drawer
- no page or console errors recorded

### Mobile

Viewport: `390 × 844`

- homepage mobile menu expanded correctly
- homepage document width: 390px
- shop document width: 390px
- no horizontal overflow detected
- Accessories & Other filter result: 4
- no page or console errors recorded

## Direct visual inspection — completed

The following full-page renders were inspected:

- `preview-home-desktop.png`
- `preview-shop-desktop.png`
- `preview-home-mobile.png`
- `preview-shop-mobile.png`

## Deliberate non-validation claims

This POC does not claim validation of:

- Printful or Printify connectivity
- real catalogue completeness
- live inventory or variants
- shipping or tax calculation
- payment or checkout
- customer accounts
- Admin authentication or writes
- Cloudflare deployment
- custom domains or DNS
- Wix migration/cutover
- external social/channel link availability at future dates
