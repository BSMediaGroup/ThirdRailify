# Third Railify V2 public site

## Current commerce catalogue boundary (local implementation)

The same-origin catalogue proxy now carries a sanitized current-product count from Admin and fails closed if a reconciled Public projection exceeds that authority. There is still no Public Commerce D1 binding, provider credential, raw provider identity, or runtime Wix/static merge. Product/category/search/Featured/SEO surfaces continue to derive from the one Admin-owned current projection.

Device-local carts now retain unresolved historical IDs visibly: Cart Drawer, Cart Page, and Checkout show an explicit unavailable state and removal action when a product or variant disappears from the current catalogue. Unavailable lines are excluded from browser subtotals and block shipping/payment requests; the Admin checkout boundary independently rejects non-current product or variant rows. No cart is silently rewritten.

Updated tree: `functions/_shared/commerce-catalogue-proxy.js`, `src/lib/catalogueProvider.ts`, `src/components/CartDrawer.tsx`, `src/pages/CartPage.tsx`, `src/pages/CheckoutPage.tsx`, shared styles, and checkout/storefront browser coverage. No deployment, payment, order, provider call, or production mutation was performed.

## Public Polls V1 (local implementation)

`/polls` is a first-class gallery with open/closed/recent/mine views, compact result cards, an accessible quick-view dialog, public detail stages, a lightweight noindex `/polls/:slug/popout`, and approved-creator draft/edit routes. Open views share one visibility-aware seven-second refresh coordinator; closed results do not keep polling. Exact totals and the current browser/account vote come only from the Admin authority.

Public owns no Poll D1 or bot/provider credential. Same-origin `functions/api/polls/[[path]].js` resolves the existing Account session server-side and signs bounded requests to Admin with `THIRDRAILIFY_COMMUNITY_API_SECRET`. `anyone` Polls use an opaque signed `thirdrailify_poll_voter` HttpOnly, SameSite=Lax cookie backed by the separate Public-only `THIRDRAILIFY_POLL_ANONYMOUS_SECRET`; it is best-effort browser identity, not proof of one human. Authenticated writes also require the existing session CSRF proof. Browser-submitted account/voter IDs and totals are never trusted.

Creator access is Admin-granted and disabled for regular accounts by default. The editor supports 2â€“12 stable options, generated numeric or custom whole-message triggers, collision warnings, a local trigger tester, audience policy, Rumble source/binding, draft save, and lifecycle controls. NFKC + outer-trim + locale-independent lowercase is the shared V1 normalization contract; internal spaces and punctuation remain significant.

Tree additions: `functions/api/polls/[[path]].js`, `src/polls/`, `src/pages/PollsPages.tsx`, `src/styles/polls.css`, `tests/fixtures/poll-normalization-v1.json`, and `tests/polls-functions.test.mjs`. Local rollout requires Admin migration `0025_automations_polls_v1.sql`, the shared Public/Admin relay secret already named above, `THIRDRAILIFY_POLL_ANONYMOUS_SECRET`, and deployment in Admin â†’ bot â†’ Public order after staging acceptance. No migration or deployment was performed here.

Wheels V1.12 consumes a sanitized, revisioned global spin-mechanics projection from Admin. All Wheel surfaces share the same analytic decay engine while winner selection, Official persistence, and the rotation-invariant V1.9 Canvas renderer remain separate and unchanged. See `WHEELS_V1.md` and `WHEELS_STAGE_V1.md` for the authority and Stage snapshot contracts.

## Account identity access badges (local implementation)

Authenticated account widgets now use one presentation-only role visual system without changing session, Account, or authorization authority. Master Admin uses a gold lightning shield, Full Admin uses a gold check shield, and Regular User uses a muted gray check shield. The compact header places the badge immediately after the display name, while the dropdown identity is limited to display name plus badge and one email/username line. The badge stays visible when the compact trigger collapses on small screens.

The existing `/account/messages` destination and unread-count behavior are unchanged. The Admin dashboard link is still shown only to an active Admin account. Public Wheel owner projections do not currently contain role/admin-level data, so no decorative role was guessed and no Public API contract was expanded for this UI-only milestone.

Repository tree addition: `src/auth/AccountAccessBadge.tsx`. No route, auth, database, payment, provider, deployment, or Cloudflare configuration change was made.

## Analytics V1 and account inbox (local implementation)

