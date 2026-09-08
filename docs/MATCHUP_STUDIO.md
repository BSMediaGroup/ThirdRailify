# Season Roadmaps

Current/pending version: 0.1.0-alpha.0. Public read-only routes are `/polls/abootnothing/brackets` and `/:slug`, with a Roadmaps shelf at `/polls/abootnothing`. Existing Poll detail/editor/popout and `/abootnothing` alias remain intact.

`functions/api/brackets/[[path]].js` relays GET requests to Admin. No bracket mutation, database, R2 binding, Bot access or creator privilege is exposed. Only the active published revision is readable. Private planning notes/alternates and hidden Poll counts/links are excluded by Admin's projection. Unpublish revokes roadmap and image access; all responses use no-store. A single visibility-aware coordinator refreshes each roadmap every 15 seconds.

`src/brackets/{BracketCanvas,Lightbox,types,status,model,brackets.css}` share the safe renderer contract with Admin. `Roadmaps.tsx` contains Public gallery/detail/shelf; privileged Studio editor code is absent. The canvas supports explicit rounds, readable score/status cards, manually labelled history, winner paths, eligible Poll links, focus/find, zoom, pan, fullscreen and printing. Small viewports use round tabs. A champion is presented only when Admin reports valid finality. Ties, empty/unsettled Polls and source reviews cannot receive a false Poll-winner badge.

Admin owns the additive 0043 migration and protected backup, Poll linkage and credit-settlement checks, audit/corrections, publication and media retention. Its `docs/MATCHUP_STUDIO.md` is the authority/runbook. Release order is schema, Admin/API, then Public. Bot/media-worker require no changes for bracket delivery; existing Poll image clones use the established media contract.

Release validation uses Node 22.16.0, `npm.cmd run build`, maintained-source lint, Pages Functions compilation, existing Poll API/browser/media/history regressions, and Admin's connected `tests/brackets-browser.test.mjs` against the actual Public build/relay. Evidence is in paired `.artifacts/matchup-studio/` directories. Desktop/mobile source screenshots are local evidence only; stable-domain acceptance and deployment IDs are recorded separately in the release manifest and root bump notes.

## Production release - 2026-09-08

- Admin deployed commit `9dd9c44b894d64ce0863788227e6a9c11f4d1d21`, Pages `4083ee10-78d3-4371-bfb6-43d719f1f85a`.
- Public deployed commit `738a24e26d042b46798b152551dfae905b7f1d0c`, Pages `6861272d-8ad3-49a3-a515-1931b4cc2c0c` (supersedes initial roadmap deployment c0cb1cfd after route metadata correction).
- Stable JS/CSS bytes match the built artifacts on both domains. Admin `/api/admin/brackets` denies anonymous access with JSON 401. Both public `/api/brackets` endpoints return JSON 200 with an empty library, and unpublished/unknown detail returns JSON 404.
- Exact migration `0043_aboot_matchup_studio.sql` applied at 2026-09-08 08:54:27 UTC. Protected full backup: `X:\GIT\_BACKUPS\ThirdRailify\matchup-studio-20260908\commerce-before.sql`, 5,073,599 bytes, SHA256 `54BEB66AD9824BD1F24E930E91F9579AD17548663D7C05E2B707F84AC8547004`.
- Final focused authentication/bracket tests: 13/13. Connected Studio browser test: pass. Existing Poll/Bot-evidence/artwork/reconciliation browser test: pass against isolated release builds. Turnstile recovery browser test: pass (local fixture only, no production challenge bypass). Public Functions tests: 4/4. Earlier Poll/credits/media regression results retained in artifacts. Both production builds and Functions compilation pass. Admin lint clean; Public has two existing warnings and no errors.
- Viewed corrected local Admin desktop, publication dialog and Public mobile screenshots. Stable Public library desktop/mobile screenshots viewed; mobile scroll width equals viewport width 390px. Evidence under Admin `.artifacts/matchup-studio/live/`: `stable-roadmap-library-final.png`, `stable-roadmap-library-mobile-final.png`, `stable-anonymous.json`, `stable-assets.json`.
- Production state at 09:16 UTC: zero brackets, zero publications, six pre-existing Polls. No acceptance data was created. Bot unchanged; fresh heartbeat protocol 2, backlog 0, no fault. No provider or paid-voting enablement changes.
- LIVE AUTHENTICATED ACCEPTANCE IS INCOMPLETE. Existing browser tool briefly displayed a legitimate Master Admin session, then disconnected with `Transport closed`. The separate Playwright-launched Chrome failed verification; user confirmed normal Chrome works. No credentials/cookies/profile were extracted. Remaining: authenticated create/save/reload/link/advance/publication/republish/unpublish/archive sequence and its stable screenshots. Local tests do not substitute for these gates.
- Original shared worktrees remain unchanged by source edits. Their already-deployed Poll workspace/artwork and Public hero/SEO changes were preserved in the isolated release. No Bot source or process changes, no force push or main reset.

