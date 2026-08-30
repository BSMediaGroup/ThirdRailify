# Wheels Stage V1

Stage Mode composes one to six existing Wheels without duplicating Wheel configuration, entrants, media authority, or official results. Public owns discovery and presentation; Admin and Commerce D1 remain the source of truth.

## Routes and capabilities

- `/wheels` mixes public Wheel and Stage cards.
- `/wheels/stages/new` creates a private-by-default Stage for an approved creator.
- `/wheels/stages/:slug` provides a responsive overview with one active spin at a time.
- `/wheels/stages/:slug?focus=N` focuses a Wheel without putting a private Wheel identifier in the URL.
- `/wheels/stages/:slug/edit` explicitly saves, discards, exports, or archives.

Every Stage load reauthorizes every underlying Wheel. Public Stages accept only active Public Wheels. Private Stages can contain accessible private Wheels; owners and Master Admin see a truthful unavailable placeholder when access later disappears. Deleting or archiving a Stage does not alter any Wheel or official result.

## Responsive layout

`stageLayout.mjs` scores balanced arrangements by usable Wheel diameter. Phones use one column, tablets at most two, ordinary widescreen usually renders six as 3x2, and ultrawide screens may use four to six columns when that improves diameter. Focus navigation uses geometric neighbours from the selected layout.

Wheels alone use the dedicated widths defined in `wheels-stage.css`: 1720px detail, 1920px Presentation, and a 3320px Stage ceiling with 94-97vw-style safe gutters. The normal Public `.container` remains 1240px.

## Import

Wheel of Names files with multiple `wheelConfigs` show every configuration before mutation. Creators choose individual Wheels or automatic Stages; Stage groups split at six. Allowance preflight happens before writes, and sequential creation reports recoverable partial progress.

See `WHEELS_STAGE_FILE_FORMAT.md` for `.tws` portability.
