# Cloudflare Pages staging setup

This describes the dashboard values for the current static Vite scaffold. It does not claim that a Pages project exists and does not authorize deployment, DNS, nameserver, Wix, or custom-domain changes.

## Project values

| Setting | Value |
| --- | --- |
| Repository | `ThirdRailify` |
| Production branch | `main` |
| Root directory | `/` (repository root; leave the dashboard field blank) |
| Framework preset | React (Vite), if offered |
| Dependency install | Cloudflare's lockfile install (`npm ci`) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22.16.0`, pinned by `.node-version` |

Cloudflare's current Pages documentation lists `npm run build` and `dist` for React/Vite, treats an unspecified root as the repository root, and supports `.node-version` for selecting Node. The build copies `public/_headers`, `public/_redirects`, and `public/_routes.json` into `dist/`. The routes file includes only the community and watch API paths, so ordinary static and SPA requests do not unnecessarily invoke Functions.

## Environment names

The catalogue remains a local dated snapshot. The community Pages Functions add one server-only encrypted secret and one KV binding; neither is a browser/Vite variable:

| Name | Type | Purpose |
| --- | --- | --- |
| `THIRDRAILIFY_COMMUNITY_KV` | Workers KV binding | Stores the latest validated community record at `discord:community:snapshot:v1` |
| `THIRDRAILIFY_COMMUNITY_INGEST_SECRET` | Encrypted Pages secret | Verifies bot HMAC signatures at ingest |
| `THIRDRAILIFY_COMMUNITY_KV_CHECKPOINT_SECONDS` | Optional Pages variable | Overrides the 1,800-second unchanged community checkpoint; values below 900 are clamped |
| `THIRDRAILIFY_BROADCAST_KV_LIVE_CHECKPOINT_SECONDS` | Optional Pages variable | Overrides the 150-second live checkpoint; values below 150 are clamped for the existing live lease |
| `THIRDRAILIFY_BROADCAST_KV_UPCOMING_CHECKPOINT_SECONDS` | Optional Pages variable | Overrides the 600-second upcoming checkpoint; values below 300 are clamped |
| `THIRDRAILIFY_BROADCAST_KV_INACTIVE_CHECKPOINT_SECONDS` | Optional Pages variable | Overrides the 1,800-second inactive checkpoint; values below 900 are clamped |

The broadcast bridge reuses both entries above. Its record is stored under a separate KV key, so no second KV namespace, binding, or ingest secret is required.

Never prefix the secret with `VITE_`, copy it into browser source, return it from GET, place it in Git, or paste the repository's local `.env` into Cloudflare.

`NODE_VERSION` does not need to be added in the dashboard because `.node-version` already pins it. If dashboard policy requires an explicit build variable, use the same name/value and keep the file and dashboard synchronized.

## Community bridge — manual post-Codex setup

These resources do not exist merely because code references them. Perform these steps manually after code review; this milestone does not authorize dashboard changes or deployment.

1. Create one Workers KV namespace for the Public Pages project, suggested display purpose **ThirdRailify Community**.
2. Bind that namespace to the Pages project as `THIRDRAILIFY_COMMUNITY_KV` for the staging environment being tested.
3. Add an encrypted Pages secret named `THIRDRAILIFY_COMMUNITY_INGEST_SECRET`.
4. Put the same randomly generated secret value only in that Pages secret and the local bot's untracked `.env` under `THIRDRAILIFY_COMMUNITY_INGEST_SECRET`.
5. Put the staging ingest endpoint in the bot's untracked `.env` as `THIRDRAILIFY_COMMUNITY_INGEST_URL`, ending in `/api/community/discord/ingest`.
6. Run the bot's `run-bot.cmd --check`; it verifies that URL/secret are either both present or both absent and does not publish.
7. After a separate live-smoke approval, start the bot manually and verify one bounded signed snapshot at `GET /api/community/discord` before relying on the UI's enriched mode.

For the watch bridge, add the same staging origin to the bot's untracked `.env` as `THIRDRAILIFY_BROADCAST_INGEST_URL=https://<staging-project>.pages.dev/api/watch/ingest`. Keep the existing community secret value unchanged. A clean supervised bot restart is required before the new URL is loaded. After separate approval, Bot Admin `/streams website-status` can inspect safe local status and Super Admin `/streams website-publish` can request one signed snapshot without Discord delivery/history. This setup does not authorize a bot restart, Pages deployment, secret mutation, custom-domain attachment, or live command during code review.

The local machine makes outbound HTTPS requests only. Do not port-forward, tunnel, or expose an inbound bot endpoint. The staging `pages.dev` URL may be used initially; do not attach a custom domain.

The bot may continue observing and POSTing at its existing cadence, but the Pages Functions now own the final idempotent KV budget gate. Community semantic hashing excludes only root `generatedAt`; broadcast hashing also excludes provider/candidate observation timestamps, live-lease renewal, and viewer-count churn while retaining every public transition and metadata field. Valid unchanged ingests return HTTP 204 with safe persistence/reason/write-count headers and do not PUT until the relevant checkpoint. The public GET contracts and stale neutralization/demotion behavior remain unchanged. Missing KV data still returns a truthful unavailable response, allowing the React client to use Discord's basic public-widget fallback. The HMAC replay window remains five minutes and is independent of display freshness.

## Staging verification

1. Before connecting Git, run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:functions`, and `npm run build` locally.
2. Connect the repository with the values above and allow only a `pages.dev` staging URL.
3. Confirm `/`, `/shop`, a known `/products/:slug`, a migration shell, a preserved alias, and an unknown route on the deployed preview.
4. Confirm `/_redirects` provides direct-load SPA behavior, `/store` redirects to `/shop`, `/watch` loads directly, `/api/watch` is not swallowed by the SPA, and `_routes.json` invokes Functions only for the named community/watch API paths.
5. Confirm static responses include `X-Robots-Tag: noindex, nofollow, noarchive` plus the checked-in security headers.
6. With local test secrets only, validate good/bad/expired HMAC, wrong guild/schema, oversized bodies, normalized persistence, missing/fresh/delayed/stale GET, and no-store responses. Never use or print the production secret during local validation.
7. Check enriched, basic fallback, and unavailable widget modes at phone, tablet, and desktop widths, including profile focus/tap/Escape/outside close, 12/24 member bounds, long text, reduced motion, overflow, and console/network errors.
8. Validate watch loading, YouTube live, Rumble live, simultaneous live, offline latest on each provider, Rumble no-embed fallback, upcoming, delayed, stale, and unavailable states at phone/tablet/desktop widths. Confirm exact frame CSP, bounded same-origin thumbnail behavior, platform switching, reduced motion, no overflow, and no application console errors.
9. Keep Wix as production until content, commerce, legal, redirects, analytics, and cutover acceptance are complete.

## Domain hold

**DO NOT ATTACH `thirdrailify.com` OR `admin.thirdrailify.com` YET.**

Do not change GoDaddy, DNS, nameservers, Wix bindings, redirects, or either custom domain during staging.

Official references: [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [build image and Node version selection](https://developers.cloudflare.com/pages/configuration/build-image/), [serving SPAs](https://developers.cloudflare.com/pages/configuration/serving-pages/), and [custom headers](https://developers.cloudflare.com/pages/configuration/headers/).
