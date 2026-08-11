# Third Railify Version 2 — POC V1

Standalone design proof of concept for the proposed Third Railify public homepage and first-class merchandise storefront.

This folder is intended to live at:

```text
C:\NEPTUNE LOCAL\GIT\ThirdRailify\pocv1\
```

The generated package mirrors that folder structure. No production repository, Wix page, Cloudflare project, DNS record, GoDaddy setting, Printful/Printify integration, or payment system was modified by this design phase.

## Pages

| Path | Purpose |
| --- | --- |
| `index.html` | Version 2 public homepage concept |
| `shop/index.html` | Version 2 premium merch-store concept |

## Run

The POC is file-safe and may be opened directly from `index.html`. Serving it locally gives the most representative browser behavior:

```powershell
cd C:\NEPTUNE LOCAL\GIT\ThirdRailify\pocv1
python -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080/
http://127.0.0.1:8080/shop/
```

## Included interactions

- responsive desktop/mobile navigation
- dismissible POC notice
- scroll-reveal and restrained pointer-tilt effects
- reduced-motion support
- shop category filters using the current Wix category vocabulary
- live catalogue search and sorting
- product quick-view dialog
- prototype add-to-cart, quantity, removal, subtotal, and drawer behavior
- local cart persistence where browser storage is available
- explicit demo newsletter and checkout feedback
- loading/empty/error-state direction documented for the later production implementation

## Catalogue boundary

The ten product cards are **illustrative POC inventory**, created to demonstrate storefront hierarchy and interaction. They are not asserted to be the current live catalogue.

The only current price carried into the POC as verified during the live-site scan is:

- Men's / heavyweight tee starting at **CA$47.50**

Every other displayed price is marked `sample` and must be replaced with live provider data during implementation.

## Production direction represented by the POC

The final site should not hard-code provider behaviour. Production commerce should use real server-side Printful and/or Printify contracts, safe public product projections, server-validated price/variant/availability data, shipping and tax handling, secure checkout handoff, and privileged Admin authorization.

The POC deliberately does not implement:

- Printful or Printify API calls
- product inventory or variants
- shipping rates or tax calculation
- Stripe, PayPal, or other payment flows
- customer accounts
- CMS or Admin writes
- Cloudflare Pages Functions
- analytics or tracking
- DNS, custom domains, redirects, or Wix cutover

## Files

```text
pocv1/
├── index.html
├── shop/
│   └── index.html
├── styles.css
├── app.js
├── README.md
├── AUDIT.md
├── VALIDATION.md
├── assets/
│   ├── thirdrailify-mark.svg
│   ├── goat-wire.svg
│   ├── shawn-costume.png
│   ├── gina-portrait.webp
│   ├── gina-avatar.webp
│   ├── gina-goat.jpg
│   └── product-*.svg
└── preview-*.png
```

## Review order

1. Review `preview-home-desktop.png` and `preview-shop-desktop.png` for the overall direction.
2. Open the two HTML pages and test the responsive layout and interactions.
3. Mark up design/content corrections.
4. Once approved, use Codex to inspect the real writable repository and reference-only repositories, rescan the live Wix site, and scaffold the production application without importing POC assumptions blindly.
