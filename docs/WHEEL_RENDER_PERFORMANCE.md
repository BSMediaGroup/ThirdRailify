# Wheel rendering performance — local investigation, 2026-09-08

The intermittent severe hitch is **not yet reproduced reliably**. This patch reduces demonstrated per-frame rendering work without changing the accepted motion. It is not a universal smoothness fix or a release approval.

## Renderer and scope

`WheelCanvas.tsx` draws cached Canvas 2D segment underlay/foreground layers inside a DOM rotor. A stationary Canvas draws mechanical details; DOM layers provide the pointer, hub, rims, lighting and entrant avatars. GIF fills retain their existing decode/composite timer. All drawing and geometry functions remain unchanged.

Consumers are `/wheels/:slug`, `/wheels/:slug/present`, the editor at `/wheels/:slug/edit`, `/wheels/new`, Appearance preview, and `/wheels/stages/:slug` with overview/focus/fullscreen. Stage editing uses `/wheels/stages/:slug/edit`. There is no separate Wheel popout/embed route in `App.tsx`; opening Presentation in another window uses the same renderer. Poll popouts are unrelated. Admin has a separate CSS/React mechanics preview, with no dependency on this renderer; no coupled Admin repair was established or attempted.

Initial Public state: clean `main`, HEAD `078cf9824b559cd751010fbf9a790e70fc926119`. Admin initially clean at `d1c51c0777e9ef18aa9afe0bd1a3825019ca29c8`. Other repository status/HEAD records are in `.artifacts/wheel-render-performance/initial-audit.json`. Concurrent participant/avatar/client/relay edits that appeared later are outside this patch and preserved.

## Proven rendering cost and repair

Before the patch, an independent RAF callback read `getComputedStyle(rotor).transform`, constructed a DOM matrix, converted the matrix back to an angle and called `entryAtPointer`. That lookup recreated the weighted segment array every frame. The authoritative animation callback separately evaluated the accepted trajectory and wrote the rotor transform.

The trace shows forced style resolution inside the pointer callback. The patch reads the renderer's already-owned angle, reuses `entryAngles(active)` until the entry snapshot changes, and runs pointer publication at the start of the existing spin callback. This preserves the HUD's previous-frame sampling order and ID-change notification policy. Completion continues to publish the final target through the existing settled render. No ordinary UI/result updates are throttled or suppressed.

The pointer cache contains only weighted angular geometry and entry references. Entrant array/order/IDs/labels/weights/visibility changes invalidate it through the existing active-entry memo. Theme, images, font readiness, size and DPR do not affect this angular lookup; their existing artwork invalidation remains intact. No new bitmap cache, worker, renderer, CSS hint, timing policy or dependency is introduced.

## Environment and method

- Repository `.node-version`: Node 22.16.0; production `npm.cmd run build` and Vite preview.
- Installed Brave, Chromium build 152.0.7977.83, headed separate temporary profile, foreground visible page; no user profile/cookies/settings access.
- Viewport 1440×900, zoom/visual viewport scale 1, DPR 1; detail Wheel 820 CSS pixels and 820×820 backing pixels.
- GPU: NVIDIA GeForce RTX 3070 Ti, ANGLE D3D11, accelerated GPU/raster feature status recorded in each `environment.json`.
- Observed callback refresh approximately 6.94 ms / 144 Hz. Windows reports a LuminonCore IDDCX **virtual** 3440×1440 display at 144 Hz and an NVIDIA display at 1920×1200 / 59 Hz. This does not establish physical high-refresh monitor or mobile-device performance.
- No builds or test suites ran during frame measurements. Timing runs are separate from screenshots/video. Browser probe callbacks add measurement overhead equally to before/after; callback intervals are not claimed as physical screen presentation measurements.
- The maintained V1.9 fixture covers 8 weighted entrants, patterns, gradients, GIF and static image fills, plus a 250-entry variant (supported limit 1000) and a two-Wheel Stage. Three complete 10-second spins per scenario are retained, including cold/first and warmed runs; none are selected away.
- After the user supplied the Donations Wheel, its public JSON/configuration and centre JPEG were fetched with GET only and saved locally. It has 26 entrants, 60-second duration, names, purple solid segment palette, red pointer, enabled ticking/winner sound and full configured celebrations. Public mechanics revision 14 is preserved. Local browser requests are intercepted; external requests and Wheel writes are blocked.
- Donations traces cover seconds 36–50 (60–83% of the complete spin), targeting the reported approximately 42-second hitch. Untraced complete-spin runs report startup 0–20%, middle 20–80%, final 80–100%, and the reported 60–85% window separately.