Public now emits privacy-minimized `page_view` events from initial loads and genuine SPA route changes through same-origin `POST /api/analytics`. The browser never receives the ingestion credential. The Pages Function strips query strings/fragments, rejects API/static paths, honours DNT and Global Privacy Control, derives coarse location/device/member classification on the server, uses a 30-minute HttpOnly session cookie only when collection is configured, and relays events to the Admin authority with a dedicated HMAC secret. Collection failures are deliberately non-blocking and return an empty `204`.

Authenticated accounts now have `/account/messages`. Messages remain Admin Commerce D1-owned and travel through the existing signed account-commerce relay. The page supports individual and bulk read/unread/delete controls, whole-card detail lightboxes, full safe details, and preserved CTA buttons. Delete is recipient-scoped soft deletion; it does not erase an authoritative source record.

Public account eligibility is independent of Admin privilege: Regular, Full Admin, and environment Master Admin sessions use the same canonical internal Account ID for their own profile, Commerce, orders, addresses, donations, and recipient-scoped Messages. Public sends only the server-resolved session Account ID across the signed relay; role never suppresses ordinary account features or widens message scope. Normal account reads do not automatically retry permanent 4xx or 429 responses and remain isolated by panel.

Local/production configuration introduced by this milestone:

- Cloudflare encrypted secret `THIRDRAILIFY_ANALYTICS_INGEST_SECRET`, with the same high-entropy value configured independently on Public and Admin Pages.
- Existing `THIRDRAILIFY_ADMIN_ORIGIN` and `THIRDRAILIFY_PUBLIC_ORIGIN` remain the exact signed boundary; no browser variable contains the secret.
- Admin migration `0024_analytics_and_message_controls.sql` must be applied deliberately before either application is deployed.
- Deploy Admin before Public after the migration and secret are verified. No remote migration, deployment, DNS, domain, or provider change was performed for this local implementation.

Repository tree additions: `functions/api/analytics.js`, `src/analytics/AnalyticsCollector.tsx`, `src/account/AccountInbox.tsx`, `src/account/inbox-client.ts`, `tests/analytics-inbox.test.mjs`, and `tests/inbox-browser.test.mjs`.

Store checkout and one-time donations use the standard PayPal experience backed by server-created and server-captured Orders API v2 payments. The PayPal SDK loads only on checkout and donation routes after a sanitized configuration response. Card payments are retained server-side for a future milestone but are currently unavailable.

## Replacement shop commerce source

Account V2 provides real `/account`, `/account/profile`, `/account/delivery`, `/account/orders`, `/account/orders/:orderId`, and `/account/security` destinations. Signed-in customers can maintain a current encrypted contact name/phone and an encrypted, revisioned delivery address book in Admin-owned Commerce D1; verified account email stays read-only. Order history is linked only by the server-resolved Account-to-Customer relationship, keeps TEST and LIVE records distinct, and returns bounded projections without provider credentials or payment-card data. Checkout can preselect the default saved address or use another address once; saving a new address is opt-in and unchecked. Contact and delivery PII never enter browser storage, checkout remains disabled from canonical authority, and no saved-card vault exists.

The replacement `/shop` uses the same-origin `/api/commerce/*` Pages Functions, which proxy the Admin project's sanitized Commerce D1 projection. This Public project deliberately has no Commerce D1 binding and contains no Admin credential. The legacy Wix snapshot remains migration/reference evidence only and is not a runtime catalogue fallback.

Trusted product images, account avatars, approved GOATS media, and active public Wheel assets render from the dedicated `https://cdn.thirdrailify.com` Worker. Public has no R2 binding: immutable product/avatar paths are content addressed, GOATS/Wheels are lifecycle-gated against Admin-owned Commerce D1, and private/deleted media is not publicly addressable. Legacy recognized Admin media URLs redirect permanently to their exact canonical CDN paths.

Product detail uses local product and variant IDs, real variant-specific integer CAD prices, and a device-local `{ productId, variantId, quantity }` cart. Browser totals are non-authoritative. `/checkout` now offers an explicit guest or existing-Account choice before collecting ephemeral contact and delivery details. Guest checkout creates no Account. Signed-in checkout identifies the current Account, prefills only its display name and genuinely verified email, and keeps edits checkout-local. The Public relay forwards the real host-only session server-to-server so Admin—not the browser—binds an account-backed Customer; browser account/Customer IDs are rejected. Cart items survive the existing validated sign-in return flow, while customer email and delivery address never enter local storage. The canonical shipping strategy and customer checkout remain disabled. The separate Master-only Stripe TEST acceptance action has completed once and is now closed in Admin; Public exposes no bypass. The replacement storefront is served on the production domain while checkout remains disabled.