## 2026-09-08 - Matchup canvas and winner presentation repair

CURRENT VER=0.1.0-alpha.0

PENDING VER=0.1.0-alpha.0

- Fullscreen now uses the available viewport height; Fit view accounts for both dimensions. Measured SVG connectors follow actual source cards and destination opponent rows at every zoom.
- Admin Ideas bench collapses and keeps scrolling without a visible scrollbar. Match editing uses a native modal from each pencil button or double-click, including fullscreen. Focus finds and centres the contender, switches mobile rounds, and explains empty or unmatched searches. Studio library cards have full-card links and more generous typography/spacing.
- Confirmed winners have a trophy badge, gold feature row, and hover/keyboard glow, shimmer and sparkles. Reduced-motion preference keeps a static treatment. Existing result/review authority and publication privacy remain unchanged.
- Focused browser coverage verifies connector endpoints, fullscreen bottom reachability and Fit view, mobile Focus, modal editing with save/reload, bench collapse, full-card navigation, and winner animation/reduced motion. The connected local D1/R2 publication/Poll workflow also passes. These are local fixture results; authenticated stable-domain acceptance remains incomplete because the browser transport is unavailable.
- No schema migration, Bot action, live bracket mutation or provider/paid-voting change. Source is integrated with current main before release; deployment evidence is appended separately.

### Canvas production verification - 2026-09-08 10:13 UTC

- Application commits: Admin `e12bcab12f3f8da7e613b03b476b5deec290c3a4`; Public `15b63148879825126262a98cd1e3854784da435c`. Both were fast-forwarded into the original main checkouts and pushed. Current Overview/entrant work was preserved.
- Admin direct Pages deployment `f1c91ba3-0bd8-46bb-833c-05437058e0b0`; the main-triggered deployment `524037c2-dd4a-472b-8f62-4acb609e4954` serves the stable domain from the same commit. Public Pages `93559ffb-da2a-4793-a1fe-98b2d7b3486e` serves stable Public.
- Both stable domains' JS/CSS match their respective immutable deployment bytes. Winner feature, measured connectors and fullscreen CSS are present. Admin anonymous brackets API returns JSON 401; Public library JSON 200 with zero publications, unknown roadmap JSON 404; all use no-store. Evidence: Admin `.artifacts/matchup-studio/live/canvas-release-verified.json`.
- Both production builds/typechecks and scoped maintained-source lint pass. Both Pages Functions bundles compiled successfully during deployment. Final serial browser run: 2/2 suites pass. Viewed winner hover, full-height/Fit view, fullscreen editor and improved library screenshots. Current local evidence: Admin `.artifacts/matchup-studio/browser-1788862231273/` and `browser-1788862245242/`.
- No production Studio records were created or changed for this UI release. Authenticated stable-domain end-to-end acceptance remains incomplete; asset parity and local browser tests are not represented as that acceptance.

## 2026-09-08 - Partial-season editing, page scrolling and image sources

CURRENT VER=0.1.0-alpha.0

PENDING VER=0.1.0-alpha.0

- Removed the bracket-wide identity lock. Linked or decided matches protect their own inputs and all upstream matches; other branches can select existing ideas, type new contenders and rename unprotected contenders. Server comparisons preserve protected identities and tree topology, including attempted swaps across protected inputs. Finalization still protects the full graph.
- Outside fullscreen, the map grows vertically with the page and scrolls horizontally only, with a 3px scrollbar in Chromium and thin native fallback. Fullscreen retains bounded two-axis scrolling. Focus now scrolls the page vertically outside fullscreen. The desktop Ideas bench sticks below the Admin header and scrolls independently without a visible scrollbar.
- A discreet expand button opens the same Ideas/contender controls in a larger lightbox using the same working draft. The matchup modal supports each opponent's saved image upload, preview and removal.
- Both the bench and opponent editor accept an image URL as an alternative to file upload. Authenticated same-origin/CSRF-protected import downloads a bounded public HTTPS PNG/JPG/WebP, validates bytes and stores the existing private R2 asset. URLs cannot bypass publication/media ownership checks; redirects, credentialed/internal/IP URLs, non-images and oversized streams are rejected. No browser hotlinks or external credentials are persisted.
- Six focused tests pass: the connected canvas/editor/browser workflow, connected Poll/publication/privacy browser workflow, and four real-D1/model cases including partial-branch protections and URL import failures. Both production builds/typechecks and scoped lint pass. Desktop modal screenshots reviewed; evidence is in Admin `.artifacts/matchup-studio/browser-1788864815258/` and `browser-1788864837407/`. No production bracket mutation or authenticated production acceptance is claimed.
- No new files, schema migration, Bot action or provider/paid-voting change. Current main's manual-Poll count work is retained.
