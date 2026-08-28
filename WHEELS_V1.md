# Third Railify Wheels V1

## Product boundary

Wheels V1 is a bespoke Third Railify competition-wheel surface. Public owns `/wheels`, wheel detail, the approved creator editor, presentation mode, local demo selection, Canvas rendering, generated Web Audio, and the bounded celebration. It does not embed, call, or runtime-load Wheel of Names.

`ThirdRailify-Admin` is the sole persistence and authorization authority. Public has no `THIRDRAILIFY_COMMERCE_DB` binding. Browser requests use a same-origin Public Function; Public resolves the host-only session and CSRF proof, adds only the current server-resolved account ID, signs the bounded request with the existing encrypted server-to-server secret, and calls Admin. Admin verifies the HMAC window and revalidates the account, grant, assignment, locks, lifecycle, and revision before touching D1.

## Routes

- `/wheels`: public active/visible discovery, search, sort, and truthful empty state.
- `/wheels/new`: unsaved creation form for a Master Admin or globally approved creator. No row exists before explicit save.
- `/wheels/:slug`: public wheel, participant list, demo/practice mode, authorized official mode, and bounded official history.
- `/wheels/:slug/edit`: owner/editor/Master editor with explicit save/discard and optimistic revision checks.
- `/wheels/:slug/present`: minimal theatre view with Fullscreen API control and an accessible exit.
- `/wheel`: canonical redirect to `/wheels`.

Hidden wheels return a legitimate 404 to anonymous and unrelated accounts. Archived wheels retain history and reject official spins. Creator pages never expose access administration.

## Demo and official draws

Demo/practice selection is entirely local. `crypto.getRandomValues()` feeds unbiased rejection sampling over the sum of positive integer weights. It performs no Function request and creates no result or audit row. The result is labelled `Demo result — not recorded as an official draw`.

Official selection occurs only in Admin. The browser submits wheel slug, expected revision, and a unique idempotency key—never a winner. Admin loads active entries, rejects invalid/locked/archived/stale/unauthorized requests, selects with Web Crypto rejection sampling, hashes a canonical ordered participant snapshot with SHA-256, and inserts an immutable result. A compare-and-swap on wheel revision plus `spin_sequence` serializes competing draws. `(wheel_id, idempotency_key)` prevents duplicate results. The response drives a deterministic visual stop; closing the browser cannot undo the already-persisted result.

Voiding is a Master-only Admin annotation. The winner ID, winner label/weight snapshots, wheel revision, snapshot hash, performer, idempotency key, and original timestamp are never destructively changed.

## Renderer, editing, and accessibility

The in-house renderer uses one high-DPI Canvas for static weighted segments and a CSS transform for motion. It redraws only for data/size changes, uses no permanent animation loop, caps device pixel ratio, abbreviates dense labels, and keeps the full participant list in semantic HTML. The tested authority limit is 1,000 entries; label readability intentionally reduces as density rises.

The editor supports quick add, newline/CSV-like bulk input, search, A–Z sort, reverse, Web Crypto shuffle, ordering, duplicate labels with distinct IDs, hide/unhide, weights, colours, and confirmed clear/remove-all actions. It provides four in-house presets, validated palette/pointer colours, background and label treatments, 2–20 second duration, independent generated tick/stinger toggles, celebration intensity, winner message template, and public-history visibility. No arbitrary CSS, remote images, uploaded media, or uploaded sound exists in V1.

The winner dialog traps and restores focus, closes with Escape, announces one settled result through a live region, and offers authorized post-result keep/hide/remove actions without altering history. Reduced motion skips rotation/confetti and shows a static result. Presentation mode keeps the same demo/official distinction.

## Data and retention

Public wheel labels, weights, and colours are public content. The editor warns against email addresses, payment details, street addresses, donation values, and other sensitive information. Browser account IDs, grants, audit metadata, private Admin state, and the shared secret are never included in public projections. Wheels adds no browser storage or consent category.

Active/draft/archived wheel rows and entries remain until an authorized lifecycle action. Master Admin may hard-delete only a wheel with zero official history. Official results and their audit context are retained as immutable operational evidence; a void preserves the original result.

## Staging fixture and deferred work

The additive migration creates zero wheels and zero results. Admin includes an explicit, idempotent staging-only `DEMO-WHEEL-01` seed with eight synthetic `Demo GOAT` labels and an exact cleanup script. It may be applied only when remote wheel count is zero and visual acceptance requires it; it is never run from migration or startup.

Deferred: multi-wheel display/spin, Sheets/chat/raid/donation ingestion, Rumble/Twitch/YouTube integration, payments and prize fulfilment, public external API, image/profile/sound uploads, local `.wheel` files, remote OBS control/websockets, cloning/marketplace, and provider writes.