`/checkout/success` is a truthful TEST result page. It starts in a checking state and reads only `/api/commerce/order-status?session_id=cs_test_…`, which proxies a bounded local D1 projection. The browser does not call Stripe, cannot enumerate orders, and never infers payment from the redirect query. Only a signed Stripe webhook can display **Payment confirmed**; the accepted historical Session remains readable after gate closure and fulfillment remains disabled.

Production Public website and storefront foundation for Third Railify. The canonical Public origin is `https://thirdrailify.com`; `https://www.thirdrailify.com` and the Pages alias redirect to the matching apex path after cutover.

## Current state

- Vite 5, React 18, TypeScript, and React Router.
- Wheels V1.11 gives regular detail a true 1720px Wheels-only composition, compact inline owner identity, safe Stage Overview avatar controls, a 286px focused broadcast rail, and exact shared premium Wheel/Stage cards. `wheels-v111.css` contains the scoped geometry and card system; V1.10 secure within-wedge landings, exact constant-deceleration RAF motion, V1.9 cached rigid rendering, and runtime-only TWL semantics remain unchanged.
- Wheels Stage V1.1 adds coordinated Demo/Practice/Official Spin All, shared-start individual-duration animation, compact per-tile locks, normalized Stage audio, and one responsive fullscreen-root combined celebration. New implementation modules include `StageWinnerCelebration.tsx`, `stageSpinAll.mjs`, `focusTrap.ts`, and `wheels-stage-v11.css`; see `WHEELS_STAGE_V1.md` and `WHEELS_STAGE_FILE_FORMAT.md`.
- Substantial `/` landing page with a joined Shawn/Gina hero composition, Third Railify branding, current verified schedule copy, merch preview, a compact enriched/fallback Discord community module, and clear donation navigation.
- Dedicated `/shawn` and `/gina` editorial host profiles with distinct first-party portrait systems, topic instruments, shared-show chemistry, internal viewing paths, and reduced-motion-safe presentation.
- Dedicated `/friends` ensemble story with an animated three-signal hero, first-party Daniel/Darnell/Davy profile cards, and keyboard-contained expanded dossiers whose supplied channel links remain hidden until a profile opens.
- Watch V2 routes at `/watch`, `/watch/live`, `/watch/episodes`, and `/watch/v/:episodeId`, with validated current playback, a naturally populated 24-record SQLite archive, truthful empty slots, and no browser/provider scraping.
- A separate Admin-configured Public announcement banner with static/ticker/crossfade modes and an automatic real-Watch-state Live Now takeover.
- First-class `/community` destination with the full public-channel/member-profile Discord view, existing goat artwork, verified community paths, and explicit public-data boundaries.
- Premium `/shop` drop experience with a D1-merchandised featured rotation, graphical category discovery, URL-backed search/filter/sort state, responsive product cards, truthful loading/error/empty/image states, and the existing browser-local cart.
- Complete V2 `/goats` community experience with an animated signal hero, MapLibre/OpenFreeMap dark vector map plus automatic Leaflet raster recovery, compact accessible markers with dark SVG-flagged listing cards, modal-scale expansion, approved-only gallery/detail projections, product-linked submission wizard, policy-aware authenticated reactions/comments, and a fixed same-origin bridge to Admin authority. Production serves the approved imported stories plus the retained clearly labelled demos.
- Product detail routes at `/products/:category/:slug`; legacy `/product-page/:slug` paths and category routes remain preserved client-side.
- Authoritative CAD prices with one shared USD-default approximate display-currency system, persisted/query-aware selection, same-origin server rate projection, cached stale fallback, and zero changes to cart or checkout values.
- Shared account client with an OAuth-first email-capable login modal, explicit Turnstile, one-time Admin-to-Public handoff, same-origin sessions/logout, a detailed responsive far-right header identity menu, compact icon/count cart control, verified-live-only header signal, and responsive nested Account V2 routes for profile/contact, encrypted saved delivery addresses, account-linked order history/detail, and security/privacy boundaries.
- First-class policy library at `/policies` plus deep-linked Terms, Privacy, Refund, and Accessibility documents grounded in the current V2 data and provider boundaries, with a truthful non-interactive future-membership register slot.
- Compact non-modal privacy choices with equal first-layer Accept/Reject actions, granular Preferences and External media controls, a versioned 183-day first-party choice cookie, footer withdrawal, and consent-gated optional local storage and Watch iframes.
- Truthful `/checkout/success` states backed by an exact opaque-Session local payment-status projection; no provider metadata, internal account identity, audit data, Printful mapping, or browser-side Stripe authority is exposed.
- Complete presentation-only `/donate` destination with a cinematic signal hero, accessible one-time/monthly/yearly and CAD amount controls, explicit donation-purpose/disclaimer copy, and a visibly disabled PayPal handoff until real provider wiring is implemented.
- Versioned Wheels portable files: canonical `.twl`/JSON download and clipboard export, content-detected `.twl`/JSON/Wheel of Names import, conversion preview/reporting, one-at-a-time multi-config selection, fresh entry identity, and opt-in bounded embedded media that remains local until explicit Save.
- Homepage direct-contact band with a keyboard-contained lightbox form, explicit privacy acknowledgement, Turnstile challenge, bounded same-origin relay to the Admin mail authority, and a separate `/donate` action. Public receives no Resend credential or delivery-recipient authority.
- Polished migration shells for discovered major routes and a branded 404.
- Cloudflare Pages output with `https://thirdrailify.com` canonical authority, route-aware crawler metadata, structured data, XML sitemap/robots endpoints, SPA fallback, immutable-preview noindex protection, and baseline security headers.

