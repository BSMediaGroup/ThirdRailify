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

Cloudflare's current Pages documentation lists `npm run build` and `dist` for React/Vite, treats an unspecified root as the repository root, and supports `.node-version` for selecting Node. The build copies `public/_headers`, `public/_redirects`, and `public/_routes.json` into `dist/`. The routes file includes only `/api/community/*`, so ordinary static and SPA requests do not unnecessarily invoke Functions.

## Environment names

The catalogue remains a local dated snapshot. The community Pages Functions add one server-only encrypted secret and one KV binding; neither is a browser/Vite variable:

| Name | Type | Purpose |
| --- | --- | --- |
| `THIRDRAILIFY_COMMUNITY_KV` | Workers KV binding | Stores the latest validated community record at `discord:community:snapshot:v1` |
| `THIRDRAILIFY_COMMUNITY_INGEST_SECRET` | Encrypted Pages secret | Verifies bot HMAC signatures at ingest |

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

The local machine makes outbound HTTPS requests only. Do not port-forward, tunnel, or expose an inbound bot endpoint. The staging `pages.dev` URL may be used initially; do not attach a custom domain.

The public GET freshness contract is fresh under 180 seconds, delayed from 180 through 599 seconds, and stale at 600 seconds or later. Stale data retains last-published channel/profile details but member presence is neutralized. Missing KV data returns a truthful unavailable response, allowing the React client to use Discord's basic public-widget fallback.

## Staging verification

1. Before connecting Git, run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:functions`, and `npm run build` locally.
2. Connect the repository with the values above and allow only a `pages.dev` staging URL.
3. Confirm `/`, `/shop`, a known `/products/:slug`, a migration shell, a preserved alias, and an unknown route on the deployed preview.
4. Confirm `/_redirects` provides direct-load SPA behavior, `/store` redirects to `/shop`, and `_routes.json` invokes Functions only for `/api/community/*`.
5. Confirm static responses include `X-Robots-Tag: noindex, nofollow, noarchive` plus the checked-in security headers.
6. With local test secrets only, validate good/bad/expired HMAC, wrong guild/schema, oversized bodies, normalized persistence, missing/fresh/delayed/stale GET, and no-store responses. Never use or print the production secret during local validation.
7. Check enriched, basic fallback, and unavailable widget modes at phone, tablet, and desktop widths, including profile focus/tap/Escape/outside close, 12/24 member bounds, long text, reduced motion, overflow, and console/network errors.
8. Keep Wix as production until content, commerce, legal, redirects, analytics, and cutover acceptance are complete.

## Domain hold

**DO NOT ATTACH `thirdrailify.com` OR `admin.thirdrailify.com` YET.**

Do not change GoDaddy, DNS, nameservers, Wix bindings, redirects, or either custom domain during staging.

Official references: [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [build image and Node version selection](https://developers.cloudflare.com/pages/configuration/build-image/), [serving SPAs](https://developers.cloudflare.com/pages/configuration/serving-pages/), and [custom headers](https://developers.cloudflare.com/pages/configuration/headers/).
