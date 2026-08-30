import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4206";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("slim configurable banners animate, dismiss safely, and align Live Now surfaces", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4206"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of [[1440, 900], [390, 844]]) {
    let live = false;
    let announcementMode = "ticker";
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await mockApis(page, () => live, () => announcementMode);

    await page.goto(ORIGIN);
    const normal = page.locator(".promo-banner--normal");
    await normal.waitFor();
    assert.equal(await page.locator(".site-rail").count(), 0, "the permanent yellow strip is removed");
    assert.equal(Math.round((await normal.boundingBox()).height), 31, `${width}px announcement banner is slimline`);
    assert.equal(await page.locator(".promo-banner__ticker .promo-banner__message").count(), 2, "a one-message ticker is duplicated into a seamless moving track");
    const tickerMotion = await page.locator(".promo-banner__ticker > div").evaluate((element) => {
      const animation = element.getAnimations()[0];
      return { name: getComputedStyle(element).animationName, duration: animation?.effect?.getTiming().duration };
    });
    assert.deepEqual(tickerMotion, { name: "promo-ticker", duration: 30000 });
    if (process.env.BANNER_V2_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-banner-v2-normal-${width}.png`), fullPage: false });
    if (width === 1440) {
      announcementMode = "crossfade";
      await page.reload();
      const crossfade = page.locator(".promo-banner--normal.is-crossfade .promo-banner__message");
      await crossfade.waitFor();
      assert.equal(await crossfade.evaluate((element) => getComputedStyle(element).animationName), "promo-crossfade-in");
      await page.getByText("SECOND CROSSFADE ANNOUNCEMENT").waitFor({ timeout: 6_000 });
      announcementMode = "ticker";
      await page.reload();
      await normal.waitFor();
    }
    await page.getByRole("button", { name: "Dismiss announcement" }).click();
    await normal.waitFor({ state: "detached" });
    await page.reload();
    assert.equal(await page.locator(".promo-banner--normal").count(), 0, "dismissal persists for the unchanged announcement configuration");

    live = true;
    await page.goto(`${ORIGIN}/watch`);
    const takeover = page.locator(".promo-banner--live");
    await takeover.waitFor();
    assert.equal(Math.round((await takeover.boundingBox()).height), 31, `${width}px live takeover is slimline`);
    const motion = await takeover.evaluate((element) => ({
      sweep: getComputedStyle(element, "::after").animationName,
      energy: getComputedStyle(element.querySelector(".promo-banner__energy")).animationName,
      pulse: getComputedStyle(element.querySelector(".promo-banner__live-mark > i")).animationName,
    }));
    assert.deepEqual(motion, { sweep: "live-banner-sweep", energy: "live-banner-energy", pulse: "live-banner-pulse" });
    assert.equal(await takeover.getByRole("button", { name: "Dismiss announcement" }).count(), 0, "the live takeover remains non-dismissible");

    const [headerLive, cart] = await Promise.all([page.locator(".header-watch").boundingBox(), page.locator(".cart-button").boundingBox()]);
    assert.ok(headerLive && cart);
    assert.equal(Math.round(headerLive.width), 42); assert.equal(Math.round(headerLive.height), 42);
    assert.equal(Math.round(headerLive.height), Math.round(cart.height), "header Live Now matches its neighboring action height");
    assert.equal(await page.locator(".header-watch").evaluate((element) => getComputedStyle(element).borderRadius), "9px");
    assert.equal(await page.locator(".header-watch .live-indicator").evaluate((element) => element.scrollWidth <= element.clientWidth), true, "header live icon and text remain fully legible");
    const status = page.locator(".broadcast-status--live").first();
    await status.waitFor();
    assert.equal(Math.round((await status.boundingBox()).height), 25, "page-level Live Now status uses slim padding without reducing its type");
    assert.equal(await status.evaluate((element) => getComputedStyle(element).fontSize), "8px");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    assert.deepEqual(errors, []);
    if (process.env.BANNER_V2_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-banner-v2-${width}.png`), fullPage: false });
    await context.close();
  }
});

async function mockApis(page, isLive, mode) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/watch") return json(route, watchPayload(isLive()));
    if (pathname === "/api/catalogue/banner") return json(route, bannerPayload(mode()));
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-30", rates: { CAD: 1 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], collections: [], updatedAt: null });
    if (pathname === "/api/community/discord") return json(route, { available: false });
    return json(route, { ok: true });
  });
}

function bannerPayload(mode = "ticker") {
  return {
    ok: true,
    schema: "thirdrailify-banner-v1",
    normal: { enabled: true, dismissible: true, messages: mode === "crossfade" ? [{ text: "FIRST CROSSFADE ANNOUNCEMENT", ctaLabel: null, href: null, newTab: false }, { text: "SECOND CROSSFADE ANNOUNCEMENT", ctaLabel: null, href: null, newTab: false }] : [{ text: "ONE MOVING ANNOUNCEMENT", ctaLabel: "WATCH", href: "/watch", newTab: false }], mode, speed: mode === "crossfade" ? "fast" : "normal" },
    live: { enabled: true, label: "LIVE NOW", showTitle: true, supportingText: "Confirmed by Watch", ctaLabel: "WATCH NOW", ctaPath: "/watch/live", animation: "pulse-sweep", intensity: "normal" },
    homeRail: { enabled: true, items: ["THIRD RAILIFY", "NEWS HANGOUT"], mode: "marquee", speed: "normal", easing: "linear", glyph: "zap", glyphSize: "medium" },
    updatedAt: "2026-08-30T00:00:00.000Z",
  };
}

function watchPayload(live) {
  const item = candidate(live ? "live" : "archive");
  return { available: true, schema: "thirdrailify-broadcast-v1", generatedAt: new Date().toISOString(), retrievedAt: new Date().toISOString(), ageSeconds: 1, freshness: "fresh", liveNow: live ? [item] : [], primary: item, latest: item, latestByPlatform: { youtube: item, rumble: null }, upcoming: null, providerStatus: { youtube: { state: live ? "live" : "completed", checkedAt: new Date().toISOString() }, rumble: { state: "offline", checkedAt: new Date().toISOString() } } };
}

function candidate(state) {
  return { platform: "youtube", key: "youtube:abc123DEF45", contentId: "abc123DEF45", watchUrl: "https://www.youtube.com/watch?v=abc123DEF45", embedUrl: null, title: state === "live" ? "Fixture live transmission" : "Fixture latest transmission", description: "Validated fixture description.", creatorName: "Third Railify", thumbnailUrl: null, providerState: state === "live" ? "live" : "completed", presentationState: state, publishedAt: "2026-08-27T03:00:00.000Z", scheduledStart: null, actualStart: state === "live" ? new Date(Date.now() - 60_000).toISOString() : null, actualEnd: state === "archive" ? "2026-08-27T04:00:00.000Z" : null, liveVerifiedAt: state === "live" ? new Date(Date.now() - 10_000).toISOString() : null, liveExpiresAt: state === "live" ? new Date(Date.now() + 180_000).toISOString() : null, viewerCount: state === "live" ? 12 : null, observedAt: new Date().toISOString() };
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* still starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite preview did not start."); }