## Focused Donations trace evidence

Raw trace paths: `.artifacts/wheel-render-performance/donations-before-trace/donations-trace.json` and `donations-after-trace/donations-trace.json`. Corresponding `donations-trace-summary.json` records relative timestamps of the largest layout/paint/raster/GC events. Full callback and request timelines are in `donations-0.json`.

| 36–50 second trace window | Before | After |
| --- | ---: | ---: |
| FireAnimationFrame aggregate duration | 773.650 ms | 248.083 ms |
| FireAnimationFrame maximum event | 0.893 ms | 0.337 ms |
| UpdateLayoutTree events | 4,032 | 2,017 |
| UpdateLayoutTree aggregate duration | 468.182 ms | 454.765 ms |
| Paint aggregate duration | 632.288 ms | 686.762 ms |
| Main trace MajorGC aggregate duration | 17.138 ms | 16.801 ms |
| DroppedFrame markers | 0 | 0 |

These are aggregate trace events, some nested; do not add categories as independent CPU totals. Scripting work fell about 68%, while style processing was consolidated and paint did not improve. The two traces use ordinary secure local demo RNG, so winner/landing and HUD changes differ. Their reported-window callback median/p95/p99 remained about 6.9/7.1/7.1 ms in both, with maxima 7.2 and 7.3 ms. This establishes reduced work, not elimination of an observed severe stall. Browser-level `FramePresented` markers are retained but are not a physical monitor census.

No static-artwork rebuild, resize invalidation, image/font completion or Wheel refresh was observed at the reported moment in these Donations runs. Artwork metrics remained two startup plan builds/composites, one backing resize, and zero resize invalidations. No production spin or result request occurred.

## Initial untraced Donations repeats (demo-button scroll)

Same builds, browser, viewport, DPR, appearance, 60-second duration and mechanics revision; ordinary local secure RNG remains untouched. Run 1 is the first spin in a new context; runs 2–3 are warmed repeats. Values are milliseconds. Median/p95/p99 across each whole spin remained 6.9/7.1/7.1 before and after.

| Run | Whole maximum before → after | 60–85% p99 before → after | 60–85% maximum before → after | Gaps >1.5× refresh in that window before → after | Aggregate RAF work p95 before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 62.4 → 62.5 | 7.1 → 7.1 | 7.3 → 7.3 | 0 → 0 | 0.6 → 0.2 |
| 2 | 48.5 → 13.9 | 7.2 → 7.1 | 14.0 → 7.2 | 6 → 0 | 0.7 → 0.2 |
| 3 | 14.0 → 7.3 | 7.1 → 7.1 | 7.3 → 7.2 | 0 → 0 | 0.7 → 0.2 |

The six before-run-2 gaps occurred at 38.280–38.392 seconds, not consistently at 42 seconds. They did not coincide with a severe sustained stall. Untraced data cannot establish their individual cause. The cold startup gap remained around 62 ms in both builds; this patch does not fix that startup cost.

| Portion maximum | Before runs 1 / 2 / 3 | After runs 1 / 2 / 3 |
| --- | --- | --- |
| Startup 0–20% | 62.4 / 7.2 / 14.0 | 62.5 / 7.3 / 7.3 |
| Middle 20–80% | 7.3 / 48.5 / 7.4 | 7.4 / 13.9 / 7.3 |
| Final 80–100% | 7.2 / 7.7 / 7.3 | 7.2 / 7.3 / 7.2 |

Final rotation error was zero in all six runs. Settlement happened at 60001.5/60002.5/60006.4 ms before and 60002.1/60002.1/60001.9 ms after, consistent with the unchanged next-RAF completion rule. Recorded terminal increments match the accepted formula within the existing 1e-7 tolerance. Endpoint JS heap readings were 10.19/10.04/9.85 MB before and 8.77/8.76/9.07 MB after; these are bounded short-run observations including the probe, not a heap-leak proof.