The local delivery/quote/Stripe-ready checkout foundation is connected only to the Admin authority and remains fail-closed. External shipping execution, payments, tax, inventory, Printful orders, memberships, donations, CMS writes, and newsletter submission are not activated. Recipient data is never stored in browser storage; only the existing local product/variant/quantity cart persists. Saved account addresses and current contact fields are encrypted server-side and deliberately separate from immutable encrypted order-time delivery snapshots.

`POST /api/commerce/shipping-quotes` and `POST /api/commerce/checkout` are bounded exact-origin same-origin relays to Admin. Public owns no Commerce D1 or provider token. The browser sends no price, shipping amount, provider/store/variant identity, or Stripe authority and receives only opaque quote/rate IDs, safe method labels/estimates, integer CAD display totals, the canonical checkout gate, and—only after future activation—a validated Stripe-hosted TEST URL.

## Local development

Use Node 22.16.0 (recorded in `.node-version`) and npm.

```powershell
npm ci
npm run dev
```

Quality gates:

```powershell
npm run lint
npm run typecheck
npm run test:functions
npm run test:storefront
npm run test:goats
npm run test:browser:policies
npm run test:browser:consent
npm run test:browser:shop
npm run test:browser:donate
npm run test:browser:about
npm run test:browser:hosts
npm run test:browser:friends
npm run test:browser:seo
npm run test:kv-ban
npm run test:state-budget
npm run test:state-fingerprint
npm run test:wheels
npm run build
npm run preview
```

The production output is `dist/`.

## Route architecture

- Implemented: `/`, `/about`, `/shawn`, `/gina`, `/friends`, `/watch`, `/watch/live`, `/watch/episodes`, `/watch/v/:episodeId`, `/shop`, `/shop/:slug`, `/products/all`, `/products/:category`, `/products/:category/:slug`, `/cart`, `/checkout`, `/community`, `/goats`, `/goats/submit`, `/goats/:slug`, `/donate`, `/account`, `/account/login`, `/policies`, `/terms`, `/privacy`, `/refunds`, `/accessibility`.
- Migration shells: `/vip`, `/gift-cards`.
- Preserved aliases: `/live` redirects at the edge to the dedicated player only for an effective current live signal and otherwise to `/watch`, preserving its query; `/goatgate` redirects to `/goats/submit` with query/hash intact; `/support` and `/donate-1` redirect to `/donate` with query/hash intact; `/cart-page` redirects to `/cart` with query/hash intact; `/gift`, `/pricing-plans/list`, `/members-home`, and `/product-page/:slug` remain preserved.
- Static Pages aliases: `/store` and `/merch` redirect to `/shop`.
- Everything else receives the branded application 404 after the SPA fallback.

See `LIVE_SITE_AUDIT.md` for the discovered Wix routes, current catalogue evidence, unresolved surfaces, and cutover strategy.

## SEO and social previews

`seo/site-seo.js` is the shared, provider-neutral authority for route titles, descriptions, social artwork, canonical paths, crawl policy, and JSON-LD. The root Pages middleware renders that data into the initial HTML response for search crawlers and link unfurlers; `src/seo/SeoProvider.tsx` applies the same contract after client-side navigation. Product, episode, and GOATS detail metadata is built from the existing sanitized Public read projections, never from provider calls or browser-only state.

