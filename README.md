# Third Railify V2 public site

## Replacement shop commerce source

The replacement `/shop` uses the same-origin `/api/commerce/*` Pages Functions, which proxy the Admin project's sanitized Commerce D1 projection. This Public project deliberately has no Commerce D1 binding and contains no Admin credential. The legacy Wix snapshot remains migration/reference evidence only and is not a runtime catalogue fallback.

Product detail uses local product and variant IDs, real variant-specific integer CAD prices, and a device-local `{ productId, variantId, quantity }` cart. Browser totals are non-authoritative. Normal customer checkout remains visibly disabled. The separate Master-only Stripe TEST acceptance action has completed once and is now closed in Admin; Public exposes no bypass. The live Wix site remains the production store until explicit cutover.

`/checkout/success` is a truthful TEST result page. It starts in a checking state and reads only `/api/commerce/order-status?session_id=cs_test_…`, which proxies a bounded local D1 projection. The browser does not call Stripe, cannot enumerate orders, and never infers payment from the redirect query. Only a signed Stripe webhook can display **Payment confirmed**; the accepted historical Session remains readable after gate closure and fulfillment remains disabled.

Production-oriented public website and storefront foundation for Third Railify. This repository is the future Wix replacement, but the current milestone is a staging scaffold: Wix remains production and no custom domain is attached.

## Current state

- Vite 5, React 18, TypeScript, and React Router.
- Substantial `/` landing page with a joined Shawn/Gina hero composition, Third Railify branding, current verified schedule copy, merch preview, a compact enriched/fallback Discord community module, and clear donation navigation.
- Watch V2 routes at `/watch`, `/watch/live`, `/watch/episodes`, and `/watch/v/:episodeId`, with validated current playback, a naturally populated 24-record SQLite archive, truthful empty slots, and no browser/provider scraping.
- A separate Admin-configured Public announcement banner with static/ticker/crossfade modes and an automatic real-Watch-state Live Now takeover; the staging/Wix environment rail remains independent.
- First-class `/community` destination with the full public-channel/member-profile Discord view, existing goat artwork, verified community paths, and explicit public-data boundaries.
- Premium `/shop` drop experience with a D1-merchandised featured rotation, graphical category discovery, URL-backed search/filter/sort state, responsive product cards, truthful loading/error/empty/image states, and the existing browser-local cart.
- Complete V2 `/goats` community experience with an animated signal hero, MapLibre/OpenFreeMap dark vector map plus automatic Leaflet raster recovery, compact accessible markers with dark SVG-flagged listing cards, modal-scale expansion, approved-only gallery/detail projections, product-linked submission wizard, policy-aware authenticated reactions/comments, and a fixed same-origin bridge to Admin authority. Staging serves the nine imported Wix stories plus the two retained demos.
- Product detail routes at `/products/:category/:slug`; legacy `/product-page/:slug` paths and category routes remain preserved client-side.
- Authoritative CAD prices with one shared USD-default approximate display-currency system, persisted/query-aware selection, same-origin server rate projection, cached stale fallback, and zero changes to cart or checkout values.
- Shared account client with an OAuth-first email-capable login modal, explicit Turnstile, one-time Admin-to-Public handoff, same-origin sessions/logout, a detailed responsive far-right header identity menu, compact icon/count cart control, verified-live-only header signal, and real `/account` routes with Admin-authoritative display-name and avatar changes.
- First-class policy library at `/policies` plus deep-linked Terms, Privacy, Refund, and Accessibility documents grounded in the current V2 data and provider boundaries, with a truthful non-interactive future-membership register slot.
- Compact non-modal privacy choices with equal first-layer Accept/Reject actions, granular Preferences and External media controls, a versioned 183-day first-party choice cookie, footer withdrawal, and consent-gated optional local storage and Watch iframes.
- Truthful `/checkout/success` states backed by an exact opaque-Session local payment-status projection; no provider metadata, internal account identity, audit data, Printful mapping, or browser-side Stripe authority is exposed.
- Complete presentation-only `/donate` destination with a cinematic signal hero, accessible one-time/monthly/yearly and CAD amount controls, explicit donation-purpose/disclaimer copy, and a visibly disabled PayPal handoff until real provider wiring is implemented.
- Polished migration shells for discovered major routes and a branded 404.
- Cloudflare Pages static output, SPA fallback, staging noindex, and baseline security headers.

