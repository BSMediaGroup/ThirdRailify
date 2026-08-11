# Third Railify V2 public site

Production-oriented public website and storefront foundation for Third Railify. This repository is the future Wix replacement, but the current milestone is a staging scaffold: Wix remains production and no custom domain is attached.

## Current state

- Vite 5, React 18, TypeScript, and React Router.
- Substantial `/` landing page with a joined Shawn/Gina hero composition, Third Railify branding, current verified schedule copy, merch preview, and staged community/support surfaces.
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
npm run build
npm run preview
```

The production output is `dist/`.

## Route architecture

- Implemented: `/`, `/shop`, `/products/:slug`.
- Migration shells: `/watch`, `/shawn`, `/gina`, `/about`, `/friends`, `/community`, `/vip`, `/support`, `/gift-cards`, `/policies`, `/terms`, `/privacy`, `/refunds`, `/accessibility`.
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
│   ├── illustrations/      Joined editorial hero artwork
│   ├── logos/              Seeded Third Railify brand assets
│   ├── people/             Seeded host imagery
│   └── video/              Seeded media (not used as a decorative hero loop)
├── pocv1/                  Reference-only approved inspiration POC
├── public/
│   ├── _headers            Cloudflare static response policy
│   └── _redirects          Aliases and SPA fallback
├── src/
│   ├── components/         Shared shell, rail field, product and cart UI
│   ├── data/               Dated bounded Wix snapshot
│   ├── hooks/              Visibility/reduced-motion gate
│   ├── lib/                Replaceable catalogue provider boundary
│   ├── pages/              Public route implementations
│   ├── store/              Local-only cart state
│   ├── styles/             Tokens and responsive visual system
│   └── types/              Provider-neutral catalogue contracts
├── CLOUDFLARE_SETUP.md
├── LIVE_SITE_AUDIT.md
├── BUMP_NOTES.md
└── package.json
```

The display system uses the seeded American Captain asset at its real weight with lightly relaxed tracking for the primary header voice, with seeded Blinker and Geist Mono for readable body and technical roles.

## Data and provider boundaries

`src/types/catalogue.ts` is provider-neutral. `src/lib/catalogueProvider.ts` currently returns `src/data/wixSnapshot.ts` asynchronously so loading/error UI exists without coupling components to Wix. A future server/API adapter can replace that provider. Provider credentials and write operations must remain server-side; no provider environment names or APIs are invented here.

## Cloudflare and domain safety

See `CLOUDFLARE_SETUP.md` for the exact staging configuration. There is no Pages project or deployment claimed by this repository. Do not attach `thirdrailify.com` while Wix is production.