The contract has a narrow presentation-override seam for a later Admin-managed SEO phase. Future overrides may replace only title, description, image, and image alt text; canonical paths, robots policy, structured-data types, and underlying Public data authority remain code-controlled. Stable Public routes are indexable, while account, cart, checkout-result, submission, unknown, and immutable preview routes are noindex. `/robots.txt` and `/sitemap.xml` are generated at the edge; the sitemap contains canonical, indexable URLs only.

`src/pages/AboutPage.tsx` owns the complete `/about` story: a visibility- and reduced-motion-gated high-voltage hero, editorial origin treatment, first-party Shawn/Gina host portraits, four format instruments, an abstract audience circuit, and an internal Watch/community manifesto close. It has no API dependency, external image dependency, contact directory, or direct platform CTA.

`src/pages/HostPage.tsx` owns the companion `/shawn` and `/gina` stories through one typed content structure and two deliberately different visual frequencies. Both use first-party portraits, internal Watch/About/community paths, motion-gated topic instruments, and truthful repository-supported host facts without external assets, API dependencies, platform directories, surnames, or fabricated history.

`src/pages/FriendsPage.tsx` owns the `/friends` ensemble page and its three local profiles. Summary cards intentionally expose no channel or social destinations; the supplied Rumble, YouTube, and X links are available only inside focus-contained, Escape-dismissable profile dialogs.

## Structure

```text
ThirdRailify/
├── assets/
│   ├── backgrounds/        Seeded Third Railify backgrounds
│   ├── catalogue/          Local copies of eight audited Wix product images
│   ├── flags/              Local GOATS country SVGs plus a safe unknown-country fallback
│   ├── fonts/              Seeded font files and licences
│   ├── icons/              Active Public favicon plus local Discord, TikTok, and platform SVG artwork
│   ├── illustrations/      Joined hero art, CC0 GOATS vector/provenance, and homepage feature illustrations
│   ├── logos/              Seeded marks and the active straight header/footer bolt silhouette
│   ├── people/             Seeded host imagery
│   └── video/              Seeded media (not used as a decorative hero loop)
├── pocv1/                  Reference-only approved inspiration POC
├── functions/
│   ├── _middleware.js                Initial-HTML SEO, canonical redirects, and crawler policy
│   ├── robots.txt.js                  Generated crawler directives
│   ├── sitemap.xml.js                 Generated canonical static/dynamic sitemap
│   ├── _shared/public-auth.js        Public session/handoff/logout and narrow proxy primitives
│   ├── _shared/commerce-checkout-proxy.js  Bounded quote/checkout relay and safe response projection
│   ├── api/auth/                     Same-origin Public auth plus Admin avatar-authority proxy
│   ├── api/contact.js                Bounded same-origin relay to protected Admin contact delivery
│   ├── api/catalogue/                Fail-soft Admin merchandising projection proxy
│   ├── api/goats/                    Fixed approved reads plus signed submission/interaction bridge
│   ├── api/currency-rates.js         Validated, cached same-origin CAD reference-rate projection
│   ├── api/commerce/                  Same-origin catalogue, shipping quote, checkout, and status relays
│   ├── api/_snapshot-persistence.js  Shared checkpoint and DO persistence adapter
│   ├── api/_state-backend.js         Stable singleton Durable Object request boundary
│   ├── api/_state-contract.js        Deployment identity and storage contract
│   ├── api/state-backend.js          Public-safe storage diagnostics
│   ├── api/community/       Signed Discord ingest and public snapshot Pages Functions
│   ├── api/watch.js         Public validated broadcast snapshot projection
│   └── api/watch/           Signed ingest, strict normalizer, and bounded Rumble thumbnail proxy
├── cloudflare/state-worker/ SQLite-backed singleton Durable Object Worker and Wrangler config
├── public/
│   ├── _headers            Cloudflare static response policy
│   ├── _redirects          Static canonical aliases
│   ├── _routes.json        Invoke Functions for HTML SEO plus same-origin Public APIs
│   └── schemas/            Served Third Railify wheel-file JSON Schema
├── seo/                   Shared edge/browser route metadata and structured-data authority
├── src/
│   ├── auth/               Shared session provider, modal, Turnstile, and header account widget
│   ├── components/         Shared shell plus reusable broadcast/player, Discord, rail, product, and cart UI
│   ├── privacy/            Versioned consent model, cookie record, categories, and storage cleanup
│   ├── seo/                Client navigation metadata provider and dynamic-page hook
│   ├── currency/           Shared selected-currency state, cache, conversion, and formatting
│   ├── content/            Structured policy registry and long-form legal content
│   ├── data/               Dated bounded Wix snapshot
│   ├── hooks/              Broadcast context plus visibility/reduced-motion gates
│   ├── goats/              Typed API client, SVG country flags, and lazy vector/raster map engines
│   ├── lib/                Validated broadcast/Discord boundaries and replaceable catalogue provider
│   ├── pages/              Public routes, including the real cart/checkout and result flow
│   ├── store/              Local-only cart state
│   ├── styles/             Tokens and responsive visual system
│   ├── types/              Provider-neutral catalogue contracts
│   └── wheels/             Wheel engine, editors, portable format/converters, dialogs and types
├── scripts/                KV mutation ban, budget/fingerprint checks, and live backend verifier
├── tests/                  Function, browser, SEO, Durable Object, migration, isolation, Watch, and About fixtures
├── Verify-Cloudflare-State-Backend.cmd  Double-clickable read-only live verifier
├── wrangler.jsonc          Pages external Durable Object binding
├── CLOUDFLARE_SETUP.md
├── CLOUDFLARE_AUTH_SETUP.md
├── CLOUDFLARE_KV_WRITE_INVENTORY.md  Pre/post migration writer, reader, and cadence evidence
├── CHECKOUT_RELEASE_GATES.md  Evidence-based Ontario/federal pre-activation implementation matrix
├── CONTACT_ROLE_MATRIX.md    Published/sender/reply-to contact roles without monitoring assumptions
├── DATA_RETENTION_MATRIX.md  Implemented TTLs, cleanup paths, capacity bounds, and undecided schedules
├── GOATS_V2.md             Public routes, API boundary, map configuration, and migration posture
├── WHEELS_FILE_FORMAT.md   `.twl` v1 format, conversion, media and security contract
├── LIVE_SITE_AUDIT.md
├── LEGAL_RELEASE_CHECKLIST.md  Internal unresolved operator, sales, privacy, and legal sign-off items
├── POLICIES.md            Policy route, content-source, maintenance, and review notes
├── PRIVACY_OPERATIONS_RUNBOOK.md  Internal request, incident, identity, audit, and preservation workflows
├── PRIVACY_STORAGE_INVENTORY.md  Audited browser storage, provider access, categories, and gating
├── THIRD_PARTY_DATA_PROCESSING.md  Actual provider/data-flow and external contract-review dossier
├── BUMP_NOTES.md
└── package.json
```