All per-portion median/p95/p99/max, callback deadline gaps, RAF work, script/layout metrics, renderer counts, heap samples and original request timelines are retained in `summary.json` and the six `donations-before/` / `donations-after/` run files. The strongest measured result is reduced rendering work; frame pacing is modestly better in these repeats, with a mostly smooth baseline and no universal guarantee.

## Whole-Wheel-visible final repeat

The demo button in the initial runs can scroll part of the Wheel offscreen. A final independent three-before/three-after sequence instead uses `--centre`: the Wheel is positioned at y=75.875…895.875 within the 900px viewport, and the centre button starts the unchanged 60-second demo. This keeps the complete 820px Wheel visible. Both production builds contain the same current application source except the saved/patched renderer. The original and final sequences are both retained, not pooled selectively.

| Full visible Wheel | Before runs 1 / 2 / 3 | After runs 1 / 2 / 3 |
| --- | --- | --- |
| 60–85% median / p95 / p99 | 6.9 / 7.1 / 7.1 ms in every run | 6.9 / 7.1 / 7.1 ms in every run |
| 60–85% maximum | 7.3 / 7.2 / 7.2 ms | 7.2 / 7.3 / 7.3 ms |
| Whole-spin maximum | 76.3 / 7.3 / 7.3 ms | 55.5 / 7.3 / 7.3 ms |
| Aggregate RAF work p95 | 0.5 / 0.5 / 0.5 ms | 0.2 / 0.2 / 0.2 ms |
| Aggregate RAF work total | 2564.7 / 2711.3 / 2600.0 ms | 540.0 / 503.0 / 528.7 ms |
| Settled elapsed time | 60000.8 / 60002.1 / 60002.4 ms | 60001.6 / 60001.8 / 60001.0 ms |

All six final-angle errors are zero, all final-increment errors are below 1e-7, and artwork counters remain two startup rebuilds, one backing resize and zero resize invalidations. There are no callback gaps above 1.5× refresh in the reported window. After-run heaps are 8.82/8.81/8.98 MB; no growing loop count was observed. The final/settling portions have maxima at most 7.3 ms. This final sequence shows **reduced work with effectively unchanged already-smooth pacing**, not proof that the severe intermittent symptom is fixed. Evidence: `donations-full-before/`, `donations-full-after/`, `summary.json`.

## Stage variability

The initial `after/stage-*` sequence was slower (about 978–984 intervals per 10-second spin, p95 approximately 14 ms), versus approximately 1430 in the initial before sequence. It is retained as an adverse measurement. An immediate matched three-run repeat in fresh identical contexts (`stage-paired-before/`, `stage-paired-after/`) did not reproduce that regression:

| Two-Wheel Stage | Before runs 1 / 2 / 3 | After runs 1 / 2 / 3 |
| --- | --- | --- |
| Callback p95 | 7.1 / 7.1 / 7.1 ms | 7.1 / 7.1 / 7.1 ms |
| Callback p99 | 7.1 / 7.1 / 7.2 ms | 7.2 / 7.1 / 7.1 ms |
| Callback maximum | 62.4 / 13.9 / 14.0 ms | 62.4 / 13.9 / 13.8 ms |
| Aggregate RAF work p95 | 0.6 / 0.6 / 0.6 ms | 0.2 / 0.2 / 0.2 ms |

This makes the original Stage slowdown inconclusive, not disproven. Ambient machine/display scheduling was not isolated enough to explain that outlier. No CSS or mechanics change was made to chase it. No claim of zero dropped frames on all machines is made.

## Mechanics verification

`mechanics-hash-check.json` confirms byte-identical SHA-256 hashes for `mechanics.mjs`, `engine.mjs`, `wheelRenderPlan.mjs`, `WheelPage.tsx` and `WheelStagePage.tsx`. The existing artwork/GIF/geometry helper functions in `WheelCanvas.tsx` also remain unchanged. The driver diff adds pointer publication and records the renderer-owned angle; its clock selection, elapsed clamp, `spinRotationAtTime`, phase/terminal formula, boundary counting, finish guard and cancellation remain unchanged.

