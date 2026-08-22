# Third Railify V2 public site

Production-oriented public website and storefront foundation for Third Railify. This repository is the future Wix replacement, but the current milestone is a staging scaffold: Wix remains production and no custom domain is attached.

## Current state

- Vite 5, React 18, TypeScript, and React Router.
- Substantial `/` landing page with a joined Shawn/Gina hero composition, Third Railify branding, current verified schedule copy, merch preview, a compact enriched/fallback Discord community module, and staged support surfaces.
- Real `/watch` destination with validated live/latest playback, provider switching, freshness-safe metadata, schedule/direct-link fallbacks, and no browser provider scraping.
- First-class `/community` destination with the full public-channel/member-profile Discord view, existing goat artwork, verified community paths, and explicit public-data boundaries.
- Substantial `/shop` with a bounded, dated eight-product Wix snapshot, search, verified broad facets, sorting, loading/error/empty states, details, and a local cart.
- Product routes at `/products/:slug`; legacy `/product-page/:slug` paths are preserved client-side.
- Polished migration shells for discovered major routes and a branded 404.
- Cloudflare Pages static output, SPA fallback, staging noindex, and baseline security headers.

Checkout, payments, tax, shipping, inventory, Printful/Printify APIs, accounts, memberships, donations, CMS writes, and newsletter submission are not connected. Cart contents exist only in browser memory and the cart explicitly disables checkout.

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
npm run build
npm run preview
```

The production output is `dist/`.

## Route architecture

- Implemented: `/`, `/watch`, `/shop`, `/products/:slug`, `/community`.
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
│   ├── illustrations/      Joined editorial hero artwork
│   ├── logos/              Seeded marks and the active straight header/footer bolt silhouette
│   ├── people/             Seeded host imagery
│   └── video/              Seeded media (not used as a decorative hero loop)
├── pocv1/                  Reference-only approved inspiration POC
├── functions/
│   ├── api/_snapshot-persistence.js  Shared semantic fingerprint, envelope, and checkpoint gate
│   ├── api/community/       Signed Discord ingest and public snapshot Pages Functions
│   ├── api/watch.js         Public validated broadcast snapshot projection
│   └── api/watch/           Signed ingest, strict normalizer, and bounded Rumble thumbnail proxy
├── public/
│   ├── _headers            Cloudflare static response policy
│   ├── _redirects          Aliases and SPA fallback
│   └── _routes.json        Invoke Functions only for community and watch APIs
├── src/
│   ├── components/         Shared shell plus reusable broadcast/player, Discord, rail, product, and cart UI
│   ├── data/               Dated bounded Wix snapshot
│   ├── hooks/              Broadcast context plus visibility/reduced-motion gates
│   ├── lib/                Validated broadcast/Discord boundaries and replaceable catalogue provider
│   ├── pages/              Public routes, including full Watch and Community pages
│   ├── store/              Local-only cart state
│   ├── styles/             Tokens and responsive visual system
│   └── types/              Provider-neutral catalogue contracts
├── tests/                  Node Function validation, KV budget projection, and deterministic watch browser fixtures
├── CLOUDFLARE_SETUP.md
├── LIVE_SITE_AUDIT.md
├── BUMP_NOTES.md
└── package.json
```

The display system uses the seeded American Captain asset at its real weight with lightly relaxed tracking for the primary header voice, with seeded Blinker and Geist Mono for readable body and technical roles.

## Data and provider boundaries

`src/types/catalogue.ts` is provider-neutral. `src/lib/catalogueProvider.ts` currently returns `src/data/wixSnapshot.ts` asynchronously so loading/error UI exists without coupling components to Wix. A future server/API adapter can replace that provider. Provider credentials and write operations must remain server-side; no provider environment names or APIs are invented here.

`src/lib/discordWidget.ts` first requests the same-origin `/api/community/discord` projection published by the local Third Railify bot. That projection contains only whitelisted/revalidated public channels and bounded public presentation fields; the browser never receives a Discord token, ingest secret, admin-role configuration, permissions, roles, messages, or private metadata. The shared widget labels fresh, delayed, and stale data, neutralizes stale presence, shows public text/community channels, and provides keyboard/click/tap-accessible profile cards for enriched members. The homepage bounds the channel directory more tightly; `/community` shows the full capped directory. Both retain 12 collapsed and 24 expanded member limits.

