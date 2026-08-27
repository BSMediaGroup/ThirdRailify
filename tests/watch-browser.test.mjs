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
      assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true, `${route} has no overflow at ${width}x${height}`);
      assert.deepEqual(errors, [], `${route} has no console errors at ${width}x${height}`);
      if (route === "watch") {
        await page.locator(".episode-featured-grid .episode-card").first().waitFor();
        assert.equal(await page.locator(".episode-featured-grid .episode-card").count(), 6);
        assert.equal(await page.locator(".episode-featured-grid .episode-card--placeholder").count(), 5);
        assert.equal(await page.locator(".episode-featured-grid .episode-card:not(.episode-card--placeholder)").count(), 1);
        assert.equal(await page.getByRole("link", { name: /Open dedicated player/ }).getAttribute("href"), "/watch/live?platform=youtube");
      }
      if (route === "live") { await page.locator(".broadcast-player").waitFor(); assert.equal(await page.locator(".broadcast-player").count(), 1, "dedicated route has one player stack"); }
      if (route === "episodes") {
        assert.equal(await page.locator(".episode-gallery-grid .episode-card").count(), 24);
        assert.equal(await page.locator(".episode-gallery-grid .episode-card--placeholder").count(), 23);
        assert.equal(await page.locator(".episode-gallery-grid .episode-card--placeholder a").count(), 0, "placeholders are not clickable");
        assert.equal(await page.locator(".episode-gallery-grid .episode-card:not(.episode-card--placeholder) a").count() > 0, true, "retained episode remains actionable");
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
  await context.close();
});

async function mockApis(page, live) {
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/config") return json(route, authConfig());
    if (url.pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (url.pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-28", rates: { CAD: 1, USD: .75 } });
    if (url.pathname === "/api/watch") return json(route, watchPayload(live));
    if (url.pathname === "/api/watch/episodes") return json(route, { schema: "thirdrailify-watch-episodes-v1", items: [detailPayload().item], summary: { slotCount: 24, visibleCount: 1, placeholderCount: 23 } });
    if (url.pathname === `/api/watch/episodes/${ID}`) return json(route, detailPayload());
    if (url.pathname.startsWith("/api/watch/episodes/")) return json(route, { error: "episode_not_found" }, 404);
    return json(route, { error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function authConfig() { return { configured: true, emailSignupConfigured: true, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: "https://thirdrailify.pages.dev", adminOrigin: "https://thirdrailify-admin.pages.dev", environment: "test", cookieMode: "host-only" }; }
function candidate(state = "archive") { return { platform: "youtube", key: "youtube:abc123DEF45", contentId: "abc123DEF45", watchUrl: "https://www.youtube.com/watch?v=abc123DEF45", embedUrl: null, title: liveTitle(state), description: "Validated fixture description.", creatorName: "Third Railify", thumbnailUrl: null, providerState: state === "live" ? "live" : "completed", presentationState: state, publishedAt: "2026-08-27T03:00:00.000Z", scheduledStart: null, actualStart: state === "live" ? new Date(Date.now() - 60_000).toISOString() : null, actualEnd: state === "archive" ? "2026-08-27T04:00:00.000Z" : null, liveVerifiedAt: state === "live" ? new Date(Date.now() - 10_000).toISOString() : null, liveExpiresAt: state === "live" ? new Date(Date.now() + 180_000).toISOString() : null, viewerCount: state === "live" ? 12 : null, observedAt: new Date().toISOString() }; }
function liveTitle(state) { return state === "live" ? "Fixture live transmission" : "Fixture latest transmission"; }
function watchPayload(live) { const item = candidate(live ? "live" : "archive"); return { available: true, schema: "thirdrailify-broadcast-v1", generatedAt: new Date().toISOString(), retrievedAt: new Date().toISOString(), ageSeconds: 1, freshness: "fresh", liveNow: live ? [item] : [], primary: item, latest: item, latestByPlatform: { youtube: item, rumble: null }, upcoming: null, providerStatus: { youtube: { state: live ? "live" : "completed", checkedAt: new Date().toISOString() }, rumble: { state: "offline", checkedAt: new Date().toISOString() } } }; }
function detailPayload() { const item = { ...candidate("archive"), id: ID, title: "Fixture retained transmission", archiveDate: "2026-08-27T04:00:00.000Z" }; return { schema: "thirdrailify-watch-episode-v1", item, archive: { position: 1, visibleCount: 1, previous: null, next: null } }; }
async function waitForPreview() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Preview is still starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite preview did not start."); }