Eight deterministic effect tests pass against the actual TSX component, including an optional run against the saved initial component. They exercise 60 Hz and 144 Hz schedules, irregular timestamps, a 750 ms gap, hidden-tab-sized gaps, cancellation/remount with accepted `startAt`, reduced motion, and replacement weighted entry snapshots. Sampled angles compare exactly (no tolerance widening), chosen entrant/landing match, boundary counts match, and completion fires once. The saved baseline and patched component also emit equal boundary sequences and settle on the identical supplied frame timestamp. Renderer tests never replace production RNG.

## Validation

All commands use Node 22.16.0. Logs are under `.artifacts/wheel-render-performance/`.

| Command | Result | Log |
| --- | --- | --- |
| `npm.cmd run test:wheels:render` with `WHEEL_RENDER_BASELINE` | 8 passed | `test-driver.log` |
| `npm.cmd run test:wheels` | 107 passed, 1 deployment-only test skipped, 0 failed | `test-wheels.log` |
| `npm.cmd run typecheck` | Passed | `typecheck.log` |
| `npm.cmd run lint -- --ignore-pattern '.artifacts/**' --ignore-pattern '.playwright-mcp/**'` | 0 errors, 3 existing warnings | `lint.log` |
| `npm.cmd run build` | Passed; existing bundle-size warning | `final-build.log` |
| `npm.cmd run test:browser:wheels-v19` | 1 passed | `browser-v19.log` |
| `npm.cmd run test:browser:wheels-v112` | 1 passed | `browser-v112.log` |
| `npm.cmd run test:browser:wheels-stage` | 2 passed | `browser-stage.log` |
| `npm.cmd run test:browser:wheels` | 2 passed after stale selector repairs | `browser-wheels-final.log` |
| `git diff --check` | Passed | `diff-check.log` |

Lint warnings are the existing ProductVariantSelectors export warning, Polls `sourceScope` dependency warning, and the artwork effect's intentionally angle-independent `rotation` dependency warning. Generated evidence is excluded from maintained-source lint.

The first detail/editor run failed because the old suite counted all canvases as one Wheel; the saved initial renderer already had both a face and a stationary mechanics canvas. A second attempt exposed the same stale assumption in its hit-testing selector. The test now explicitly checks `.wheel-stage__face` and `.wheel-stage__mechanics`, including both the underlying Wheel and editor preview. It hits the face canvas explicitly. No geometry tolerance was loosened. Original failure logs (`browser-wheels.log`, `browser-wheels-rerun.log`) are retained.

Browser coverage includes requested 1920/1440/768/390 widths, real viewport resizes, DPR/backing geometry, Presentation/fullscreen entry and exit, Stage overview/focus and Spin All, GIF progression without static redraws, repeated spins, segment hit testing, owner/editor/official-local fixture semantics, reduced motion, import/editor lifecycle and route navigation. The eight deterministic driver tests cover the hidden-tab-sized clock gap; a physical background-tab scheduling or real mobile hardware test is not claimed. These suites are local production-preview tests; their headless runs are functional evidence, not the frame-pacing benchmark.

## Visual evidence and files

Matching Donations screenshots at 0°, 137.5° and 281.25° are in `donations-visual-before/` and `donations-visual-after/`, with full-page counterparts preserving surrounding glow/pointer context. These are controlled matching-angle visual checks, not claimed as the random winners of the independent timing runs. The idle and settled-angle crops are pixel-identical. The mid-angle crop has mean RGB difference 0.005995 on a 0–255 scale (1.53% of pixels differ at all); both were visually inspected and show the same typography, segment borders, gradients, image, pointer and resolution. `visual-parity.json` retains the exact comparison. The mid-angle images are not claimed pixel-identical.

Separate complete 10-second headed spins of the mixed-pattern/GIF fixture were recorded without changing their duration or trajectory. Videos: `video-before/f0f9413b7a3a2e45292c0df0c8180b36.webm`, `video-after/29905cd8a6e9804e1db4f25b53722c29.webm`. Decoded frames at 1/3/5/7/9/11 seconds and contact sheets are retained alongside them. Playwright's approximately 25 FPS video is for motion/visual review only; recording-run timing is excluded from performance conclusions and cannot prove 144 Hz screen smoothness. Complete 60-second Donations runs were executed headed separately. Responsive detail and Presentation images at 390/1920 were visually inspected as well as the matching-angle Wheel crops.

