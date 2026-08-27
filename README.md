# Third Railify V2 public site

Production-oriented public website and storefront foundation for Third Railify. This repository is the future Wix replacement, but the current milestone is a staging scaffold: Wix remains production and no custom domain is attached.

## Current state

- Vite 5, React 18, TypeScript, and React Router.
- Substantial `/` landing page with a joined Shawn/Gina hero composition, Third Railify branding, current verified schedule copy, merch preview, a compact enriched/fallback Discord community module, and staged support surfaces.
- Real `/watch` destination with validated live/latest playback, provider switching, freshness-safe metadata, schedule/direct-link fallbacks, and no browser provider scraping.
- First-class `/community` destination with the full public-channel/member-profile Discord view, existing goat artwork, verified community paths, and explicit public-data boundaries.
- Substantial `/shop` with a bounded, dated eight-product Wix snapshot, search, verified broad facets, sorting, loading/error/empty states, details, and a local cart.
- Product routes at `/products/:slug`; legacy `/product-page/:slug` paths are preserved client-side.
- Shared account client with an OAuth-first email-capable login modal, explicit Turnstile, one-time Admin-to-Public handoff, same-origin sessions/logout, a detailed responsive far-right header identity menu, compact icon/count cart control, verified-live-only header signal, and real `/account` routes with Admin-authoritative display-name and avatar changes.
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
npm run test:kv-ban
npm run test:state-budget
npm run test:state-fingerprint
npm run build
npm run preview
```

The production output is `dist/`.

## Route architecture

- Implemented: `/`, `/watch`, `/shop`, `/products/:slug`, `/community`, `/account`, `/account/login`.
- Migration shells: `/shawn`, `/gina`, `/about`, `/friends`, `/vip`, `/support`, `/gift-cards`, `/policies`, `/terms`, `/privacy`, `/refunds`, `/accessibility`.
- Preserved aliases: `/goats`, `/gift`, `/donate-1`, `/pricing-plans/list`, `/members-home`, `/cart-page`, and `/product-page/:slug`.
- Static Pages aliases: `/store` and `/merch` redirect to `/shop`.
- Everything else receives the branded application 404 after the SPA fallback.

See `LIVE_SITE_AUDIT.md` for the discovered Wix routes, current catalogue evidence, unresolved surfaces, and cutover strategy.

## Structure

```text
ThirdRailify/
├── assets/
│   ├── backgrounds/        Seeded Third Railify backgrounds
│   ├── catalogue/          Local copies of eight audited Wix product images
│   ├── fonts/              Seeded font files and licences
│   ├── icons/              Active Public favicon plus local Discord, TikTok, and platform SVG artwork
│   ├── illustrations/      Joined hero art and homepage show-format feature illustrations
│   ├── logos/              Seeded marks and the active straight header/footer bolt silhouette
│   ├── people/             Seeded host imagery
│   └── video/              Seeded media (not used as a decorative hero loop)
├── pocv1/                  Reference-only approved inspiration POC
├── functions/
│   ├── _shared/public-auth.js        Public session/handoff/logout and narrow proxy primitives
│   ├── api/auth/                     Same-origin Public auth plus Admin avatar-authority proxy
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
│   └── _routes.json        Invoke Functions only for auth, community, watch, and storage diagnostics APIs
├── src/
│   ├── auth/               Shared session provider, modal, Turnstile, and header account widget
│   ├── components/         Shared shell plus reusable broadcast/player, Discord, rail, product, and cart UI
│   ├── data/               Dated bounded Wix snapshot
│   ├── hooks/              Broadcast context plus visibility/reduced-motion gates
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
├── LIVE_SITE_AUDIT.md
├── BUMP_NOTES.md
└── package.json
```

The display system uses the seeded American Captain asset at its real weight with lightly relaxed tracking for the primary header voice, with seeded Blinker and Geist Mono for readable body and technical roles.

## Data and provider boundaries

Account authority lives only in `ThirdRailify-Admin`. Public sends credential and OAuth-start requests to the exact configured Admin origin, receives only a short-lived one-time handoff code, and consumes that code through its same-origin Function to create a host-only staging session. Display-name and avatar submissions use narrow same-origin proxies that forward the existing session cookie and CSRF proof to Admin; Public has no profile-media object binding and performs no account-row mutation. Public never stores canonical identity in local storage and contains no password hashing, provider secret, Turnstile secret, Resend key, or role authority. Existing sign-in credentials are not subject to the 12-character policy used when creating or resetting a password.

`src/types/catalogue.ts` is provider-neutral. `src/lib/catalogueProvider.ts` currently returns `src/data/wixSnapshot.ts` asynchronously so loading/error UI exists without coupling components to Wix. A future server/API adapter can replace that provider. Provider credentials and write operations must remain server-side; no provider environment names or APIs are invented here.

`src/lib/discordWidget.ts` first requests the same-origin `/api/community/discord` projection published by the local Third Railify bot. That projection contains only whitelisted/revalidated public channels and bounded public presentation fields; the browser never receives a Discord token, ingest secret, admin-role configuration, permissions, roles, messages, or private metadata. The shared widget labels fresh, delayed, and stale data, neutralizes stale presence, shows public text/community channels, and provides keyboard/click/tap-accessible profile cards for enriched members. The homepage bounds the channel directory more tightly; `/community` shows the full capped directory. Both retain 12 collapsed and 24 expanded member limits.

If the enriched endpoint is absent or unavailable, the client falls back to Discord's public server widget for guild `1114717958573396008`. Basic mode is explicitly labelled and shows only the server name, Discord presence count, public voice spaces, and anonymized widget members. It does not invent text channels, joined dates, usernames, IDs, or rich profiles. If both sources fail, the widget shows an intentional unavailable state while preserving the public invite. All fetches are bounded to eight seconds with `cache: no-store` and omitted credentials.

The Pages bridge consists of `POST /api/community/discord/ingest` and `GET /api/community/discord`. Ingest verifies the existing five-minute HMAC replay window, 96 KiB maximum, exact v1 schema/guild/count/type/URL bounds, and privacy sanitation before sending the normalized public snapshot to one stable `ThirdRailifyPublicState` Durable Object. The object stores only the latest `community` row in SQLite, hashes every normalized public field except volatile root `generatedAt`, and rewrites that row only for semantic change or the bounded 600-second freshness checkpoint. Repeated bodies, timestamp-only variants, retries, and restarts remain compatible HTTP 204 successes without a row rewrite. GET preserves the public response shape and the existing fresh/delayed/stale rules, including stale presence neutralization.

`BroadcastProvider` is the single public-site poller for same-origin `GET /api/watch`: one active request, omitted credentials, an eight-second bound, visibility pause/resume, live/upcoming/offline cadence of 25/50/100 seconds, and capped error backoff. The strict client accepts only the versioned validated projection. The shared header and mobile menu show current verified live count, while the homepage CTA/platform rail and lazy broadcast card consume the same context; there is no second page-level polling loop.

The watch bridge reuses the existing HMAC secret and the same singleton Durable Object, but owns only the independent `broadcast` SQLite row. `POST /api/watch/ingest` rejects unsigned, replayed/future, oversized, unknown-field, and unsafe-URL payloads, then applies its own semantic fingerprint. Broadcast transitions, selected-stream changes, provider state, and public title/metadata changes persist immediately without rewriting community state. Poll-only `generatedAt`, provider `checkedAt`, candidate `observedAt`, live lease renewal, and viewer-count churn do not trigger row writes; the full latest viewer count is sampled into each checkpoint. Identical live and upcoming state checkpoints every 150 seconds, and inactive/offline state every 600 seconds, so a healthy producer is not presented as stale merely to conserve a retired KV budget. `GET /api/watch` and `/api/watch/thumbnail` preserve their existing contracts, stale-live demotion, viewer-count removal, and bounded Rumble proxy behavior.

Workers KV is now a read-only legacy migration source. On first object initialization, missing rows are seeded from `discord:community:snapshot:v1` and `broadcast:current:snapshot:v1` through the current normalizers, then a SQLite migration marker prevents every later KV read. Existing Durable Object rows always win, so legacy state cannot overwrite newer state. Normal ThirdRailify KV PUT, DELETE, LIST, and post-migration GET counts are exactly zero; static and behavioral tests enforce that contract. This replacement was necessary because the earlier community-only optimization could not cover the later Watch publisher sharing the same namespace.

The storage contract is available at `GET /api/state-backend`. It exposes only deployment identity, SQLite schema version, snapshot availability, read-only migration status, and expected zero KV operations. `Verify-Cloudflare-State-Backend.cmd` compares the checked-in release/fingerprint with the live Pages contract and reports `CURRENT`, `STALE`, `UNREACHABLE`, or `INCOMPATIBLE` without writing production state. Keep the legacy namespace for the migration/audit window. Roll forward on faults where possible: reverting to KV would reintroduce quota usage and lose any state updates accepted only by the Durable Object. Historical Cloudflare KV totals remain visible until analytics retention ages them out; success is zero new live namespace operations.

`BroadcastPlayer`, `BroadcastMetadata`, `BroadcastStatusBadge`, `LiveNowIndicator`, and `PlatformSelector` are reusable. Iframes are created only for validated HTTPS YouTube privacy-enhanced or Rumble embed URLs; no guessed embed, `srcdoc`, provider script, autoplay, credentialed browser request, or unsafe HTML injection is used. A missing Rumble embed renders a poster/direct-watch fallback. CSP names only the required provider frame/image hosts and retains `object-src 'none'` and `frame-ancestors 'none'`.

## Cloudflare and domain safety

See `CLOUDFLARE_SETUP.md` for the proven `thirdrailify` Pages project, the internal `thirdrailify-public-state` Worker binding, migration order, rollback constraints, and read-only verifier. The dedicated Worker is required because Pages can bind to but cannot host a Durable Object class. Do not attach `thirdrailify.com` while Wix is production.

See `CLOUDFLARE_AUTH_SETUP.md` for the Public side of the shared D1 account setup. The real D1 ID is not present locally, so no account binding or live account acceptance is claimed.
