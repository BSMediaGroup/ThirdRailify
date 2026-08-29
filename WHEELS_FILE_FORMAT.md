# Third Railify portable wheel files

## Format

Third Railify `.twl` files are human-readable UTF-8 JSON. Version 1 uses:

- format ID: `thirdrailify-wheel`
- format version: `1`
- MIME type: `application/vnd.thirdrailify.wheel+json`
- public schema: `/schemas/thirdrailify-wheel-v1.schema.json`

An ordinary `.json` export contains exactly the same canonical document. File extensions are usability hints only; import format detection uses parsed content.

## Canonical document

```json
{
  "format": "thirdrailify-wheel",
  "formatVersion": 1,
  "exportedAt": "2026-08-29T00:00:00.000Z",
  "generator": { "name": "Third Railify", "version": "0.1.0-alpha.0" },
  "source": { "slug": "informational-only" },
  "wheel": {
    "title": "Example draw",
    "description": "Portable creator content",
    "settings": { "themePreset": "third-rail-gold", "palette": ["#F3C928", "#B8182F"], "pointerAccent": "#F3C928", "centreTreatment": "bolt", "backgroundIntensity": "high", "labelContrast": "light", "spinDurationMs": 6500, "tickingSoundEnabled": true, "winnerSoundEnabled": true, "celebrationEnabled": true, "confettiEnabled": true, "winnerLightingEnabled": true, "celebrationIntensity": "normal", "backgroundEnabled": true, "backgroundFocalX": 50, "backgroundFocalY": 50, "backgroundImageOpacity": 72, "backgroundOverlayIntensity": 58, "winnerMessageTemplate": "Signal locked: {winner}", "publicHistoryVisible": true },
    "entries": [{ "label": "Alice", "weight": 1, "color": "#F3C928", "active": true, "order": 0 }],
    "media": { "background": null, "center": null }
  },
  "integrity": { "algorithm": "SHA-256", "wheelPayload": "lowercase-64-character-hex-digest" }
}
```

The digest is SHA-256 over the deterministically key-sorted, normalized `wheel` value. It detects accidental corruption or modification; it is not a signature and does not authenticate the author. Imports reject a present mismatched digest and clearly distinguish a verified digest from an absent one.

Entries have portable identity only: order, label, weight, colour and active state. Exports never contain authoritative entry IDs. Imports mint fresh browser-local IDs, and the Admin service remains free to mint or validate final IDs on Save.

## Authority deliberately excluded

Portable files cannot contain or control wheel/account owner IDs, grants, roles, permissions, Admin capabilities, authoritative wheel IDs or slugs, internal revisions, lifecycle locks, official result or spin history, participant snapshot hashes, audits, rate-limit state, R2 keys, signed media URLs, HMAC/CSRF/session values, secrets, or payment/provider data. The optional `source.slug` is informational and is never claimed on import.

## Media

Custom images are excluded by default. When the creator explicitly enables media export, the browser fetches only the wheel's existing authorized same-origin media route and embeds normalized MIME, safe filename, SHA-256 and raw base64 bytes—never a URL or `data:` URI. Supported types match the Wheels pipeline: PNG, JPEG, WebP, BMP and screened SVG. Bounds are 8 MB for background, 4 MB for centre and 12 MB combined; the whole JSON file is bounded at 18 MB.

Imported images stay in browser memory during preview. They are decoded, magic/MIME checked, SHA-256 checked, and unsafe/external SVG content is rejected. No upload occurs until the creator explicitly uses the existing Save action, which delegates to the existing authorized Wheels media endpoint for authoritative validation and replacement.

## Imports

Detection order is canonical Third Railify, Wheel of Names (`wheelConfigs` array), then intentionally narrow generic participant JSON. Supported generic shapes are:

- `['Alice', 'Bob']`
- `{ "entries": ['Alice', 'Bob'] }`
- `{ "participants": [{ "label": "Alice", "weight": 2, "color": "#FFCC00", "active": true }] }`
- `{ "entries": [{ "text": "Alice", "weight": 2, "color": "#FFCC00", "enabled": true }] }`

Generic entry labels use `label`, then `text`, then `name`; state uses `active`, then `enabled`, then inverse `hidden`. Conflicts appear in the conversion report. Generic JSON imports participants and a safe optional title/description only; current/default settings remain in place.

Wheel of Names conversion maps `entries[].text`, order, supported weight/colour/state variants, enabled `colorSettings`, `spinTime`, sound presence, confetti, winner animation/message, and bounded embedded centre/cover data URIs. Source IDs are discarded. Colours cycle across entries, or fall back to Third Rail Gold. `spinTime` is converted from seconds to `spinDurationMs` and clamped to 2–20 seconds. Named source sounds become only the existing enabled built-in tick/stinger state; no audio files or claimed sound equivalence are imported. Unsupported font, shadow, outline, gradient, hub, layout, picture and post-win behaviours are listed field-by-field rather than silently hidden. `shareMode`, permissions and official history never import.

If multiple `wheelConfigs` exist, the dialog lists every title/count and retains the parsed document while one configuration is selected and loaded at a time. There is no batch create transaction.

## Safety and compatibility

Version 1 rejects future or malformed versions, dangerous `__proto__`/`prototype`/`constructor` keys, malformed UTF-8/Unicode, more than 32 nesting levels, more than 20,000 keys, oversized arrays/strings/files/media, invalid colours/weights and unsupported executable content. JSON is parsed only with `JSON.parse`; no evaluation or dynamic module import occurs.

Importing into `/wheels/new` fills the unsaved creator form and leaves visibility to the existing choice. Replacing an existing editable wheel requires a second explicit confirmation and changes only local creator-editable draft content. Identity, authority, history and locks remain unchanged, and nothing is persisted until the ordinary Save action passes existing permission, revision and media checks.

Version dispatch is explicit. A future format must add a reviewed migration path; version 1 import never guesses how to interpret a future document.