Checkout, payments, tax, shipping, inventory, Printful/Printify APIs, memberships, donations, CMS writes, and newsletter submission are not connected. Accounts are implemented in code but are not live until the shared staging D1 binding, Admin secrets/providers, and deployment are configured. Cart contents exist only in browser memory and the cart explicitly disables checkout.

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
npm run test:kv-ban
npm run test:state-budget
npm run test:state-fingerprint
npm run build
npm run preview
```

The production output is `dist/`.

## Route architecture

- Implemented: `/`, `/watch`, `/watch/live`, `/watch/episodes`, `/watch/v/:episodeId`, `/shop`, `/shop/:slug`, `/products/all`, `/products/:category`, `/products/:category/:slug`, `/cart`, `/community`, `/goats`, `/goats/submit`, `/goats/:slug`, `/donate`, `/account`, `/account/login`, `/policies`, `/terms`, `/privacy`, `/refunds`, `/accessibility`.
- Migration shells: `/shawn`, `/gina`, `/about`, `/friends`, `/vip`, `/gift-cards`.
- Preserved aliases: `/live` redirects at the edge to the dedicated player only for an effective current live signal and otherwise to `/watch`, preserving its query; `/goatgate` redirects to `/goats/submit` with query/hash intact; `/support` and `/donate-1` redirect to `/donate` with query/hash intact; `/cart-page` redirects to `/cart` with query/hash intact; `/gift`, `/pricing-plans/list`, `/members-home`, and `/product-page/:slug` remain preserved.
- Static Pages aliases: `/store` and `/merch` redirect to `/shop`.
- Everything else receives the branded application 404 after the SPA fallback.

See `LIVE_SITE_AUDIT.md` for the discovered Wix routes, current catalogue evidence, unresolved surfaces, and cutover strategy.

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
│   ├── _shared/public-auth.js        Public session/handoff/logout and narrow proxy primitives
│   ├── api/auth/                     Same-origin Public auth plus Admin avatar-authority proxy
│   ├── api/catalogue/                Fail-soft Admin merchandising projection proxy
│   ├── api/goats/                    Fixed approved reads plus signed submission/interaction bridge
│   ├── api/currency-rates.js         Validated, cached same-origin CAD reference-rate projection
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
│   ├── _redirects          Aliases and SPA fallback
│   └── _routes.json        Invoke Functions only for auth, GOATS, community, watch, and storage diagnostics APIs
├── src/
│   ├── auth/               Shared session provider, modal, Turnstile, and header account widget
│   ├── components/         Shared shell plus reusable broadcast/player, Discord, rail, product, and cart UI
│   ├── privacy/            Versioned consent model, cookie record, categories, and storage cleanup
│   ├── currency/           Shared selected-currency state, cache, conversion, and formatting
│   ├── content/            Structured policy registry and long-form legal content
│   ├── data/               Dated bounded Wix snapshot
│   ├── hooks/              Broadcast context plus visibility/reduced-motion gates
│   ├── goats/              Typed API client, SVG country flags, and lazy vector/raster map engines
│   ├── lib/                Validated broadcast/Discord boundaries and replaceable catalogue provider
│   ├── pages/              Public routes, including Account, Watch, and Community pages
│   ├── store/              Local-only cart state
│   ├── styles/             Tokens and responsive visual system
│   └── types/              Provider-neutral catalogue contracts
├── scripts/                KV mutation ban, budget/fingerprint checks, and live backend verifier
├── tests/                  Function, Durable Object, migration, isolation, and watch browser fixtures
├── Verify-Cloudflare-State-Backend.cmd  Double-clickable read-only live verifier
├── wrangler.jsonc          Pages external Durable Object binding
├── CLOUDFLARE_SETUP.md
├── CLOUDFLARE_AUTH_SETUP.md
├── CLOUDFLARE_KV_WRITE_INVENTORY.md  Pre/post migration writer, reader, and cadence evidence
├── CHECKOUT_RELEASE_GATES.md  Evidence-based Ontario/federal pre-activation implementation matrix
├── CONTACT_ROLE_MATRIX.md    Published/sender/reply-to contact roles without monitoring assumptions
├── DATA_RETENTION_MATRIX.md  Implemented TTLs, cleanup paths, capacity bounds, and undecided schedules
├── GOATS_V2.md             Public routes, API boundary, map configuration, and migration posture
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

GOATS persistence belongs only to `ThirdRailify-Admin`. Public exposes fixed same-origin `/api/goats/*` routes, signs server-to-server mutations with an encrypted shared secret, and has no commerce D1 or media R2 binding. Public responses contain approved/published fields only; private email, account IDs, moderator data, object keys, exact location input, email state, and audit metadata remain Admin-only. See `GOATS_V2.md` for route, environment, local fixture, and provider-fallback details.

Account authority lives only in `ThirdRailify-Admin`. Public sends credential and OAuth-start requests to the exact configured Admin origin, receives only a short-lived one-time handoff code, and consumes that code through its same-origin Function to create a host-only staging session. Display-name and avatar submissions use narrow same-origin proxies that forward the existing session cookie and CSRF proof to Admin; Public has no profile-media object binding and performs no account-row mutation. Public never stores canonical identity in local storage and contains no password hashing, provider secret, Turnstile secret, Resend key, or role authority. Existing sign-in credentials are not subject to the 12-character policy used when creating or resetting a password.

`src/types/catalogue.ts` remains provider-neutral. `src/lib/catalogueProvider.ts` consumes only the sanitized same-origin Commerce D1 product and ordered visible-collection projection; it has no runtime Wix fallback. Gallery, related-product, and cart amounts stay authoritative CAD with local Canadian SVG flags. Reference conversion is isolated to product details and never changes the CAD catalogue/cart authority. Provider credentials and all write operations remain server-side.

`GET /api/currency-rates` is the only storefront request path to the configured `CURRENCY_RATES_API_URL`. It requires HTTPS, validates CAD base, ISO date, three-letter codes, and finite positive rates, adds CAD=1, applies a bounded timeout, and publishes several-hour cache plus stale-while-revalidate headers. The product-detail-only chooser uses local SVG flags for the actual supported currency set and preserves its preference/cache only when Preferences consent permits it. Gallery rendering never depends on that preference.

`src/lib/discordWidget.ts` first requests the same-origin `/api/community/discord` projection published by the local Third Railify bot. That projection contains only whitelisted/revalidated public channels and bounded public presentation fields; the browser never receives a Discord token, ingest secret, admin-role configuration, permissions, roles, messages, or private metadata. The shared widget labels fresh, delayed, and stale data, neutralizes stale presence, shows public text/community channels, and provides keyboard/click/tap-accessible profile cards for enriched members. The homepage bounds the channel directory more tightly; `/community` shows the full capped directory. Both retain 12 collapsed and 24 expanded member limits.

If the enriched endpoint is absent or unavailable, the client falls back to Discord's public server widget for guild `1114717958573396008`. Basic mode is explicitly labelled and shows only the server name, Discord presence count, public voice spaces, and anonymized widget members. It does not invent text channels, joined dates, usernames, IDs, or rich profiles. If both sources fail, the widget shows an intentional unavailable state while preserving the public invite. All fetches are bounded to eight seconds with `cache: no-store` and omitted credentials.

The Pages bridge consists of `POST /api/community/discord/ingest` and `GET /api/community/discord`. Ingest verifies the existing five-minute HMAC replay window, 96 KiB maximum, exact v1 schema/guild/count/type/URL bounds, and privacy sanitation before sending the normalized public snapshot to one stable `ThirdRailifyPublicState` Durable Object. The object stores only the latest `community` row in SQLite, hashes every normalized public field except volatile root `generatedAt`, and rewrites that row only for semantic change or the bounded 600-second freshness checkpoint. Repeated bodies, timestamp-only variants, retries, and restarts remain compatible HTTP 204 successes without a row rewrite. GET preserves the public response shape and the existing fresh/delayed/stale rules, including stale presence neutralization.

`BroadcastProvider` is the single public-site poller for same-origin `GET /api/watch`: one active request, omitted credentials, an eight-second bound, visibility pause/resume, live/upcoming/offline cadence of 25/50/100 seconds, and capped error backoff. The strict client accepts only the versioned validated projection. The shared header and mobile menu show current verified live count, while the homepage CTA/platform rail and lazy broadcast card consume the same context; there is no second page-level polling loop.

The watch bridge reuses the existing ingest HMAC secret and singleton Durable Object. `POST /api/watch/ingest` rejects unsigned, replayed/future, oversized, unknown-field, and unsafe-URL payloads, then atomically maintains the independent current `broadcast` row and distinct versioned `broadcast_archive` row. Only the canonical completed/published archive candidate is eligible; stable IDs hash immutable platform/content identity, visibility survives metadata refresh, hidden records count toward the deterministic 24-record cap, and a 25th unique episode prunes the oldest. There is no provider scrape or backfill. Poll-only timestamps and viewer churn do not trigger semantic archive writes. `GET /api/watch` preserves current-state behavior; visible-only `/api/watch/episodes` reads, detail 404s, and historical thumbnail proxying are additive. See `WATCH_V2.md` for the complete contract.

Workers KV is now a read-only legacy migration source. On first object initialization, missing rows are seeded from `discord:community:snapshot:v1` and `broadcast:current:snapshot:v1` through the current normalizers, then a SQLite migration marker prevents every later KV read. Existing Durable Object rows always win, so legacy state cannot overwrite newer state. Normal ThirdRailify KV PUT, DELETE, LIST, and post-migration GET counts are exactly zero; static and behavioral tests enforce that contract. This replacement was necessary because the earlier community-only optimization could not cover the later Watch publisher sharing the same namespace.

The storage contract is available at `GET /api/state-backend`. It exposes only deployment identity, SQLite schema version, snapshot availability, read-only migration status, and expected zero KV operations. `Verify-Cloudflare-State-Backend.cmd` compares the checked-in release/fingerprint with the live Pages contract and reports `CURRENT`, `STALE`, `UNREACHABLE`, or `INCOMPATIBLE` without writing production state. Keep the legacy namespace for the migration/audit window. Roll forward on faults where possible: reverting to KV would reintroduce quota usage and lose any state updates accepted only by the Durable Object. Historical Cloudflare KV totals remain visible until analytics retention ages them out; success is zero new live namespace operations.

`BroadcastPlayer`, `BroadcastMetadata`, `BroadcastStatusBadge`, `LiveNowIndicator`, and `PlatformSelector` are reusable. Iframes are created only for validated HTTPS YouTube privacy-enhanced or Rumble embed URLs; no guessed embed, `srcdoc`, provider script, autoplay, credentialed browser request, or unsafe HTML injection is used. A missing Rumble embed renders a poster/direct-watch fallback. CSP names only the required provider frame/image hosts and retains `object-src 'none'` and `frame-ancestors 'none'`.

The consent manager stores only schema version 1, decision/expiry timestamps, and `preferences` / `externalMedia` booleans in the host-only `thirdrailify_consent` cookie for 183 days. Essential auth/security, cart, and consent-choice storage remain available. Currency/rate cache and non-sensitive GOATS draft persistence require Preferences; YouTube/Rumble iframes require External media. Withdrawing Preferences removes the three optional first-party values, while withdrawing media unmounts provider iframes. Cloudflare Web Analytics is not enabled on the current Third Railify top-level staging response; a Cloudflare beacon observed before this change was frame-attributed to Rumble and is now naturally behind the media gate. See `PRIVACY_STORAGE_INVENTORY.md` for the exact inventory and version-bump rule.

## Cloudflare and domain safety

See `CLOUDFLARE_SETUP.md` for the proven `thirdrailify` Pages project, the internal `thirdrailify-public-state` Worker binding, migration order, rollback constraints, and read-only verifier. The dedicated Worker is required because Pages can bind to but cannot host a Durable Object class. Do not attach `thirdrailify.com` while Wix is production.

See `CLOUDFLARE_AUTH_SETUP.md` for the Public side of the shared D1 account setup. The real D1 ID is not present locally, so no account binding or live account acceptance is claimed.
