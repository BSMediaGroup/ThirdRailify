# Catalogue consumption

Products are imported and saved in Admin; database-backed changes require no Public rebuild. Public consumes sanitized canonical product/variant readiness and media, preserves exact-variant images and alt text, and retains general images in the gallery. Cart and final server-side checkout resolve canonical variants and current quote revisions.

Immutable CDN catalogue objects are displayed through `/commerce-media/<sha256>.<extension>`. This read-only route uses the catalogue R2 binding and accepts only immutable objects under `commerce/catalogue/`; it rejects caller origins/query strings and validates response image types. It cannot expose other bucket prefixes. Stored media identities remain canonical CDN URLs. An unbound development deployment can use the fixed Admin public media API without forwarding customer credentials.

Shipping prices and eligible destinations come from the current Admin policy. Environment, hidden-product, mapping and shipping failures remain distinct server-side; browser amounts never authorize checkout. See the Admin repository's `docs/printful-catalogue-workflow.md` and `docs/printful-release-2026-09-12.md` for operations and acceptance evidence.
