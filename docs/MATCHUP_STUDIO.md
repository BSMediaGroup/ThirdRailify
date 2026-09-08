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

- Deployed and verified 2026-09-08 10:57 UTC: Admin `225e01230218462a6628efbaf43cbc410baf2407`, direct Pages `3f5745fc-cde9-479e-9dcc-e2db8cee7d5c`, stable main build `fdd92690-fb25-42c3-99de-ceaf02b99098`; Public `e2cd9a56f3ff63bbbc75cb420c6d5fb09d7f40b9`, Pages `fed8d8f8-e7f3-4e18-b782-5c823207e83c`. Stable JS/CSS match immutable release bytes on both domains; new image URL/expanded bench controls and unclamped map styling are present. Both Functions bundles compile. Evidence: Admin `.artifacts/matchup-studio/live/scroll-images-release.json`. Original and remote main branches include the changes; existing manual-Poll work is preserved. No production bracket records were changed during verification.

## 2026-09-08 - Matchup state and score presentation

CURRENT VER=0.1.0-alpha.0

PENDING VER=0.1.0-alpha.0

- Admin and Public use the same presentation: matchups with unresolved inputs render at 70% opacity and return to full brightness on hover or keyboard focus. Filled matchups retain normal brightness; printing restores full opacity.
- A confirmed decision without a review flag adds a discreet green check before the header status and a subtle green header gradient. Undefined, undecided and needs-review matches do not receive a completion mark.
- The winner trophy is now a smaller 20x22px badge immediately before the score, with a 15px icon. Winner row styling and hover sparkles remain intact.
- Both frontend builds/typechecks and scoped lint pass. Admin browser coverage checks completion counts, trophy placement/size, dimming and keyboard/hover restoration. Public browser assertions verify the same states on the published projection; existing responsive, editing, image and publication checks are retained. No backend, schema or result-authority changes.

- Presentation deployed and verified on both stable domains at 2026-09-08 11:37 UTC: Admin `bdd3d1a3c2ecb7e89cfe245500ca4832d3803db2`, direct Pages `129efdc5-e048-409b-a335-9a7179d3b155`, stable main build `8104b325-21aa-4ba1-bf58-218db1e04b10`; Public `d70b18c4603e560fd5950152629d8f46db04a1b2`, Pages `96e21de3-6280-4a9a-9286-1ca0a8961524`. Both stable JS/CSS match immutable release artifacts, including completion checks, opacity and score-prefix trophy styling. Both browser suites pass, including explicit Public projection assertions. Viewed Admin and Public screenshots under Admin `.artifacts/matchup-studio/browser-1788867247451/` and `browser-1788867305660/`. Stable evidence: `.artifacts/matchup-studio/live/match-state-presentation-release.json`. No live bracket changes were made; authenticated production workflow acceptance remains separate.


Unconfigured match dimming (2026-09-08): increased the visible difference by lowering incomplete match opacity from 70% to 40% on Admin and Public. Hover, keyboard focus and print restore full opacity. Existing transition and reduced-motion behavior retained. CURRENT VER=0.1.0-alpha.0; PENDING VER=0.1.0-alpha.0. No new files or data changes.

Verified stronger dimming release at 2026-09-08 12:10 UTC: both frontend builds and both connected browser tests pass, including 40% opacity and full hover/focus restoration. Stable JS/CSS match immutable deployments: Admin `3d14bcf` / `3aa6fb82.thirdrailify-admin.pages.dev`; Public `242f9c7` / `356ae0a1.thirdrailify.pages.dev`. Evidence in Admin `.artifacts/matchup-studio/live/stronger-dimming-release.json`; viewed Admin screenshot `browser-1788869275301/winner-hover.png`. No production data changed.


## 2026-09-08 - Public Roadmaps gallery and short URL

CURRENT VER=0.1.0-alpha.0

PENDING VER=0.1.0-alpha.0

- Rebuilt the Roadmaps landing page with a full-width black/gold hero, bespoke bracket-to-trophy artwork, gated ambient motion, season navigation and a three-step footer rail matching the Polls/Aboot visual language.
- Added a searchable season grid with full-card links, cover artwork/fallback treatments and improved title/eyebrow spacing. Empty, loading, unavailable and no-search-match states have dedicated layouts; failed requests can be retried. The shared Aboot Roadmaps shelf uses the improved cards.
- `/abootnothing/roadmap` and its trailing-slash version permanently redirect to `/polls/abootnothing/brackets`; a React route also covers client-side navigation.
- Added `src/brackets/roadmap-gallery.css` and `tests/roadmap-gallery-browser.test.mjs`. Updated Roadmaps, App and existing redirect configuration; no backend, schema or private-draft publication changes.
- Build/typecheck and scoped lint pass. The new browser test covers empty/published collections at 390/768/1440, search, error/retry, whole-card navigation, keyboard focus, reduced motion and the client-side alias. Existing connected Admin/Public publication, bracket interaction and privacy browser coverage passes. Screenshots inspected in `.artifacts/roadmap-gallery-1788872401040/` (published desktop/mobile and empty desktop).

- Released and verified at 2026-09-08 13:02 UTC: Public commit `9a08cd0`, Pages `20337c94.thirdrailify.pages.dev`. Stable JS/CSS match immutable release hashes. Both short URL variants return HTTP 301 with Location `/polls/abootnothing/brackets`. Real public Chrome checks passed at 1440 and 390 with no horizontal overflow; stable screenshots and evidence in `.artifacts/roadmap-gallery-live/`. No user season was published or modified.


## 2026-09-08 - Match result presentation and violet completion headers

CURRENT VER=0.1.0-alpha.0

PENDING VER=0.1.0-alpha.0

- Completed match headers now use a violet gradient, inset highlight and purple sparkles on hover/focus in Admin and Public. Existing green checkmarks retain #6dc98d. Reduced-motion keeps static highlights.
- Public match details now present large artwork panels, a gold winner banner/trophy, winner badges and prominent scores, with a clear related-Poll link when the sanitized source exposes one and a Back to bracket action. Under-review matches suppress winner treatments. Manual/historical score provenance remains explicit.
- Public adds `src/brackets/MatchDetail.tsx` and `src/brackets/match-detail.css`; existing Roadmaps, canvas/styles and public gallery browser tests extended. Admin changes only the existing canvas and styles. No schema, authority, vote or publication changes.
- Both builds/typechecks pass. Public scoped lint and responsive detail tests pass: winner/review state, Poll URL, violet gradient, original green tick and no horizontal overflow at 390/1440. Viewed local detail screenshots under Public `.artifacts/roadmap-gallery-1788874064189/`. Existing coupled bracket/editor browser coverage retained.
