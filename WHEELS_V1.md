# Third Railify Wheels V1.1

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

For an existing wheel, `/wheels/:slug/edit` is a route-driven lightbox state over the same mounted `WheelPage`, not a separate page presentation. Direct navigation and reload reconstruct the public wheel before opening the authorized editor; browser Back closes the editor; clean close returns to the base wheel URL; and unauthorized accounts receive a truthful access dialog with no draft fields. `/wheels/new` remains the dedicated unsaved creation route.

V1.3 adds a sibling Import / Export dialog for owner/editor/Master users and an import-only entry point on `/wheels/new`. The versioned `thirdrailify-wheel` v1 `.twl` format is UTF-8 JSON with the real creator-editable config names, ordered portable entries, optional embedded media, and a deterministic SHA-256 corruption-detection hash. `.json` download/copy uses the same document. Content detection also accepts bounded Wheel of Names and intentionally narrow generic participant JSON. Every import shows a selectable preview and field-level conversion report, mints fresh local entry IDs, and remains unsaved editor state until the existing Save/Create action. See `WHEELS_FILE_FORMAT.md` and `/schemas/thirdrailify-wheel-v1.schema.json`.

## Demo and official draws

Demo/practice selection is entirely local. `crypto.getRandomValues()` feeds unbiased rejection sampling over the sum of positive integer weights. It performs no Function request and creates no result or audit row. The result is labelled `Demo result — not recorded as an official draw`.

Official selection occurs only in Admin. The browser submits wheel slug, expected revision, and a unique idempotency key—never a winner. Admin loads active entries, rejects invalid/locked/archived/stale/unauthorized requests, selects with Web Crypto rejection sampling, hashes a canonical ordered participant snapshot with SHA-256, and inserts an immutable result. A compare-and-swap on wheel revision plus `spin_sequence` serializes competing draws. `(wheel_id, idempotency_key)` prevents duplicate results. The response drives a deterministic visual stop; closing the browser cannot undo the already-persisted result.

Voiding is a Master-only Admin annotation. The winner ID, winner label/weight snapshots, wheel revision, snapshot hash, performer, idempotency key, and original timestamp are never destructively changed.

## Renderer, editing, and accessibility

The in-house renderer uses one high-DPI Canvas for static weighted segments and a CSS transform for motion. It redraws only for data/size changes, uses no permanent animation loop, caps device pixel ratio, abbreviates dense labels, and keeps the full participant list in semantic HTML. The tested authority limit is 1,000 entries; label readability intentionally reduces as density rises.

The editor supports quick add, newline/CSV-like bulk input, search, A–Z sort, reverse, Web Crypto shuffle, ordering, duplicate labels with distinct IDs, hide/unhide, weights, colours, and confirmed clear/remove-all actions. It provides four in-house presets, validated palette/pointer colours, background and label treatments, 2–20 second duration, independent generated tick/stinger toggles, celebration intensity, winner message template, and public-history visibility. No arbitrary CSS, remote images, uploaded media, or uploaded sound exists in V1.

V1.2 separates existing-wheel control into two in-context, revision-protected dialogs. The general editor owns identity, visibility, lifecycle, spin/result settings, preview, and the sibling Appearance handoff. The participant manager owns quick/bulk add, search/sort/order, secure shuffle, reverse, hide/unhide, remove/confirmed clear, weights, colours, duplicates, the 1,000-entry bound, and explicit Save/Discard. Dirty close, Escape, browser navigation, and unload do not silently discard; failed/conflicting saves retain the local draft. Only one editor/manager modal is active at a time, with focus trap/restoration, body scroll lock, internal scrolling, and reachable mobile actions.

The weighted `entryAngles` geometry now also resolves the fixed top-pointer target and rotation-aware Canvas hit testing. A finite RAF sampler exists only while the CSS spin transition is active; React is notified only when the immutable target entry ID changes. The compact pointer HUD is visual-only during rapid motion and does not spam a live region. Canvas clicks ignore the medallion and exterior and are disabled while spinning; every semantic participant-row button remains a complete keyboard path to the same persistent details surface.

Participant details contain only the public entry label, colour, eligibility, entry weight, total active weight, segment share, eligible count, and current configured probability. Probability is `entry weight / total active weight`; hidden entries contribute neither weight nor count. Duplicate exact labels remain separate immutable entries and additionally show their combined active weight/probability. Adaptive formatting never renders a positive chance as `0%`, and no historical, account, provider, donation, or personal metadata is inferred.

The winner dialog traps and restores focus, closes with Escape, announces one settled result through a live region, and offers authorized post-result keep/hide/remove actions without altering history. Reduced motion skips rotation/confetti and shows a static result. Presentation mode keeps the same demo/official distinction.

## Data and retention

