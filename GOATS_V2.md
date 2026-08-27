# GOATS in the Wild V2

Public owns presentation and the same-origin browser boundary only. `ThirdRailify-Admin` owns the commerce D1 records, moderation, private email, media objects, email outbox, and all privileged state transitions.

## Routes

- `/goats` — approved/published search, URL-backed filters, bounded gallery pagination, MapLibre GeoJSON clusters, and accessible list fallback.
- `/goats/:slug` — approved/published editorial detail, product link, media viewer, authenticated reactions, and authenticated comments.
- `/goats/submit` — guest-capable four-step draft/upload/finalise flow.
- `/goatgate` — query- and hash-preserving client redirect to `/goats/submit`.

`/goats/submit` is declared before `/goats/:slug`. Product detail CTAs pass only the canonical product ID; Admin validates it again against the public authoritative catalogue.

## Public API boundary

All browser requests use `/api/goats/*`. Reads proxy fixed approved-only Admin projections. Submission and interaction writes require the exact Public origin and are signed server-to-server with `THIRDRAILIFY_COMMUNITY_API_SECRET`; authenticated writes additionally use the existing Public session and CSRF proof. Arbitrary proxy destinations are impossible. Uploads are capped at 10 MiB before forwarding and all upstream calls are time-bounded.

Configure the same `THIRDRAILIFY_COMMUNITY_API_SECRET` as an encrypted Pages secret in Public and Admin. It must never be a `VITE_` variable. The repository configures the non-secret `VITE_GOATS_MAP_STYLE_URL` Public build variable to use the OpenFreeMap dark style for staging/default builds. Environments may override that URL with another licensed MapLibre-compatible style; with it blank, the feature uses a basemap-free local/test style while pins and the list remain usable. No Mapbox token is embedded.

The form uses the existing Turnstile site key. Admin owns CAPTCHA verification and fails closed when its secret is absent. Browser image preparation applies EXIF orientation, constrains the display derivative to 2,400 px, and re-encodes it without metadata; Admin remains the security boundary and independently validates MIME, structure, size, and dimensions before private R2 storage.

## Data and migration posture

Production starts with zero V2 listings. The owner-supplied Wix export will be validated and imported later through the Admin contract; there is no Wix runtime dependency. Admin includes exactly two opt-in `DEMO-*` local/test fixtures plus an exact cleanup script. They are never part of a migration or automatic startup path.

Local gates:

```powershell
npm run test:goats
npm run typecheck
npm run lint
npm run build
```

No D1 migration, R2 write, provider configuration, email, Pages deployment, domain, DNS, or Wix operation is performed by these commands.
