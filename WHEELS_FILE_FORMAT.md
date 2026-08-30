# Third Railify portable wheel files

## Format and compatibility

Third Railify `.twl` files are canonical UTF-8 JSON with MIME type `application/vnd.thirdrailify.wheel+json`. Current exports use `format: "thirdrailify-wheel"`, `formatVersion: 2`, and `/schemas/thirdrailify-wheel-v2.schema.json`. The v1 schema remains at `/schemas/thirdrailify-wheel-v1.schema.json`, and the importer continues to normalize valid v1 files. V2 is explicit because v1 rejects unknown fields and therefore could not faithfully carry segment styles, segment-image logical references, or sound preset IDs.

The document contains `exportedAt`, bounded generator/source metadata, one `wheel` payload, and a SHA-256 digest of the deterministically key-sorted normalized wheel payload. The digest detects corruption; it is not a signature or author claim.

## Creator-editable model

`wheel.settings` retains the existing palette and display controls and adds:

- `paletteStyles`: one style per palette colour;
- `spinSoundPreset`: `classic-tick`, `relay-click`, `arc-pulse`, `mechanical-ratchet`, `soft-tick`, or `silent`;
- `winnerSoundPreset`: `gold-rise`, `broadcast-hit`, `voltage-chime`, `crimson-impact`, `synth-fanfare`, `short-burst`, or `silent`.

A style is exactly one of:

```json
{ "mode": "solid", "color": "#B8182F" }
{ "mode": "pattern", "color": "#B8182F", "pattern": "zigzag", "patternColor": "#FF8EA0" }
{ "mode": "image", "color": "#B8182F", "imageAssetRef": "segment-0123456789abcdef" }
```

Pattern IDs are `diagonal-stripes`, `reverse-stripes`, `zigzag`, `dots`, `checkers`, `triangles`, `chevrons`, `waves`, and `third-rail-bolts`. Entries carry optional complete `style` metadata in addition to the legacy nullable `color`. On v1 import, missing styles normalize from palette/entry colours as solid and missing sound presets normalize to Classic Tick and Gold Rise.

Import is deliberately more tolerant than canonical save validation. Recoverable palette/style count drift is normalized in browser memory before preview: legacy colours synthesize matching solid styles, missing styles are filled, extra styles are ignored, and a valid richer style colour becomes the parallel palette colour. Unsupported pattern metadata or unavailable image references fall back to their safe solid colour and are reported in the conversion log. A missing usable palette falls back to Third Rail Gold. The reviewer can keep the normalized imported palette (the default) or explicitly reset it to Third Rail Gold; neither choice writes until Create/Save. Canonical server validation remains strict.

## Media

Custom media is excluded by default. With **Include custom media** enabled, background, centre, and only referenced segment images are fetched through authorized same-origin `/api/wheels/media/:assetId` routes. The file embeds MIME, safe filename, SHA-256, and base64 bytes—never URLs, R2 keys, signed URLs, uploaders, account IDs, or server asset IDs.

Segment bytes are embedded once per logical `assetRef`; palette and participant styles reuse that reference. Segment exports accept PNG, JPEG, WebP, BMP, GIF, and screened SVG. The portable bounds mirror runtime safety: 20 segment assets, 2 MiB per segment payload, and 12 MiB combined embedded media, while Admin applies the stricter SVG/static/GIF format budgets. Import verifies magic/MIME, per-asset SHA-256, total bounds, and SVG safety before retaining media in browser memory. Save uploads segment assets first, replaces temporary logical references with newly returned same-wheel opaque IDs, then submits the ordinary revision-protected config/entries save.

## Authority deliberately excluded

Portable files cannot contain or control wheel/account owners, grants, roles, authoritative wheel or entry IDs, revisions, lifecycle locks, official results/history, snapshot hashes, audits, rate limits, R2 keys, signed URLs, sessions, CSRF, HMAC, secrets, or payment/provider state. Imports mint fresh entry IDs and never import official history.

## Other imports

Detection order is canonical Third Railify, Wheel of Names (`wheelConfigs`), then narrow generic participant JSON. Generic imports accept participant arrays or `entries`/`participants` arrays and retain current/default settings. Wheel of Names content maps bounded entries, colours, spin duration, sound presence, confetti, message, and screened embedded centre/background media. Proprietary sound names do not map one-for-one: presence selects the default generated Third Railify preset. Unsupported fields are reported rather than silently treated as authority.

Every import remains local editor state until Create/Save. Existing-wheel replacement requires explicit review. JSON uses `JSON.parse` only and rejects dangerous prototype keys, malformed UTF-8/Unicode, excessive depth/key/array/file bounds, invalid weights/colours/styles, unknown pattern/sound IDs, remote media, corrupt hashes, and unsupported future versions.
