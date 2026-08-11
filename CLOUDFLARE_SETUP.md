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

Cloudflare's current Pages documentation lists `npm run build` and `dist` for React/Vite, treats an unspecified root as the repository root, and supports `.node-version` for selecting Node. The build copies `public/_headers` and `public/_redirects` into `dist/`.

## Environment names

No application runtime environment variables are currently required or optional. The catalogue is a local, dated snapshot and there are no Pages Functions. Do not copy the repository's local `.env` into Cloudflare and do not expose provider credentials as `VITE_*` values.

`NODE_VERSION` does not need to be added in the dashboard because `.node-version` already pins it. If dashboard policy requires an explicit build variable, use the same name/value and keep the file and dashboard synchronized.

## Staging verification

1. Before connecting Git, run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build` locally.
2. Connect the repository with the values above and allow only a `pages.dev` staging URL.
3. Confirm `/`, `/shop`, a known `/products/:slug`, a migration shell, a preserved alias, and an unknown route on the deployed preview.
4. Confirm `/_redirects` provides direct-load SPA behavior and `/store` redirects to `/shop`.
5. Confirm static responses include `X-Robots-Tag: noindex, nofollow, noarchive` plus the checked-in security headers.
6. Check phone, tablet, and desktop widths; search/filter/sort; the local cart disclaimer; assets; keyboard focus; reduced motion; overflow; and browser console/network errors.
7. Keep Wix as production until content, commerce, legal, redirects, analytics, and cutover acceptance are complete.

## Domain hold

**DO NOT ATTACH `thirdrailify.com` OR `admin.thirdrailify.com` YET.**

Do not change GoDaddy, DNS, nameservers, Wix bindings, redirects, or either custom domain during staging.

Official references: [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [build image and Node version selection](https://developers.cloudflare.com/pages/configuration/build-image/), [serving SPAs](https://developers.cloudflare.com/pages/configuration/serving-pages/), and [custom headers](https://developers.cloudflare.com/pages/configuration/headers/).