If the enriched endpoint is absent or unavailable, the client falls back to Discord's public server widget for guild `1114717958573396008`. Basic mode is explicitly labelled and shows only the server name, Discord presence count, public voice spaces, and anonymized widget members. It does not invent text channels, joined dates, usernames, IDs, or rich profiles. If both sources fail, the widget shows an intentional unavailable state while preserving the public invite. All fetches are bounded to eight seconds with `cache: no-store` and omitted credentials.

The Pages bridge consists of `POST /api/community/discord/ingest` and `GET /api/community/discord`. Ingest verifies a five-minute HMAC replay window, a 96 KiB maximum, the exact v1 schema/guild/count/type/URL bounds, and strips unknown fields before considering the versioned `discord:community:snapshot:v1` KV record. The Pages Function then hashes every normalized public field except volatile root `generatedAt`; repeated bodies, timestamp-only variants, retries, restarts, and manual replays return compatible HTTP 204 success without a PUT. Meaningful member, presence, count, channel, guild, or source changes persist on the next accepted ingest. Unchanged state receives one coarse 1,800-second checkpoint, configurable with `THIRDRAILIFY_COMMUNITY_KV_CHECKPOINT_SECONDS` but guarded to at least 900 seconds. The internal envelope records its schema, semantic fingerprint, producer observation, persistence time, and `semantic_change` or `freshness_checkpoint` reason while GET preserves the existing safe response contract. GET continues to derive fresh under 720 seconds, delayed from 720 through 1199 seconds, and stale at 1200 seconds or later; stale presence neutralization is unchanged. `public/_routes.json` restricts Functions invocation to the named community/watch API paths, preserving static Vite and SPA routing.

`BroadcastProvider` is the single public-site poller for same-origin `GET /api/watch`: one active request, omitted credentials, an eight-second bound, visibility pause/resume, live/upcoming/offline cadence of 25/50/100 seconds, and capped error backoff. The strict client accepts only the versioned validated projection. The shared header and mobile menu show current verified live count, while the homepage CTA/platform rail and lazy broadcast card consume the same context; there is no second page-level polling loop.

The watch bridge reuses the existing HMAC secret and `THIRDRAILIFY_COMMUNITY_KV`, storing the independent `broadcast:current:snapshot:v1` record. `POST /api/watch/ingest` rejects unsigned, replayed/future, oversized, unknown-field, and unsafe-URL payloads, then applies its own semantic fingerprint rather than sharing community state. Broadcast transitions, selected-stream changes, provider state, and public title/metadata changes persist immediately. Poll-only `generatedAt`, provider `checkedAt`, candidate `observedAt`, live lease renewal, and viewer-count churn do not trigger writes; the full latest viewer count is still sampled into each checkpoint. Identical live state checkpoints every 150 seconds because the existing safe live lease can be as short as 180 seconds, upcoming state every 600 seconds, and inactive/offline state every 1,800 seconds. `GET /api/watch` keeps the existing response and freshness contract: fresh below 180 seconds, delayed from 180 through 899 seconds, stale from 900 seconds; expired or stale live presence is demoted and viewer counts are removed. Rumble thumbnails remain read-only and are projected through a key-bound, bounded same-origin proxy only when the signed snapshot already contains the URL.

KV writes are deliberately account-budgeted rather than tied to observation or POST cadence. The prior unconditional ingest behavior projected 288 PUTs/day while both surfaces were quiet and about 1,296 PUTs/day during a continuously live broadcast. Server-side dedupe now projects 48 community plus 48 inactive-broadcast writes on a quiet day (96 combined). A representative four-hour live day is 186 combined writes including start/end transitions; a six-hour busy live day is 230, leaving limited headroom for additional meaningful metadata transitions. Thirty-day projections are 2,880 quiet or 6,900 at that busy daily model. These are ThirdRailify budgets, not an exclusive claim on Cloudflare's account-wide allowance; other present or future namespaces also need headroom.

`BroadcastPlayer`, `BroadcastMetadata`, `BroadcastStatusBadge`, `LiveNowIndicator`, and `PlatformSelector` are reusable. Iframes are created only for validated HTTPS YouTube privacy-enhanced or Rumble embed URLs; no guessed embed, `srcdoc`, provider script, autoplay, credentialed browser request, or unsafe HTML injection is used. A missing Rumble embed renders a poster/direct-watch fallback. CSP names only the required provider frame/image hosts and retains `object-src 'none'` and `frame-ancestors 'none'`.

## Cloudflare and domain safety

See `CLOUDFLARE_SETUP.md` for the exact manual KV binding and secret configuration. No namespace, binding, secret, Pages project, or deployment is claimed merely because the code exists. Do not attach `thirdrailify.com` while Wix is production.