Public wheel labels, weights, and colours are public content. The editor warns against email addresses, payment details, street addresses, donation values, and other sensitive information. Browser account IDs, grants, audit metadata, private Admin state, and the shared secret are never included in public projections. Wheels adds no browser storage or consent category.

Active/draft/archived wheel rows and entries remain until an authorized lifecycle action. Master Admin may hard-delete only a wheel with zero official history. Official results and their audit context are retained as immutable operational evidence; a void preserves the original result.

## Staging fixture and deferred work

The additive migration creates zero wheels and zero results. Admin includes an explicit, idempotent staging-only `DEMO-WHEEL-01` seed with eight synthetic `Demo GOAT` labels and an exact cleanup script. It may be applied only when remote wheel count is zero and visual acceptance requires it; it is never run from migration or startup.

## V1.1 appearance and celebration

The main action is **SPIN WHEEL**. Practice/Official is a compact segmented control; sound, Appearance, presentation, sharing, editing, and back navigation remain secondary. The Canvas segment renderer is unchanged, while CSS/DOM layers provide the industrial rim, tick marks, pointer energy, bounded travelling light, spin pulse, and winner burst. Reduced motion retains a clear static active/result state without travelling effects.

Each validated config contains an in-house palette, optional per-entry `#RRGGBB` overrides, background focal/opacity/overlay values, and separate celebration, confetti, lighting, winner-music, and intensity settings. The result is always shown even when celebration is disabled. Winner audio is Web Audio-generated, unlocks only from the spin/sound user gesture, never loops, and is cleaned on result replacement or route exit.

The owner/editor Appearance dialog previews Theme, Background, Centre, and Celebration changes before explicit save. Background and centre files are normalized client-side where practical, but Admin remains the verifier and storage authority. The default medallion renders local `assets/icons/trzap-0.svg` in gold with no redundant `TR` text.

V1.2 centralizes the Wheels brand mark in `WheelsBrandMark.tsx`. It safely inlines the exact path from local `assets/icons/trzap-0.svg` with a crisp warm-gold-to-amber SVG gradient. The landing hero, wheel/card motifs, loading/empty/editor gates, default wheel medallion, and winner result use this component; placeholder lightning/squiggle/star glyphs are not used for those brand positions. Reduced motion leaves the mark static and visible.

## Custom wheel media

Public has no R2 binding. Upload/remove uses the same-origin Public route, authenticated session, exact origin, CSRF, bounded raw body, and a signed server-to-server Admin request. Admin revalidates owner/editor or Master access, edit locks, media rate limits, magic/content type, byte size, dimensions/pixel count, and purpose. Accepted sources are PNG, JPG/JPEG, BMP, WebP, and strictly screened SVG. Script, event handlers, `foreignObject`, external resources, unsafe URLs/data, DTD/entity content, excessive size, and excessive complexity are rejected.

Portable media is opt-in and off by default. Export fetches only the current authorized same-origin wheel-media projection and embeds raw base64 plus MIME, safe filename and SHA-256; it never embeds the media URL or R2 authority. Imported media is decoded and screened locally for preview but stays in memory and makes no upload request until explicit Save, when the unchanged authorized media route revalidates it. Background, centre, combined-media and whole-file bounds are 8 MB, 4 MB, 12 MB and 18 MB respectively.

Admin migration `0016_wheels_media.sql` stores asset ID, wheel/purpose, opaque R2 key, SHA-256, normalized MIME, bytes, dimensions, lifecycle, uploader, and timestamps. Only one active asset exists per wheel/purpose. Public projections contain an asset ID and same-origin URL, never an R2 key. Public active-wheel media is immutable-cacheable; hidden media requires an assigned account/Admin and otherwise returns 404. Replacement/removal deletes the R2 object and retains bounded lifecycle/audit metadata. SVG delivery adds `nosniff`, same-origin resource policy, and a sandboxed deny-by-default CSP.

Deferred: multi-wheel display/spin, Sheets/chat/raid/donation ingestion, Rumble/Twitch/YouTube integration, payments and prize fulfilment, public external API, profile/sound uploads, Wheel of Names export, remote OBS control/websockets, cloning/marketplace, and provider writes.

## V1.4 staging release

Wheels V1.4 is deployed Admin-first as `d079d3f0` (`https://d079d3f0.thirdrailify-admin.pages.dev`) and Public as `38f5077f` (`https://38f5077f.thirdrailify.pages.dev`). Stable and immutable aliases serve the new hashed assets. Stable V1.1-V1.4 browser acceptance covers the primary anonymous creator-access CTA, aligned Explore action, complete rail border, public detail and protected edit, local-only demo spin, bounded 96-particle normal celebration, layered lighting, close cleanup, reduced-motion zero-confetti state, no overflow, clean console, and zero mutation requests. Authorized editor actions remain locally fixture-tested because the remote account boundary was not bypassed.

## V1.4 visual system