The recordings are 14.32 and 14.28 seconds including loading/setup; decoded 14-second settled frames are also retained and inspected. The final maintained-source lint rerun (`lint-final.log`) passes with the same three warnings. Task preview servers were stopped after evidence collection; the user's browser sessions were not closed.

Task-owned Public changes:

- Modified `src/wheels/WheelCanvas.tsx`, `tests/wheels-browser.test.mjs`, `package.json`, `README.md`, `BUMP_NOTES.md`.
- Added `tests/wheels-render-driver.test.mjs`, `scripts/profile-wheel-rendering.mjs`, `scripts/summarize-wheel-rendering.mjs`, `docs/WHEEL_RENDER_PERFORMANCE.md`.
- Removed no files. Test-generated changes to existing tracked screenshots are copied into the task evidence folder and restored to their clean starting versions; they are not part of this patch.

Concurrent participant/avatar/client/relay changes are excluded from this file list. No Admin or reference repository was modified by this task. Initial unrelated runtime dirt in reference repositories is preserved; ongoing runtime writes are not represented as byte-identical snapshots.

## Reproduction commands

Use PowerShell with the repository-supported Node directory on PATH and `npm.cmd` throughout. Start `npm.cmd run preview -- --port 4196` after `npm.cmd run build`, then:

```powershell
node scripts/profile-wheel-rendering.mjs local-before
node scripts/profile-wheel-rendering.mjs local-trace --trace
node scripts/profile-wheel-rendering.mjs local-visual --visual
node scripts/summarize-wheel-rendering.mjs local-trace
node --test tests/wheels-render-driver.test.mjs
```

`WHEEL_SCENARIO` selects `normal`, `large`, or `stage`; `WHEEL_REPEATS` defaults to three. `WHEEL_PROFILE_ORIGIN` accepts only an explicit `http://127.0.0.1:PORT`. `WHEEL_BROWSER` selects another installed Chromium executable. `--centre` scrolls the whole Wheel into view and starts through its centre control. `--record` records a separate low-rate Playwright video; its timing output is excluded from benchmark acceptance. `WHEEL_PUBLIC_FIXTURE` optionally selects the saved local Donations payload; it uses the accompanying `mechanics-public.json` and `donations-centre.jpg` beneath the evidence folder. The probe itself never fetches production data. With that fixture, traces automatically target 36–50 seconds. Keep the browser foreground and avoid concurrent measurements/builds.

Optional `WHEEL_RENDER_BASELINE=.artifacts/wheel-render-performance/baseline/WheelCanvas.tsx` enables a deterministic comparison against the initial component snapshot. Full hashes of mechanics, engine, render plan and callers were saved before edits. The baseline Vite build was generated in `before-dist` using a build-only source override for the saved renderer, without reverting working-tree files.

## Release boundary

Local implementation only. No deployment, push, commit, migration, production spin/result mutation, provider/DNS/payment/secret change, Bot restart or reference-repository edit. The stronger intermittent symptom remains unverified on affected physical machines.

## 2026-09-08: optional entrant features

Local milestone at Public `354a8ac` / Admin `959dc67` plus uncommitted implementation. Node 22.16.0, production Vite preview, foreground headed Brave Chromium 152.0.7977.83, NVIDIA RTX 3070 Ti driver 32.0.15.9186, Windows virtual display 1680x1050 at approximately 144 Hz, viewport 1440x900, DPR/zoom 1. No concurrent builds or tests during timing, tracing or recording. Synthetic Donations-style fixture: 60 seconds, eight entrants, weights 150/1/20/20/20/20/20/20, dominant 55.35% wedge and 0.369% narrow wedge, 820 CSS/backing-pixel Wheel, retained GIF and static image fills. This is not a production Donations event or official draw.

Two foreground runs per principal case, with matching fixture, size and media. Baseline used the saved latest optimized production renderer. Mixed includes gradient-only, icon-only, effects-only and full combinations; heavy includes all four effects on all eight entries, intensity .45, speed 1, density 3. Heavy is a valid demanding combination, not a claim about all 1000-entrant/max-DPR workloads.

