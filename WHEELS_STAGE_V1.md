# Wheels Stage V1.1

Stage Mode composes one to six existing Wheels without duplicating Wheel configuration, entrants, media authority, or official results. Public owns discovery and presentation; Admin and Commerce D1 remain the source of truth.

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

`stageLayout.mjs` scores balanced arrangements by usable Wheel diameter. Phones use one column, tablets at most two, ordinary widescreen usually renders six as 3x2, and ultrawide screens may use four to six columns when that improves diameter. Focus navigation uses geometric neighbours from the selected layout.

Wheels alone use the dedicated widths defined in `wheels-stage.css`: 1720px detail, 1920px Presentation, and a 3320px Stage ceiling with 94-97vw-style safe gutters. The normal Public `.container` remains 1240px.

## Import

Wheel of Names files with multiple `wheelConfigs` show every configuration before mutation. Creators choose individual Wheels or automatic Stages; Stage groups split at six. Allowance preflight happens before writes, and sequential creation reports recoverable partial progress.

See `WHEELS_STAGE_FILE_FORMAT.md` for `.tws` portability.

`.tws` remains composition-only. Spin mode, winners, result IDs, landing plans, and coordinator state are transient and are never exported.
