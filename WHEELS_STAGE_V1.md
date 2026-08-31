# Wheels Stage V1.1

## Wheel Mechanics V2 Stage parity

Stage individual, Focus, and Spin All plans now freeze the same 1025-sample Mechanics V2 compiler result used by regular and Presentation Wheels. Spin All still reads one sanitized mechanics projection and shares its revision and scheduled start across all six plans; each Wheel retains its own secure winner, interior landing, duration, full turns, and target. Boundary sounds are derived from each tile's actual weighted-segment crossings with the existing square-root batch gain. Combined results still wait for every exact zero-speed settlement, and Official All authority/atomic persistence is unchanged.

## V1.13 canonical square Wheel geometry

Stage's deterministic layout helper remains the sole Overview diameter authority for one through six Wheels. Each tile now assigns that one diameter to both inline and block size; the previous independent `max-height: 100%` clamp and phone-only overflow clip were removed because they could turn the shared rotor/Canvas into a rectangle inside a short tile. Focus mode continues to resolve one scalar from its available broadcast surface and inherits the same square frame, 0.8759 face/outer ratio, 0.22 hub/outer ratio, square Canvas backing, and frame-owned ResizeObserver as regular and Presentation Wheels.

The existing 1, 2, 3, 4, 5, and 6-Wheel arrangements, centred 3+2 map, focus navigation, compact control rail, Stage Spin All, combined results, Fullscreen root, sounds, celebration, and Official authority remain unchanged. V1.13 browser evidence includes six-Wheel Overview, focused Stage, concurrent six-Wheel motion, Fullscreen combined results, desktop/ultrawide/tablet/phone layouts, and zero non-GET Wheel requests.

The complete Stage matrix passed on immutable preview deployment `41bdf876-c2ce-4ea9-a441-82ac891215e1` before the identical artifact was promoted as production deployment `f1845dff-806d-4529-a81a-9e2b945ebd6f`. Genuine four-Wheel `sample-stage` acceptance confirmed one mechanics projection, one revision, one shared start, exact settlement, zero Wheel API writes, and no application-owned console errors on both preview and stable production.

## V1.12 shared Stage mechanics snapshot

Practice/Demo All and Official All now resolve the global Public mechanics projection once per batch and snapshot the same mechanics revision, curve parameters, and start timestamp into every Wheel's local animation plan. Individual and focused Stage spins use the identical planner. A settings change during an active batch therefore affects only future spins; it cannot split the current six-Wheel presentation or change any authoritative result. Stage persistence, membership, Official atomicity, and result ownership are unchanged.

Stage Mode composes one to six existing Wheels without duplicating Wheel configuration, entrants, media authority, or official results. Public owns discovery and presentation; Admin and Commerce D1 remain the source of truth.

## V1.11 presentation polish

Stage overview retains the deterministic desktop map: 1 centred, 2 across, 3 across, 4 as 2×2, 5 as a centred 3+2, and 6 as 3×2. The geometric helper centres every partial row and still gives phone layouts one Wheel per row with a 70%-of-surface diameter cap (roughly 230–270px on current phone widths). The Overview-only details trigger now shows each Wheel owner's safe avatar in the existing compact footprint and opens the existing safe owner/access panel. Focused Stage deliberately keeps the information icon instead.

Focused Stage uses the broad Stage surface with a 286px desktop broadcast rail. Practice/Official is a 38px-high horizontal segmented selector, `SPIN WHEEL` is a 52px primary control, and Sound is a normal 38px icon-and-label utility. The Wheel receives the remaining main surface; the D-pad and all existing focus navigation remain intact. The top bar is a compact three-part grid with a content-sized Wheels exit, centred Stage/focus identity, and consistently sized Overview, Fullscreen, and authorized Edit Stage utilities. Tablet and phone breakpoints stack the focus surface deliberately without horizontal overflow.

## V1.1 Spin All

Overview adds one Stage-wide `SPIN ALL` coordinator. Anonymous viewers receive Demo All; authenticated creators/spinners default to Practice All and may choose Official All only when every active Stage Wheel independently grants Official authority and is unlocked/current. Practice/Demo preflights and creates every secure Web Crypto plan before motion, then writes nothing. Official All calls one signed Public-to-Admin operation; Admin re-resolves the Stage, ordered Wheels, permissions, revisions, locks, cooldowns, and active participant sets, server-selects every winner, and persists ordinary Wheel result/audit rows in one transactional D1 batch before returning animation plans. A secure batch key deterministically derives per-Wheel idempotency keys. A retry returns the same ordered result IDs, winners, and landing plans. No Stage result row or schema change exists.

All Wheels share one scheduled `performance.now()` start while retaining their individual configured durations. Individual spins remain exclusive; Spin All is the only state allowed to animate multiple tiles. Its coordinator moves through idle, preflight, spinning, settlement, combined-results, and error states; editing, focus navigation, D-pad controls, individual spins, and a second batch are disabled until it finishes. Each settled tile gets only a compact lock treatment—no modal, full celebration, or winner stinger.

After the final Wheel settles, a 350 ms beat opens one fullscreen-root combined modal in Stage order. Desktop uses up to three columns, tablet two, and mobile one bounded scrolling column. Each result is explicitly Demo/Practice not recorded or Official recorded. The existing celebration system is aggregated without Stage persistence: any enabled Wheel activates the master, each visual effect is enabled when any celebration-eligible Wheel enables it, and intensity is the highest of strong, normal, then subtle. Exactly the first Stage-ordered enabled winner preset plays once. Concurrent spin sounds retain their own presets at gain `1 / sqrt(N)`; Stage mute suppresses all. Reduced motion retains exact landing and the readable static modal/halo while removing travelling effects.

## Routes and capabilities

- `/wheels` mixes public Wheel and Stage cards.
- `/wheels/stages/new` creates a private-by-default Stage for an approved creator.
- `/wheels/stages/:slug` provides a responsive overview with exclusive individual spins or one coordinated Spin All batch.
- `/wheels/stages/:slug?focus=N` focuses a Wheel without putting a private Wheel identifier in the URL.
- `/wheels/stages/:slug/edit` explicitly saves, discards, exports, or archives.

Every Stage load reauthorizes every underlying Wheel. Public Stages accept only active Public Wheels. Private Stages can contain accessible private Wheels; owners and Master Admin see a truthful unavailable placeholder when access later disappears. Deleting or archiving a Stage does not alter any Wheel or official result.

## Responsive layout

`stageLayout.mjs` uses explicit editorial arrangements by count. Phones use one column, tablets at most two, and desktop/ultrawide preserves 1, 2, 3, 2×2, centred 3+2, and 3×2 for one through six Wheels. Focus navigation uses geometric neighbours from the selected layout.

Wheels alone use the dedicated widths defined across `wheels-stage.css` and `wheels-v111.css`: 1720px detail, 1920px Presentation, and a 3320px Stage ceiling with 94-97vw-style safe gutters. The detail composition no longer inherits `.container`; the normal Public `.container` remains 1240px.

## Import

Wheel of Names files with multiple `wheelConfigs` show every configuration before mutation. Creators choose individual Wheels or automatic Stages; Stage groups split at six. Allowance preflight happens before writes, and sequential creation reports recoverable partial progress.

See `WHEELS_STAGE_FILE_FORMAT.md` for `.tws` portability.

`.tws` remains composition-only. Spin mode, winners, result IDs, landing plans, and coordinator state are transient and are never exported.