| Case | 36-50s interval p95, runs 1 / 2 | interval p99 | maximum interval | gaps >1.5 refresh | combined RAF work p95 |
| --- | --- | --- | --- | --- | --- |
| Optimized baseline | 7.1 / 7.1 ms | 7.1 / 7.1 ms | 7.2 / 7.2 ms | 0 / 0 | 0.1 / 0.1 ms |
| New effects off | 7.1 / 7.1 ms | 7.2 / 7.1 ms | 13.9 / 7.2 ms | 6 / 0 | 0.2 / 0.2 ms |
| Mixed | 7.1 / 7.1 ms | 7.1 / 7.1 ms | 7.3 / 7.3 ms | 0 / 0 | 0.2 / 0.2 ms |
| All four effects | 7.1 / 7.1 ms | 7.2 / 7.1 ms | 7.3 / 7.2 ms | 0 / 0 | 0.3 / 0.2 ms |

All eight runs completed, with zero final-angle error and final-delta numerical error below 6e-12 degrees. Each retained four initial static/cache plan builds and one Canvas resize; angle changes and decorative frames did not rebuild static artwork. All had zero rotor computed-style reads and no page errors. Effects-off adds no decorative Canvas or scheduler. Mixed has five decorated segments; heavy has eight. Approximate aggregate decorative draw averages were .06 ms mixed and .10-.11 ms heavy (cumulative instrumentation includes short idle periods); maxima .30 ms and 1.10 ms respectively. End heap values were 8.2-8.8 MB; these snapshots do not establish a long-duration leak bound. Browser acceptance separately verifies offscreen stop/resume and reduced-motion static output.

The full first spins had startup/outside-window gaps: maxima 55.4 ms baseline, 55.6 ms off, 62.4 ms mixed and 62.5 ms heavy; warm repeats peaked at 7.3 ms. The first heavy run had 21 intervals above 1.5 refresh over the whole spin. Thus results support comparable no-effects cadence and low measured decorative CPU work in this fixture, not universal elimination of the historical intermittent hitch.

A separate all-effects trace captured approximately seconds 36-50: 2017 DrawFrame markers, zero DroppedFrame markers, **zero FramePresented markers**; 4103 Paint events (maximum .618 ms), 10154 RasterTask events (maximum .190 ms), 4329 RendererRasterWorker events (maximum 2.531 ms), and 21 MajorGC events (maximum 1.290 ms). Trace durations overlap across threads and must not be summed into per-frame wall time. This virtual display still provides no reliable physical presentation proof. RAF cadence and DrawFrame markers do not prove every frame reached a physical screen.

Timing data is retained in `.artifacts/wheel-render-performance/features-{baseline-donations,off,mixed,heavy}/normal-{0,1}.json`; summaries in `summary.json`. Trace and summary are in `features-heavy-traced/`. Separate 60-second videos are in `features-mixed-recorded/` and `features-inline-recorded/`; recording measurements are excluded above. The first video exposed a long-label/glyph overlap, fixed by reserving glyph space on the same radial baseline and truncating the name to the remaining width, with geometry-based glyph sizing. This final static placement correction does not change the measured effect loop, trajectory, cache invalidation or no-effects path. The final recording uses the whole Wheel centred in view. Selected decoded video frames at 10, 40 and 50 seconds were inspected; no claim of physical-screen or exhaustive human video review is made.

Reproduce with the existing profiler, after a production build and local preview:

```powershell
$env:WHEEL_PROFILE_DURATION='60000'
$env:WHEEL_SCENARIO='normal'
$env:WHEEL_REPEATS='2'
$env:WHEEL_FEATURE_CASE='mixed' # off / mixed / heavy
node scripts/profile-wheel-rendering.mjs features-mixed
node scripts/profile-wheel-rendering.mjs features-heavy-traced --trace
node scripts/profile-wheel-rendering.mjs features-inline-recorded --record --centre
node scripts/summarize-wheel-rendering.mjs features-heavy-traced
```

Set `WHEEL_FEATURE_CASE='heavy'` explicitly for the heavy trace. Record separately with `WHEEL_REPEATS='1'`. Browser evidence and authority/compatibility details are in `WHEEL_ENTRANT_APPEARANCE.md`. The local additive migration is a release prerequisite; no remote migration or release occurred.
