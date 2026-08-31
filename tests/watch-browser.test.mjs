import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4194";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ID = `ep_${"a".repeat(64)}`;
const MATRIX = {
  watch: [[1920,1080],[1440,900],[1365,768],[1024,768],[768,1024],[390,844]],
  live: [[1440,900],[1024,768],[390,844]],
  episodes: [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844]],
  detail: [[1365,768],[1024,768],[390,844]],
};

test("Watch V2 routes, slot counts, players, precedence, redirect fallback, and responsive layouts", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4194"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForPreview();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  for (const [route, sizes] of Object.entries(MATRIX)) {
    for (const [width, height] of sizes) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage(); const errors = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
      await mockApis(page, false);
      const url = route === "watch" ? "/watch" : route === "live" ? "/watch/live?platform=youtube" : route === "episodes" ? "/watch/episodes" : `/watch/v/${ID}`;
      await page.goto(`${ORIGIN}${url}`);
      await page.locator("h1").waitFor();
      assert.equal(await page.locator("h1").count(), 1, `${route} has one H1 at ${width}x${height}`);
      assert.equal(await page.locator('.site-header a[href="/wheels"]').count(), 0, `Wheels is absent from the main header on ${route} at ${width}x${height}`);
      assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true, `${route} has no overflow at ${width}x${height}`);
      assert.deepEqual(errors, [], `${route} has no console errors at ${width}x${height}`);
      if (route === "watch") {
        const watchHero = page.locator(".watch-hero");
        await page.locator(".watch-hero.is-motion-active").waitFor({ timeout: 8_000 });
        assert.equal(await watchHero.locator(".watch-hero__atmosphere").count(), 1, "Watch hero has one dedicated environmental signal field");
        assert.equal(await watchHero.locator(":scope > .signal-field,.watch-hero__signal").count(), 0, "Watch hero removes the two legacy background systems");
        assert.equal(await watchHero.locator(".watch-hero__beams i").count(), 2, "Watch hero keeps two restrained depth beams");
        assert.equal(await watchHero.locator(".watch-hero__particles i").count(), 10, "Watch hero carries the consolidated sparse particle field");
        assert.equal(await watchHero.locator(".watch-hero__route--live").count(), 2, "Watch hero carries both live transmission routes");
        assert.notEqual(await watchHero.locator(".watch-hero__route--live").first().evaluate((element) => getComputedStyle(element).animationName), "none", `Watch hero routes animate at ${width}x${height}`);
        await page.locator(".episode-featured-grid .episode-card").first().waitFor();
        assert.equal(await page.locator(".episode-featured-grid .episode-card").count(), 6);
        assert.equal(await page.locator(".episode-featured-grid .episode-card--placeholder").count(), 5);
        assert.equal(await page.locator(".episode-featured-grid .episode-card:not(.episode-card--placeholder)").count(), 1);
        assert.equal(await page.locator(".episode-featured-grid .episode-card:not(.episode-card--placeholder) h3").textContent(), "Older retained transmission");
        assert.equal(await page.getByRole("link", { name: /Open dedicated player/ }).getAttribute("href"), "/watch/live?platform=youtube");
        const schedule = page.locator(".watch-schedule");
        await schedule.scrollIntoViewIfNeeded();
        await page.locator(".watch-schedule.is-active").waitFor({ timeout: 8_000 });
        assert.equal(await schedule.locator(".sparkling-sky__star").count(), 168, `Watch schedule carries the complete Friends-density starfield at ${width}x${height}`);
        assert.equal(await schedule.locator(".sparkling-sky").getAttribute("data-star-layout"), "seeded-clustered", `Watch schedule uses the irregular clustered sky at ${width}x${height}`);
        const starScatter = await measureStarScatter(schedule.locator(".sparkling-sky"));
        assert.ok(starScatter.emptyCells >= 1 && starScatter.denseCell >= 12 && starScatter.variance >= 12 && starScatter.closePairs >= 40, `Watch schedule has natural gaps and constellations instead of uniform bands at ${width}x${height}: ${JSON.stringify(starScatter)}`);
        assert.ok(starScatter.uniqueX >= 160 && starScatter.uniqueY >= 160, `Watch star coordinates do not repeat as rows or columns at ${width}x${height}: ${JSON.stringify(starScatter)}`);
        assert.notEqual(await schedule.locator(".sparkling-sky__star").first().evaluate((element) => getComputedStyle(element).animationName), "none", `Watch schedule stars twinkle at ${width}x${height}`);
        assert.equal(await schedule.locator(".sparkling-sky__meteors i").count(), 3, `Watch schedule carries all three Friends-style shooting stars at ${width}x${height}`);
        assert.equal(await schedule.locator(".sparkling-sky__meteors i").first().evaluate((element) => getComputedStyle(element).animationName), "sparkling-sky-meteor", `Watch shooting stars animate at ${width}x${height}`);
        assert.equal(await schedule.locator(".watch-platform-links a").count(), 2);
        const orbitalGeometry = await schedule.locator(".watch-schedule__orbit").evaluate((orbit) => { const orbitBox = orbit.getBoundingClientRect(); const coreBox = orbit.querySelector(".watch-schedule__time")?.getBoundingClientRect(); return { width: orbitBox.width, height: orbitBox.height, coreX: coreBox ? coreBox.left + coreBox.width / 2 - orbitBox.left : null, coreY: coreBox ? coreBox.top + coreBox.height / 2 - orbitBox.top : null }; });
        assert.ok(Math.abs(orbitalGeometry.width - orbitalGeometry.height) <= 1, `Watch schedule orbit remains circular at ${width}x${height}`);
        assert.ok(orbitalGeometry.coreX !== null && orbitalGeometry.coreY !== null && Math.abs(orbitalGeometry.coreX - orbitalGeometry.width / 2) <= 1 && Math.abs(orbitalGeometry.coreY - orbitalGeometry.height / 2) <= 1, `Watch time core stays centered at ${width}x${height}: ${JSON.stringify(orbitalGeometry)}`);
        if (process.env.WATCH_BROWSER_SCREENSHOTS === "1" && (width === 1440 || width === 390)) {
          await watchHero.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-watch-hero-${width}.png`) });
          await page.addStyleTag({ content: ".site-header, .skip-link, .privacy-dock { display: none !important; }" });
          await schedule.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-watch-schedule-${width}.png`) });
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `polished Watch schedule has no overflow at ${width}x${height}`);
      }
      if (route === "live") { await page.locator(".broadcast-player").waitFor(); assert.equal(await page.locator(".broadcast-player").count(), 1, "dedicated route has one player stack"); }
      if (route === "episodes") {
        const archiveRegister = page.locator(".archive-status");
        await archiveRegister.waitFor();
        await page.locator(".episodes-signal-hero.is-motion-active").waitFor({ timeout: 8_000 });
        assert.equal(await page.locator(".episodes-signal-field__glow").count(), 1, "archive hero has a dedicated animated light field");
        assert.equal(await page.locator(".episodes-signal-field__sweep,.episodes-signal-field__orbit,.episodes-signal-field__rail").count(), 0, "archive hero removes competing sweep, orbit, and rail systems");
        assert.equal(await page.locator(".episodes-signal-field__depth > i").count(), 2, "archive hero keeps two restrained depth bands");
        assert.equal(await page.locator(".episodes-signal-field__particles i").count(), 12, "archive hero carries the consolidated retained-signal particle field");
        assert.equal(await page.locator(".episodes-signal-field__frequency--live").count(), 2, "archive hero carries both animated frequency paths");
        assert.notEqual(await page.locator(".episodes-signal-field__frequency--live").first().evaluate((element) => getComputedStyle(element).animationName), "none", `archive frequencies animate at ${width}x${height}`);
        assert.match(await page.locator(".archive-status__latest strong").innerText(), /Aug 27, 2026/i, "latest date remains compact, readable metadata");
        assert.equal(await page.getByText("Newest trace", { exact: true }).count(), 0, "legacy stacked date treatment is removed");
        assert.ok(Number.parseFloat(await page.locator(".archive-status__latest strong").evaluate((element) => getComputedStyle(element).fontSize)) <= 18, "latest date is not rendered as display text");
        if (width >= 1024) {
          const registerBox = await archiveRegister.boundingBox();
          assert.ok(registerBox && registerBox.height <= registerBox.width * 1.12, "desktop archive register keeps a balanced landscape proportion");
        }
        assert.equal(await page.locator(".episode-gallery-grid .episode-card").count(), 24);
        assert.equal(await page.locator(".episode-gallery-grid .episode-card--placeholder").count(), 22);
        assert.equal(await page.locator(".episode-gallery-grid .episode-card--placeholder a").count(), 0, "placeholders are not clickable");
        assert.equal(await page.locator(".episode-gallery-grid .episode-card:not(.episode-card--placeholder) a").count() > 0, true, "retained episode remains actionable");
        assert.equal(await page.getByRole("heading", { level: 2, name: "Past episodes" }).count(), 1);
        assert.equal(await page.getByText(/Transmission slots/i).count(), 0);
        const rumble = page.getByRole("link", { name: /See more Third Railify episodes on Rumble/ });
        assert.equal(await rumble.getAttribute("href"), "https://rumble.com/thirdrailify");
        assert.equal(await rumble.getAttribute("target"), "_blank");
        assert.equal(await rumble.getAttribute("rel"), "noopener noreferrer");
        if (process.env.WATCH_BROWSER_SCREENSHOTS === "1" && (width === 1440 || width === 390)) await page.locator(".episodes-signal-hero").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-watch-episodes-hero-${width}.png`) });
      }
      if (route === "detail") assert.equal(await page.getByRole("heading", { level: 1, name: "Fixture retained transmission" }).count(), 1);
      if (process.env.WATCH_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-watch-${route}-${width}.png`), fullPage: true });
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } }); const page = await context.newPage(); await mockApis(page, false);
  await page.goto(`${ORIGIN}/watch/v/unknown-id`); await page.getByRole("heading", { level: 1, name: "This route left the rail." }).waitFor();
  await page.goto(`${ORIGIN}/live?from=short`); await page.waitForURL(`${ORIGIN}/watch?from=short`);
  await page.unroute("**/api/**"); await mockApis(page, true);
  await page.goto(`${ORIGIN}/live?from=live`); await page.waitForURL(`${ORIGIN}/watch/live?from=live`);
  await page.locator(".promo-banner--live").waitFor();
  assert.equal(await page.locator(".promo-banner--live").getByText("Fixture live transmission").count(), 1);
  assert.equal(await page.locator(".promo-banner--live .promo-banner__cta").getAttribute("href"), "/watch/live");
  await page.goto(`${ORIGIN}/community`);
  assert.equal(await page.locator('.site-header a[href="/wheels"]').count(), 0, "Wheels remains absent from the main header");
  assert.equal(await page.locator('main a[href="/wheels"]').count(), 1, "Community retains the Competition wheels route");
  await context.close();

  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const liveContext = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" }); await liveContext.addCookies([consentCookie()]); const livePage = await liveContext.newPage(); await mockApis(livePage, true);
    await livePage.goto(`${ORIGIN}/watch`); const liveStage = livePage.locator('.watch-stage.is-live[data-state="live"]'); await liveStage.waitFor();
    const liveEffect = await liveStage.evaluate((element) => ({
      border: getComputedStyle(element).borderColor,
      shadow: getComputedStyle(element).boxShadow,
      stageAnimation: getComputedStyle(element).animationName,
      edgeAnimation: getComputedStyle(element, "::before").animationName,
      haloAnimation: getComputedStyle(element, "::after").animationName,
      haloContent: getComputedStyle(element, "::after").content,
    }));
    assert.match(liveEffect.border, /255, (?:70|71|72|73|74|75)/, `live stage has a visible red perimeter at ${width}px`);
    assert.notEqual(liveEffect.shadow, "none", `live stage has a visible multi-layer glow at ${width}px`);
    assert.equal(liveEffect.stageAnimation, "watch-live-stage-breathe");
    assert.equal(liveEffect.edgeAnimation, "watch-live-edge-pulse");
    assert.equal(liveEffect.haloAnimation, "watch-live-halo-pulse");
    assert.notEqual(liveEffect.haloContent, "none");
    assert.equal(await livePage.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true);
    if (process.env.WATCH_BROWSER_SCREENSHOTS === "1") await livePage.locator(".watch-stage-section").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-watch-live-event-${width}.png`) });

    await livePage.goto(`${ORIGIN}/`);
    const homeLivePlayer = livePage.locator(".broadcast-card.is-live.live-event-perimeter");
    await homeLivePlayer.waitFor();
    await assertLivePerimeter(homeLivePlayer, `home current player at ${width}px`);
    assert.equal(await livePage.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `home live perimeter has no overflow at ${width}px`);
    if (process.env.WATCH_BROWSER_SCREENSHOTS === "1") await livePage.locator(".show-intro").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-home-live-event-${width}.png`) });

    await livePage.goto(`${ORIGIN}/watch/live?platform=youtube`);
    const dedicatedLivePlayer = livePage.locator(".watch-theatre__stage.is-live.live-event-perimeter");
    await dedicatedLivePlayer.waitFor();
    await assertLivePerimeter(dedicatedLivePlayer, `dedicated current player at ${width}px`);
    assert.equal(await livePage.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `dedicated live perimeter has no overflow at ${width}px`);
    if (process.env.WATCH_BROWSER_SCREENSHOTS === "1") await livePage.locator(".watch-theatre").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-dedicated-live-event-${width}.png`) });
    await liveContext.close();
  }

  const offlineContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const offlinePage = await offlineContext.newPage(); await mockApis(offlinePage, false);
  await offlinePage.goto(`${ORIGIN}/watch`); const offlineStage = offlinePage.locator('.watch-stage[data-state="archive"]'); await offlineStage.waitFor();
  assert.equal(await offlineStage.getAttribute("class"), "watch-stage", "non-live transmissions do not inherit the live-event perimeter");
  assert.equal(await offlineStage.evaluate((element) => getComputedStyle(element, "::after").content), "none");
  await offlinePage.goto(`${ORIGIN}/`); await offlinePage.locator(".broadcast-card").waitFor();
  assert.equal(await offlinePage.locator(".broadcast-card.live-event-perimeter").count(), 0, "offline homepage player has no live-event perimeter");
  await offlinePage.goto(`${ORIGIN}/watch/live`); await offlinePage.locator(".watch-theatre__stage").waitFor();
  assert.equal(await offlinePage.locator(".watch-theatre__stage.live-event-perimeter").count(), 0, "offline dedicated player has no live-event perimeter");
  await offlineContext.close();

  const staleContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const stalePage = await staleContext.newPage(); await mockApis(stalePage, false, { watch: () => ({ ...watchPayload(true), freshness: "stale", ageSeconds: 9999 }) });
  await stalePage.goto(`${ORIGIN}/watch`); const staleStage = stalePage.locator('.watch-stage[data-state="live"]'); await staleStage.waitFor();
  assert.equal(await staleStage.getAttribute("class"), "watch-stage", "stale provider snapshots never receive the live-event perimeter");
  assert.equal(await stalePage.locator(".watch-hero.is-live").count(), 0, "stale provider snapshots never claim a live Watch hero");
  await stalePage.goto(`${ORIGIN}/`); await stalePage.locator(".broadcast-card").waitFor();
  assert.equal(await stalePage.locator(".broadcast-card.live-event-perimeter").count(), 0, "stale homepage signal never receives the live-event perimeter");
  await stalePage.goto(`${ORIGIN}/watch/live`); await stalePage.locator(".watch-theatre__stage").waitFor();
  assert.equal(await stalePage.locator(".watch-theatre__stage.live-event-perimeter").count(), 0, "stale dedicated signal never receives the live-event perimeter");
  await staleContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }); const reducedPage = await reducedContext.newPage(); await mockApis(reducedPage, false);
  await reducedPage.goto(`${ORIGIN}/`); await reducedPage.locator(".promo-banner--normal").waitFor();
  assert.equal(await reducedPage.locator(".promo-banner__ticker .promo-banner__message:visible").count(), 1, "reduced motion exposes one stable readable ticker message");
  assert.equal(await reducedPage.locator(".promo-banner__ticker .promo-banner__divider:visible").count(), 0, "reduced motion does not leave a divider after the stable message");
  assert.equal(await reducedPage.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true);
  await reducedPage.goto(`${ORIGIN}/watch/episodes`); await reducedPage.locator(".archive-status").waitFor();
  assert.equal(await reducedPage.locator(".episodes-signal-field__glow").evaluate((element) => getComputedStyle(element).animationName), "none", "archive hero light field respects reduced motion");
  assert.equal(await reducedPage.locator(".episodes-signal-field__frequency--live").first().evaluate((element) => getComputedStyle(element).animationName), "none", "archive hero frequency routes respect reduced motion");
  assert.equal(await reducedPage.locator(".episodes-signal-field__beacon").evaluate((element) => getComputedStyle(element).animationName), "none", "archive hero depth beacon respects reduced motion");
  assert.equal(await reducedPage.locator(".archive-status").evaluate((element) => getComputedStyle(element, "::after").animationName), "none", "archive register sweep respects reduced motion");
  await reducedPage.unroute("**/api/**"); await mockApis(reducedPage, true); await reducedPage.goto(`${ORIGIN}/watch`); const reducedLiveStage = reducedPage.locator(".watch-stage.is-live"); await reducedLiveStage.waitFor();
  assert.equal(await reducedPage.locator(".watch-hero").getAttribute("data-motion"), "static", "Watch hero motion gate remains static for reduced motion");
  assert.equal(await reducedPage.locator(".watch-hero__route--live").first().evaluate((element) => getComputedStyle(element).animationName), "none", "Watch hero transmission routes respect reduced motion");
  await reducedPage.locator(".watch-schedule").scrollIntoViewIfNeeded();
  assert.equal(await reducedPage.locator(".watch-schedule").getAttribute("data-motion"), "static");
  assert.deepEqual(await reducedPage.locator(".watch-schedule").evaluate((section) => [getComputedStyle(section.querySelector(".sparkling-sky__star")).animationName, getComputedStyle(section.querySelector(".watch-schedule__sweep")).animationName]), ["none", "none"], "Watch schedule night sky and orbit are static for reduced motion");
  assert.deepEqual(await reducedLiveStage.evaluate((element) => [getComputedStyle(element).animationName, getComputedStyle(element, "::before").animationName, getComputedStyle(element, "::after").animationName]), ["none", "none", "none"], "live glow remains strong but static when reduced motion is requested");
  assert.notEqual(await reducedLiveStage.evaluate((element) => getComputedStyle(element).boxShadow), "none");
  await reducedPage.goto(`${ORIGIN}/`); const reducedHomeLive = reducedPage.locator(".broadcast-card.live-event-perimeter"); await reducedHomeLive.waitFor();
  assert.deepEqual(await liveAnimations(reducedHomeLive), ["none", "none", "none"], "homepage live glow is static for reduced motion");
  await reducedPage.goto(`${ORIGIN}/watch/live?platform=youtube`); const reducedDedicatedLive = reducedPage.locator(".watch-theatre__stage.live-event-perimeter"); await reducedDedicatedLive.waitFor();
  assert.deepEqual(await liveAnimations(reducedDedicatedLive), ["none", "none", "none"], "dedicated live glow is static for reduced motion");
  await reducedContext.close();

  const jitterContext = await browser.newContext({ viewport: { width: 1024, height: 768 } }); const jitterPage = await jitterContext.newPage();
  await mockApis(jitterPage, false, { watch: () => livePayloadPastLease(60_000) });
  await jitterPage.goto(`${ORIGIN}/`);
  await jitterPage.locator(".promo-banner--live").waitFor();
  assert.equal(await jitterPage.locator(".header-watch").count(), 1, "header Live Now survives bounded positive-live lease jitter");
  await jitterPage.goto(`${ORIGIN}/watch`);
  await jitterPage.locator(".watch-stage.is-live").waitFor();
  await jitterContext.close();

  for (const scenario of [
    { name: "upcoming only", watch: () => { const item = candidate("upcoming"); return { ...watchPayload(false), primary: item, upcoming: item, latest: null, latestByPlatform: { youtube: null, rumble: null } }; }, banner: bannerPayload(), expected: "normal" },
    { name: "stale live snapshot", watch: () => ({ ...watchPayload(true), freshness: "stale", ageSeconds: 9999 }), banner: bannerPayload(), expected: "normal" },
    { name: "live lease beyond grace", watch: () => livePayloadPastLease(121_000), banner: bannerPayload(), expected: "normal" },
    { name: "live takeover disabled", watch: () => watchPayload(true), banner: { ...bannerPayload(), live: { ...bannerPayload().live, enabled: false } }, expected: "normal" },
    { name: "both disabled", watch: () => watchPayload(false), banner: { ...bannerPayload(), normal: { ...bannerPayload().normal, enabled: false }, live: { ...bannerPayload().live, enabled: false } }, expected: "none" },
  ]) {
    const scenarioContext = await browser.newContext({ viewport: { width: 1024, height: 768 } }); const scenarioPage = await scenarioContext.newPage();
    await mockApis(scenarioPage, false, { watch: scenario.watch, banner: () => scenario.banner });
    await scenarioPage.goto(`${ORIGIN}/`); await scenarioPage.locator("h1").waitFor();
    assert.equal(await scenarioPage.locator(".promo-banner--live").count(), 0, `${scenario.name} does not fabricate live takeover`);
    assert.equal(await scenarioPage.locator(".promo-banner--normal").count(), scenario.expected === "normal" ? 1 : 0, `${scenario.name} uses expected fallback`);
    await scenarioContext.close();
  }

  const restoreContext = await browser.newContext({ viewport: { width: 1024, height: 768 } }); const restorePage = await restoreContext.newPage(); let fixtureLive = true;
  await mockApis(restorePage, false, { watch: () => watchPayload(fixtureLive) });
  await restorePage.goto(`${ORIGIN}/`); await restorePage.locator(".promo-banner--live").waitFor(); fixtureLive = false;
  await restorePage.evaluate(() => globalThis.window.dispatchEvent(new Event("online")));
  await restorePage.locator(".promo-banner--normal").waitFor();
  assert.equal(await restorePage.locator(".promo-banner--live").count(), 0, "normal promo restores when the live snapshot ends without a reload");
  await restoreContext.close();
});

async function assertLivePerimeter(locator, label) {
  const effect = await locator.evaluate((element) => ({
    border: getComputedStyle(element).borderColor,
    shadow: getComputedStyle(element).boxShadow,
    stageAnimation: getComputedStyle(element).animationName,
    edgeAnimation: getComputedStyle(element, "::before").animationName,
    haloAnimation: getComputedStyle(element, "::after").animationName,
    haloContent: getComputedStyle(element, "::after").content,
  }));
  assert.match(effect.border, /255, (?:70|71|72|73|74|75)/, `${label} has the red live perimeter`);
  assert.notEqual(effect.shadow, "none", `${label} has the multi-layer live glow`);
  assert.equal(effect.stageAnimation, "watch-live-stage-breathe", `${label} breathes with the Watch treatment`);
  assert.equal(effect.edgeAnimation, "watch-live-edge-pulse", `${label} has pulsing edge brackets`);
  assert.equal(effect.haloAnimation, "watch-live-halo-pulse", `${label} has the outer pulsing halo`);
  assert.notEqual(effect.haloContent, "none", `${label} renders the halo layer`);
}

async function liveAnimations(locator) {
  return locator.evaluate((element) => [getComputedStyle(element).animationName, getComputedStyle(element, "::before").animationName, getComputedStyle(element, "::after").animationName]);
}

async function mockApis(page, live, options = {}) {
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/config") return json(route, authConfig());
    if (url.pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (url.pathname === "/api/analytics") return json(route, { ok: true, accepted: true });
    if (url.pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-28", rates: { CAD: 1, USD: .75 } });
    if (url.pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], updatedAt: null });
    if (url.pathname === "/api/catalogue/banner") return json(route, options.banner ? options.banner() : bannerPayload());
    if (url.pathname === "/api/watch") return json(route, options.watch ? options.watch() : watchPayload(live));
    if (url.pathname === "/api/watch/episodes") return json(route, { schema: "thirdrailify-watch-episodes-v1", items: [detailPayload().item, olderPayload().item], summary: { slotCount: 24, visibleCount: 2, placeholderCount: 22 } });
    if (url.pathname === `/api/watch/episodes/${ID}`) return json(route, detailPayload());
    if (url.pathname.startsWith("/api/watch/episodes/")) return json(route, { error: "episode_not_found" }, 404);
    return json(route, { error: "not_found" }, 404);
  });
}

async function measureStarScatter(sky) {
  return sky.evaluate((element) => {
    const stars = [...element.querySelectorAll(".sparkling-sky__star")].map((star) => ({
      x: Number.parseFloat(star.style.getPropertyValue("--sky-x")),
      y: Number.parseFloat(star.style.getPropertyValue("--sky-y")),
    }));
    const cells = Array(32).fill(0);
    for (const star of stars) cells[Math.min(3, Math.floor(star.y / 25)) * 8 + Math.min(7, Math.floor(star.x / 12.5))] += 1;
    let closePairs = 0;
    for (let first = 0; first < stars.length; first += 1) {
      for (let second = first + 1; second < stars.length; second += 1) {
        if (Math.hypot(stars[first].x - stars[second].x, stars[first].y - stars[second].y) < 2.2) closePairs += 1;
      }
    }
    const mean = stars.length / cells.length;
    return {
      emptyCells: cells.filter((count) => count === 0).length,
      denseCell: Math.max(...cells),
      variance: cells.reduce((total, count) => total + (count - mean) ** 2, 0) / cells.length,
      closePairs,
      uniqueX: new Set(stars.map((star) => star.x)).size,
      uniqueY: new Set(stars.map((star) => star.y)).size,
    };
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function consentCookie() { const now = Date.now(); return { name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }; }
function authConfig() { return { configured: true, emailSignupConfigured: true, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: "https://thirdrailify.pages.dev", adminOrigin: "https://thirdrailify-admin.pages.dev", environment: "test", cookieMode: "host-only" }; }
function candidate(state = "archive") { return { platform: "youtube", key: "youtube:abc123DEF45", contentId: "abc123DEF45", watchUrl: "https://www.youtube.com/watch?v=abc123DEF45", embedUrl: null, title: liveTitle(state), description: "Validated fixture description.", creatorName: "Third Railify", thumbnailUrl: null, providerState: state === "live" ? "live" : "completed", presentationState: state, publishedAt: "2026-08-27T03:00:00.000Z", scheduledStart: null, actualStart: state === "live" ? new Date(Date.now() - 60_000).toISOString() : null, actualEnd: state === "archive" ? "2026-08-27T04:00:00.000Z" : null, liveVerifiedAt: state === "live" ? new Date(Date.now() - 10_000).toISOString() : null, liveExpiresAt: state === "live" ? new Date(Date.now() + 180_000).toISOString() : null, viewerCount: state === "live" ? 12 : null, observedAt: new Date().toISOString() }; }
function liveTitle(state) { return state === "live" ? "Fixture live transmission" : "Fixture latest transmission"; }
function watchPayload(live) { const item = candidate(live ? "live" : "archive"); return { available: true, schema: "thirdrailify-broadcast-v1", generatedAt: new Date().toISOString(), retrievedAt: new Date().toISOString(), ageSeconds: 1, freshness: "fresh", liveNow: live ? [item] : [], primary: item, latest: item, latestByPlatform: { youtube: item, rumble: null }, upcoming: null, providerStatus: { youtube: { state: live ? "live" : "completed", checkedAt: new Date().toISOString() }, rumble: { state: "offline", checkedAt: new Date().toISOString() } } }; }
function livePayloadPastLease(milliseconds) { const payload = watchPayload(true); payload.liveNow[0].liveExpiresAt = new Date(Date.now() - milliseconds).toISOString(); return payload; }
function detailPayload() { const item = { ...candidate("archive"), id: ID, title: "Fixture retained transmission", archiveDate: "2026-08-27T04:00:00.000Z" }; return { schema: "thirdrailify-watch-episode-v1", item, archive: { position: 1, visibleCount: 1, previous: null, next: null } }; }
function olderPayload() { const item = { ...candidate("archive"), id: `ep_${"b".repeat(64)}`, key: "youtube:XYZ987abc12", contentId: "XYZ987abc12", watchUrl: "https://www.youtube.com/watch?v=XYZ987abc12", title: "Older retained transmission", publishedAt: "2026-08-26T03:00:00.000Z", observedAt: "2026-08-26T04:00:00.000Z", archiveDate: "2026-08-26T04:00:00.000Z" }; return { schema: "thirdrailify-watch-episode-v1", item, archive: { position: 2, visibleCount: 2, previous: null, next: null } }; }
function bannerPayload() { return { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: true, dismissible: true, messages: [{ text: "Fixture announcement one", ctaLabel: null, href: null, newTab: false }, { text: "Fixture announcement two", ctaLabel: "Watch", href: "/watch", newTab: false }], mode: "ticker", speed: "normal", glyph: "zap", glyphSize: "medium" }, live: { enabled: true, label: "LIVE NOW", showTitle: true, supportingText: "Confirmed by the Watch signal", ctaLabel: "WATCH NOW", ctaPath: "/watch/live", animation: "pulse-sweep", intensity: "normal" }, updatedAt: "2026-08-28T00:00:00.000Z" }; }
async function waitForPreview() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Preview is still starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite preview did not start."); }
