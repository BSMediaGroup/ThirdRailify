# GOATS in the Wild V2

Public owns presentation and the same-origin browser boundary only. `ThirdRailify-Admin` owns the commerce D1 records, moderation, private email, media objects, email outbox, and all privileged state transitions.

## Routes

- `/goats` — approved/published search, URL-backed filters, bounded gallery pagination, an integrated MapLibre GL dark vector map with accessible DOM pins, automatic Leaflet raster recovery, and an exceptional all-engines-failed list fallback.
- `/goats/:slug` — approved/published editorial detail, product link, media viewer, authenticated reactions, and authenticated comments.
- `/goats/submit` — guest-capable four-step draft/upload/finalise flow.
- `/goatgate` — query- and hash-preserving client redirect to `/goats/submit`.

`/goats/submit` is declared before `/goats/:slug`. Product detail CTAs pass only the canonical product ID; Admin validates it again against the public authoritative catalogue.

## Public API boundary

All browser requests use `/api/goats/*`. Reads proxy fixed approved-only Admin projections. Submission and interaction writes require the exact Public origin and are signed server-to-server with `THIRDRAILIFY_COMMUNITY_API_SECRET`; authenticated writes additionally use the existing Public session and CSRF proof. Arbitrary proxy destinations are impossible. Uploads are capped at 10 MiB before forwarding and all upstream calls are time-bounded.

Configure the same `THIRDRAILIFY_COMMUNITY_API_SECRET` as an encrypted Pages secret in Public and Admin. It must never be a `VITE_` variable. The normal map uses pinned MapLibre GL 6.6.0 with OpenFreeMap's dark vector style and current planet tiles. Its module worker is bundled through Vite's `?worker&url` pipeline into one self-contained fingerprinted asset, set explicitly before map construction, and allowed by the existing same-origin/blob worker policy. This avoids both the development sibling-worker 404 and the production-only missing shared-module failure caused by treating the worker entry as a plain URL asset. Pinned Leaflet 1.9.4 and OpenFreeMap Natural Earth raster tiles remain an automatic secondary engine only when WebGL, the vector style, or the verified vector source fails. Both engines use the existing compact `goatpin.svg`, required OpenFreeMap/OpenMapTiles/OpenStreetMap attribution, bounded geography, disabled world wrapping, responsive sizing, and deterministic React cleanup. No iframe, GitHub runtime, Wix messaging, Mapbox token, API key, or build-time style variable is involved; the legacy `VITE_GOATS_MAP_STYLE_URL` Wrangler value is not consumed.

The map root exposes non-sensitive acceptance state: `data-goats-map-state`, `data-goats-map-engine`, `data-goats-map-feature-count`, `data-goats-map-tile-count`, `data-goats-map-source-feature-count`, and `data-goats-map-expanded`. MapLibre reaches `ready` only after the GL instance and non-zero viewport exist, the same-origin worker is active, the live TileJSON exposes a tile template, a real vector probe returns non-empty success, OpenFreeMap tile events occur, rendered basemap features are queryable, and every valid approved feature has a DOM marker. Vector failure selects Leaflet once; Leaflet reaches `ready` only after a real raster tile succeeds and every marker exists. The location list is the final fallback only after both interactive engines fail, with no arbitrary map-success timeout or retry loop.

Each direct SVG marker opens a dark, keyboard-reachable approved-listing card containing safe text-created DOM, optional approved imagery, one small rectangular SVG country flag beside its approximate location, excerpt, and a first-party detail link. The same rectangular flags also prefix the selected panel, gallery cards, detail identity, and shared-point/fallback selectors; avatar styles are scoped to profile images so flags cannot become circular. The animated hero diagram deliberately keeps only the `SYD`/`YYZ` airport codes and no flags. The same marker/list selection contract remains authoritative. The active engine can expand in place into a modal-scale viewport without constructing a second map: body scrolling is locked, Escape and the visible close control restore the embedded state, and the instance is resized/recentered so live geography, in-bounds cards, pan/zoom, attribution, and selection remain intact.

The hero's ambient background sheen is a blurred translating linear field rather than a rotating conic beam, keeping the same restrained motion while ensuring no moving angular seam, kink, or converging wedge crosses the content area. Reduced-motion preferences disable this animation with the rest of the hero motion system.

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