Additive banner files in this structure are `functions/api/catalogue/banner.js` (fail-soft Admin projection proxy), `src/components/PromoBanner.tsx`, `src/hooks/useBannerConfig.ts`, and the validated `src/lib/banner.ts` / `src/lib/liveBanner.ts` boundaries. The Watch pages and episode components own the six-position rail and 24-position archive presentation.

`WATCH_V2.md` is the Watch authority, retention, public-route, placeholder, and Admin-management architecture document.

The display system uses the seeded American Captain asset at its real weight with lightly relaxed tracking for the primary header voice, with seeded Blinker and Geist Mono for readable body and technical roles.

## Data and provider boundaries

Competition-wheel persistence, custom-media metadata, and the existing R2 binding belong only to `ThirdRailify-Admin`. Public `/wheels` reads a sanitized Admin projection and uses a same-origin signed gateway for approved creation/editing, media upload/removal, and official draws; it has no wheel/Commerce D1 or R2 binding. V1.3 adds browser-local, content-detected `.twl`/JSON/Wheel of Names import and canonical `.twl`/JSON/copy export with conversion preview, fresh entry IDs, optional bounded embedded media, and no imported authority; imported content remains dirty editor state until the existing Save/Create contract runs. V1.2 keeps the existing wheel mounted beneath the route-driven `/wheels/:slug/edit` lightbox, gives participants a separate in-context manager, resolves the weighted pointer target and Canvas clicks through shared pure geometry, and exposes public-only per-entry/duplicate-label weighted odds through an accessible details surface. `WheelsBrandMark.tsx` uses the exact local `assets/icons/trzap-0.svg` path for gold-gradient hero/loading/medallion/result treatments. V1.1's centred `SPIN WHEEL` console, industrial rim, finite celebration, generated audio, Appearance workflow, palettes, per-entry colours, and custom stage/centre artwork remain intact. Demo spins use browser Web Crypto and never persist. Official winners are selected and recorded server-side with revision/idempotency serialization and immutable winner/snapshot evidence. See `WHEELS_V1.md` and `WHEELS_FILE_FORMAT.md` for routes, roles, media validation, accessibility, portable files, and deferred integrations.

