import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4196";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VIEWPORTS = [[1920, 1080], [1440, 900], [1365, 768], [1024, 768], [768, 1024], [390, 844]];

test("Watch and Episodes heroes keep their diagrams stable while the presentation fields animate responsively", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4196"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
    await context.addCookies([consentCookie()]);
    const page = await context.newPage();
    const errors = collectErrors(page);
    await mockApis(page);

    await page.goto(`${ORIGIN}/watch`, { waitUntil: "domcontentloaded" });
    await page.locator(".watch-hero.is-motion-active").waitFor({ timeout: 8_000 });
    assert.equal(await page.locator(".watch-signal-card").count(), 1, `Watch feature diagram remains present at ${width}px`);
    assert.equal(await page.locator(".watch-trail-bg").count(), 1);
    assert.equal(await page.locator(".watch-hero > .signal-field,.watch-hero__signal,.watch-hero__atmosphere").count(), 0, "legacy Watch background systems stay removed");
    assert.equal(await page.locator(".watch-trail-bg__trail--ghost").count(), 4);
    assert.equal(await page.locator(".watch-trail-bg__trail--pulse").count(), 2);
    assert.equal(await page.locator(".watch-trail-bg__nodes circle").count(), 4);
    assert.equal(await page.locator(".watch-trail-bg__constellation i").count(), 9);
    assert.notEqual(await animationName(page, ".watch-trail-bg__trail--pulse"), "none", `Watch trails animate at ${width}px`);
    if (width === 1440 || width === 390) await assertStrokeMotion(page, ".watch-trail-bg__trail--pulse", `Watch trail motion progresses at ${width}px`);
    await assertStableHero(page, ".watch-hero", ".watch-signal-card", width);
    if (process.env.WATCH_BROWSER_SCREENSHOTS === "1" && (width === 1440 || width === 390)) {
      await page.locator(".watch-hero").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-watch-hero-${width}.png`) });
    }

    await page.goto(`${ORIGIN}/watch/episodes`, { waitUntil: "domcontentloaded" });
    await page.locator(".episodes-signal-hero.is-motion-active").waitFor({ timeout: 8_000 });
    assert.equal(await page.locator(".archive-status").count(), 1, `Episodes feature diagram remains present at ${width}px`);
    assert.equal(await page.locator(".watch-trail-bg").count(), 1, "Episodes uses the shared trail environment");
    assert.equal(await page.locator(".episodes-signal-field").count(), 0, "the previous Episodes background is removed rather than visually muted");
    assert.equal(await page.locator(".watch-trail-bg__trail--ghost").count(), 4);
    assert.equal(await page.locator(".watch-trail-bg__trail--pulse").count(), 2);
    assert.equal(await page.locator(".watch-trail-bg__nodes circle").count(), 4);
    assert.equal(await page.locator(".watch-trail-bg__constellation i").count(), 9);
    assert.notEqual(await animationName(page, ".watch-trail-bg__trail--pulse"), "none", `Episodes trails animate at ${width}px`);
    if (width === 1440 || width === 390) await assertStrokeMotion(page, ".watch-trail-bg__trail--pulse", `Episodes trail motion progresses at ${width}px`);
    await assertStableHero(page, ".episodes-signal-hero", ".archive-status", width);
    if (process.env.WATCH_BROWSER_SCREENSHOTS === "1" && (width === 1440 || width === 390)) {
      await page.waitForTimeout(1_200);
      await page.locator(".episodes-signal-hero").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-watch-episodes-hero-${width}.png`) });
    }
    assert.deepEqual(errors, [], `hero routes remain console-clean at ${width}x${height}`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.addCookies([consentCookie()]);
  const page = await context.newPage();
  await mockApis(page);
  await page.goto(`${ORIGIN}/watch`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".watch-hero").getAttribute("data-motion"), "static");
  assert.equal(await animationName(page, ".watch-trail-bg__trail--pulse"), "none");
  assert.equal(await animationName(page, ".watch-trail-bg__beacon"), "none");
  await page.goto(`${ORIGIN}/watch/episodes`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".episodes-signal-hero").getAttribute("class"), "episodes-hero episodes-signal-hero");
  assert.equal(await page.locator(".episodes-signal-hero").getAttribute("data-motion"), "static");
  assert.equal(await animationName(page, ".watch-trail-bg__trail--pulse"), "none");
  assert.equal(await animationName(page, ".watch-trail-bg__beacon"), "none");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await context.close();
});

async function assertStableHero(page, heroSelector, diagramSelector, width) {
  const before = await page.locator(heroSelector).evaluate((hero, diagramSelector) => {
    const heroBox = hero.getBoundingClientRect();
    const diagramBox = hero.querySelector(diagramSelector).getBoundingClientRect();
    return { heroTop: heroBox.top, heroHeight: heroBox.height, diagramTop: diagramBox.top, diagramLeft: diagramBox.left };
  }, diagramSelector);
  await page.waitForTimeout(420);
  const after = await page.locator(heroSelector).evaluate((hero, diagramSelector) => {
    const heroBox = hero.getBoundingClientRect();
    const diagramBox = hero.querySelector(diagramSelector).getBoundingClientRect();
    return { heroTop: heroBox.top, heroHeight: heroBox.height, diagramTop: diagramBox.top, diagramLeft: diagramBox.left, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  }, diagramSelector);
  assert.ok(Math.abs(before.heroTop - after.heroTop) <= 1 && Math.abs(before.heroHeight - after.heroHeight) <= 1, `${heroSelector} does not shift at ${width}px`);
  assert.ok(Math.abs(before.diagramTop - after.diagramTop) <= 1 && Math.abs(before.diagramLeft - after.diagramLeft) <= 1, `${diagramSelector} stays fixed at ${width}px`);
  assert.equal(after.overflow, false, `${heroSelector} has no horizontal overflow at ${width}px`);
}

async function animationName(page, selector) { return page.locator(selector).first().evaluate((element) => getComputedStyle(element).animationName); }

async function assertStrokeMotion(page, selector, message) {
  const route = page.locator(selector).first();
  const before = await route.evaluate((element) => getComputedStyle(element).strokeDashoffset);
  await page.waitForTimeout(360);
  const after = await route.evaluate((element) => getComputedStyle(element).strokeDashoffset);
  assert.notEqual(after, before, message);
}

function collectErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { const url = new URL(response.url()); if (url.origin === ORIGIN && response.status() >= 400) errors.push(`${response.status()} ${url.pathname}`); });
  return errors;
}

async function mockApis(page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/analytics") return json(route, { ok: true, accepted: true });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-31", rates: { CAD: 1 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: null, collections: [], products: [] });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, latestByPlatform: { youtube: null, rumble: null }, upcoming: null, freshness: "unavailable" });
    if (pathname === "/api/watch/episodes") return json(route, { schema: "thirdrailify-watch-episodes-v1", items: [], summary: { slotCount: 24, visibleCount: 0, placeholderCount: 24 } });
    return json(route, { error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function consentCookie() { const now = Date.now(); return { name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }; }
async function waitForServer() { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Watch hero browser server did not start."); }
