# Season Roadmaps

Current/pending version: 0.1.0-alpha.0. Public read-only routes are `/polls/abootnothing/brackets` and `/:slug`, with a Roadmaps shelf at `/polls/abootnothing`. Existing Poll detail/editor/popout and `/abootnothing` alias remain intact.

`functions/api/brackets/[[path]].js` relays GET requests to Admin. No bracket mutation, database, R2 binding, Bot access or creator privilege is exposed. Only the active published revision is readable. Private planning notes/alternates and hidden Poll counts/links are excluded by Admin's projection. Unpublish revokes roadmap and image access; all responses use no-store. A single visibility-aware coordinator refreshes each roadmap every 15 seconds.

`src/brackets/{BracketCanvas,Lightbox,types,status,model,brackets.css}` share the safe renderer contract with Admin. `Roadmaps.tsx` contains Public gallery/detail/shelf; privileged Studio editor code is absent. The canvas supports explicit rounds, readable score/status cards, manually labelled history, winner paths, eligible Poll links, focus/find, zoom, pan, fullscreen and printing. Small viewports use round tabs. A champion is presented only when Admin reports valid finality. Ties, empty/unsettled Polls and source reviews cannot receive a false Poll-winner badge.

Admin owns the additive 0043 migration and protected backup, Poll linkage and credit-settlement checks, audit/corrections, publication and media retention. Its `docs/MATCHUP_STUDIO.md` is the authority/runbook. Release order is schema, Admin/API, then Public. Bot/media-worker require no changes for bracket delivery; existing Poll image clones use the established media contract.

Release validation uses Node 22.16.0, `npm.cmd run build`, maintained-source lint, Pages Functions compilation, existing Poll API/browser/media/history regressions, and Admin's connected `tests/brackets-browser.test.mjs` against the actual Public build/relay. Evidence is in paired `.artifacts/matchup-studio/` directories. Desktop/mobile source screenshots are local evidence only; stable-domain acceptance and deployment IDs are recorded separately in the release manifest and root bump notes.