The Public header keeps Community as a direct route while exposing semantic Friends, GOATS in the Wild, and Wheels children on hover/focus and explicitly in mobile navigation. VIP is a first-class link. One reusable truthful VIP feature appears below the Community paths and between the Home Discord/community section and Follow the Rail; `/vip` is a dedicated gated preview with no price, billing, entitlement, or purchase action.

GOATS persistence belongs only to `ThirdRailify-Admin`. Public exposes fixed same-origin `/api/goats/*` routes, signs server-to-server mutations with an encrypted shared secret, and has no commerce D1 or media R2 binding. Public responses contain approved/published fields only; private email, account IDs, moderator data, object keys, exact location input, email state, and audit metadata remain Admin-only. The Public map uses its full workspace, keeps concise hover/focus previews, and opens approved listing detail in an accessible signal dialog without changing the canonical `/goats/:slug` route or forcing the map camera. See `GOATS_V2.md` for route, environment, local fixture, and provider-fallback details.

Account authority lives only in `ThirdRailify-Admin`. Public sends credential and OAuth-start requests to the exact configured Admin origin, receives only a short-lived one-time handoff code, and consumes that code through its same-origin Function to create a host-only staging session. Production offers Discord, Google, GitHub, and X through this centralized server-side flow; legitimate Google and X custom-domain sign-ins have passed, while Discord and GitHub still require provider-specific post-cutover acceptance before their legacy callbacks are removed. Google is production-enabled while preview stays disabled pending a separately configured preview client and callback allowlist. Display-name and avatar submissions use narrow same-origin proxies that forward the existing session cookie and CSRF proof to Admin; Public has no profile-media object binding and performs no account-row mutation. Public never stores canonical identity in local storage and contains no password hashing, provider secret, Turnstile secret, Resend key, or role authority. Existing sign-in credentials are not subject to the 12-character policy used when creating or resetting a password.

`src/types/catalogue.ts` remains provider-neutral. `src/lib/catalogueProvider.ts` consumes only the sanitized same-origin Commerce D1 product and ordered visible-collection projection; it has no runtime Wix fallback. `src/lib/featuredMerchandising.ts` is the canonical explicit-Featured selector and fixed-slot allocator used by Home and the Shop hero, while `src/components/FeaturedMerchandising.tsx` supplies their non-interactive empty/loading/error slots. Gallery, related-product, and cart amounts stay authoritative CAD with local Canadian SVG flags. Reference conversion is isolated to product details and never changes the CAD catalogue/cart authority. Provider credentials and all write operations remain server-side.

`GET /api/currency-rates` is the only storefront request path to the configured `CURRENCY_RATES_API_URL`. It requires HTTPS, validates CAD base, ISO date, three-letter codes, and finite positive rates, adds CAD=1, applies a bounded timeout, and publishes several-hour cache plus stale-while-revalidate headers. The product-detail-only chooser uses local SVG flags for the actual supported currency set and preserves its preference/cache only when Preferences consent permits it. Gallery rendering never depends on that preference.

`src/lib/discordWidget.ts` first requests the same-origin `/api/community/discord` projection published by the local Third Railify bot. That projection contains only whitelisted/revalidated public channels and bounded public presentation fields; the browser never receives a Discord token, ingest secret, admin-role configuration, permissions, roles, messages, or private metadata. The shared widget labels fresh, delayed, and stale data, neutralizes stale presence, shows public text/community channels, and provides keyboard/click/tap-accessible profile cards for enriched members. The homepage bounds the channel directory more tightly; `/community` shows the full capped directory. Both retain 12 collapsed and 24 expanded member limits.

If the enriched endpoint is absent or unavailable, the client falls back to Discord's public server widget for guild `1114717958573396008`. Basic mode is explicitly labelled and shows only the server name, Discord presence count, public voice spaces, and anonymized widget members. It does not invent text channels, joined dates, usernames, IDs, or rich profiles. If both sources fail, the widget shows an intentional unavailable state while preserving the public invite. All fetches are bounded to eight seconds with `cache: no-store` and omitted credentials.

The Pages bridge consists of `POST /api/community/discord/ingest` and `GET /api/community/discord`. Ingest verifies the existing five-minute HMAC replay window, 96 KiB maximum, exact v1 schema/guild/count/type/URL bounds, and privacy sanitation before sending the normalized public snapshot to one stable `ThirdRailifyPublicState` Durable Object. The object stores only the latest `community` row in SQLite, hashes every normalized public field except volatile root `generatedAt`, and rewrites that row only for semantic change or the bounded 600-second freshness checkpoint. Repeated bodies, timestamp-only variants, retries, and restarts remain compatible HTTP 204 successes without a row rewrite. GET preserves the public response shape and the existing fresh/delayed/stale rules, including stale presence neutralization.