Wheels creator, transfer, modal, hero, and winner actions consume the existing Public `.button` primitive with semantic primary, secondary, ghost, compact, text, danger, and danger-outline variants. The gold action is reserved for the next explicit create/save step; navigation and utility controls remain dark; destructive result actions distinguish reversible entry removal from the stronger remove-all action. The `/wheels/new` action group and modal footers retain equal control heights and deliberate responsive wrapping without changing access checks or persistence.

The route-driven editor backdrop is a true `position: fixed; inset: 0` viewport layer with safe padding, bounded `dvh` height, internal scrolling, and centred placement. It no longer aligns the editor to the page grid's right edge. The landing hero has a primary gold Build action, aligned secondary exploration action, and a complete bottom border on the Public / Approved / Official information rail.

Winner celebration remains finite and dependency-free. Subtle, normal, and strong modes cap their deterministic DOM population at 44, 96, and 148 particles with mixed strips, rectangles, diamonds, upper-stage fall, and side-cannon arcs. Warm bloom, gold/crimson/violet fans, voltage passes, and a decaying rim remain visual-only and are removed with the result portal. Reduced motion creates no confetti and no travelling beams; it retains only a static branded halo and the immediately interactive result dialog.

## Staging acceptance — 29 August 2026

Admin deployment `afd9db50` and Public deployment `511d5421` are live on their existing Pages staging projects. The authoritative Commerce D1 was exported before change; additive media migration `0016` is applied, empty, and ledgered while unrelated checkout migration `0015` remains intentionally pending. Stable browser acceptance verifies the idle/spinning/winner/presentation stages, Community dropdown without a header chevron, VIP surfaces, generated audio unlock/notes/cleanup, and clean console. Synthetic background/centre previews and R2 lifecycle/security are locally tested; no remote media object was created because no authenticated owner/editor session was available, and bypassing that boundary is prohibited.

Wheels V1.2 Public deployment `ce4d7c7b-9803-4ecd-a261-5f71b3de62f3` is live at `https://ce4d7c7b.thirdrailify.pages.dev` and the stable staging alias. Stable and immutable reference `index-CHBvZ_x_.js`. Remote browser acceptance verifies the exact local zap treatment, delayed loading splash, pointer HUD, list/Canvas participant details, the authoritative staging probability of 18.18% for weight 2 of total active weight 11, protected unauthenticated editor deep-link treatment over the mounted wheel, demo winner/audio cleanup, responsive presentation at 1920x1080, 1280x720, and 390x844, one-line Exit/Fullscreen icon-label alignment, no overflow, no stable page-origin console errors, and no non-read `/api/` request during the V1.2 inspection. Authorized editor and participant-manager writes remain locally fixture-tested because no authenticated remote creator session was available and the access boundary was not bypassed.

## V1.5 modal containment and label contrast

The twelve intentional wheel-rim marker nodes previously used a fixed `translateY(-333px)` radius sized for the full 700 px stage. Compact editor and Appearance previews kept that radius after the wheel shrank, so the markers escaped their rim into form whitespace and expanded modal scroll geometry. V1.5 replaces the fixed-radius transform with percentage-positioned markers inside a dedicated clipped, non-interactive, `aria-hidden` rim. Desktop rim lights remain intentional stage geometry; smaller breakpoints may omit them, and no marker can contribute an out-of-rim box or random dialog dot.

Wheel segment labels now detect only near-white slice colours and use dark ink with a restrained light shadow there. Gold, crimson, violet, and other darker slices retain the established light label treatment.

Wheel Editor, Appearance, Participant Manager, Import / Export, and participant details use bounded surfaces with fixed header/tab/footer regions and `min-width: 0`, vertical-only content scrollers. Flexible grids use `minmax(0, 1fr)`, form controls are bounded to their columns, participant rows collapse before tablet widths, long import/conversion content wraps, and retained decoration is clipped within its visual component. The V1.5 browser helper asserts `scrollWidth <= clientWidth + 1`, checks major child bounds, verifies rim containment, and covers editor and Appearance at 1920x1080, 1440x900, 1024x768, 768x1024, and 390x844; participants and transfer at 1440x900, 768x1024, and 390x844; wheel detail, participant details, presentation, landing, and new-wheel surfaces at their supported desktop/mobile matrices.

The Public-only V1.5 production deployment is `23f28c9f-5d9c-4951-84bf-8dc714afc1c5` (`https://23f28c9f.thirdrailify.pages.dev`); stable `https://thirdrailify.pages.dev` serves the same `index-D0wMdmNW.js` and `index-cFREmwti.css` entry assets. Stable routes and deployed V1.1-V1.5 browser suites pass with no official spin or API mutation. Anonymous remote acceptance verifies the cleaned public wheel, participant details, presentation, protected editor boundary, responsive containment, and white-slice labels. Authenticated editor/Appearance/participant/transfer proof remains the local production-build fixture matrix because no reusable remote creator session was available and the account boundary was not bypassed.