`BroadcastProvider` is the single public-site poller for same-origin `GET /api/watch`: one active request, omitted credentials, an eight-second bound, visibility pause/resume, live/upcoming/offline cadence of 25/50/100 seconds, and capped error backoff. The strict client accepts only the versioned validated projection. The shared header and mobile menu show current verified live count, while the homepage CTA/platform rail and lazy broadcast card consume the same context; there is no second page-level polling loop.

The watch bridge reuses the existing ingest HMAC secret and singleton Durable Object. `POST /api/watch/ingest` rejects unsigned, replayed/future, oversized, unknown-field, and unsafe-URL payloads, then atomically maintains the independent current `broadcast` row and distinct versioned `broadcast_archive` row. Only the canonical completed/published archive candidate is eligible; stable IDs hash immutable platform/content identity, visibility survives metadata refresh, hidden records count toward the deterministic 24-record cap, and a 25th unique episode prunes the oldest. There is no provider scrape or backfill. Poll-only timestamps and viewer churn do not trigger semantic archive writes. `GET /api/watch` preserves current-state behavior; visible-only `/api/watch/episodes` reads, detail 404s, and historical thumbnail proxying are additive. See `WATCH_V2.md` for the complete contract.

Workers KV is now a read-only legacy migration source. On first object initialization, missing rows are seeded from `discord:community:snapshot:v1` and `broadcast:current:snapshot:v1` through the current normalizers, then a SQLite migration marker prevents every later KV read. Existing Durable Object rows always win, so legacy state cannot overwrite newer state. Normal ThirdRailify KV PUT, DELETE, LIST, and post-migration GET counts are exactly zero; static and behavioral tests enforce that contract. This replacement was necessary because the earlier community-only optimization could not cover the later Watch publisher sharing the same namespace.

The storage contract is available at `GET /api/state-backend`. It exposes only deployment identity, SQLite schema version, snapshot availability, read-only migration status, and expected zero KV operations. `Verify-Cloudflare-State-Backend.cmd` compares the checked-in release/fingerprint with the live Pages contract and reports `CURRENT`, `STALE`, `UNREACHABLE`, or `INCOMPATIBLE` without writing production state. Keep the legacy namespace for the migration/audit window. Roll forward on faults where possible: reverting to KV would reintroduce quota usage and lose any state updates accepted only by the Durable Object. Historical Cloudflare KV totals remain visible until analytics retention ages them out; success is zero new live namespace operations.

`BroadcastPlayer`, `BroadcastMetadata`, `BroadcastStatusBadge`, `LiveNowIndicator`, and `PlatformSelector` are reusable. Iframes are created only for validated HTTPS YouTube privacy-enhanced or Rumble embed URLs; no guessed embed, `srcdoc`, provider script, autoplay, credentialed browser request, or unsafe HTML injection is used. A missing Rumble embed renders a poster/direct-watch fallback. CSP names only the required provider frame/image hosts and retains `object-src 'none'` and `frame-ancestors 'none'`.

The consent manager stores only schema version 1, decision/expiry timestamps, and `preferences` / `externalMedia` booleans in the host-only `thirdrailify_consent` cookie for 183 days. Essential auth/security, cart, and consent-choice storage remain available. Currency/rate cache and non-sensitive GOATS draft persistence require Preferences; YouTube/Rumble iframes require External media. Withdrawing Preferences removes the three optional first-party values, while withdrawing media unmounts provider iframes. The production CSP permits Cloudflare's Pages-injected Web Analytics script and collection endpoint without broadening other script or connection sources. See `PRIVACY_STORAGE_INVENTORY.md` for the exact inventory and version-bump rule.

## Cloudflare and domain safety

See `CLOUDFLARE_SETUP.md` for the proven `thirdrailify` Pages project, the internal `thirdrailify-public-state` Worker binding, rollback constraints, and read-only verifier. The dedicated Worker is required because Pages can bind to but cannot host a Durable Object class. `https://thirdrailify.com` is now the canonical production origin; `www` and the stable Pages hostname redirect to it.

See `CLOUDFLARE_AUTH_SETUP.md` for the Public side of the shared D1 account setup. The real D1 ID is not present locally, so no account binding or live account acceptance is claimed.
