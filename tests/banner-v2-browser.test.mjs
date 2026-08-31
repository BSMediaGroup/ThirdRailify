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

  for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
    let liveState = "off";
    let announcementMode = "ticker";
    let announcementEnabled = true;
    let announcementMalformed = false;
    let announcementUpdatedAt = "2026-08-30T00:00:00.000Z";
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await mockApis(page, () => liveState, () => announcementMode, () => announcementEnabled, () => announcementUpdatedAt, () => announcementMalformed);

    await page.goto(ORIGIN);
    const normal = page.locator(".promo-banner--normal");
    await normal.waitFor();
    assert.equal(await page.locator(".site-rail").count(), 0, "the permanent yellow strip is removed");
    assert.equal(Math.round((await normal.boundingBox()).height), 31, `${width}px announcement banner is slimline`);
    const dismissBox = await page.getByRole("button", { name: "Dismiss announcement" }).boundingBox();
    const normalBox = await normal.boundingBox();
    assert.ok(dismissBox && normalBox); assert.ok(Math.abs(normalBox.x + normalBox.width - dismissBox.x - dismissBox.width - 6) <= 1, `${width}px dismiss control is pinned to the banner's viewport edge`);
    const tickerSegments = page.locator(".promo-banner__ticker-track > .promo-banner__ticker-segment");
    assert.equal(await tickerSegments.count(), 2, "ticker renders two identical contiguous segments");
    await page.waitForFunction(() => { const ticker = document.querySelector(".promo-banner__ticker"); const segment = document.querySelector(".promo-banner__ticker-track > .promo-banner__ticker-segment"); return ticker && segment && segment.getBoundingClientRect().width > ticker.getBoundingClientRect().width; });
    const tickerGeometry = await page.locator(".promo-banner__ticker-track").evaluate((element) => { const segments = [...element.children]; const items = [...segments[0].querySelectorAll(":scope > .promo-banner__ticker-item")]; const messagesPerSet = new Set(items.map((item) => item.querySelector(".promo-banner__message > b")?.textContent)).size; const repetitions = items.length / messagesPerSet; const duration = element.getAnimations()[0]?.effect?.getTiming().duration; const finalDivider = segments[0].querySelector(":scope > .promo-banner__ticker-item:last-child .promo-banner__divider").getBoundingClientRect(); const followingMessage = segments[1].querySelector(":scope > .promo-banner__ticker-item:first-child .promo-banner__message").getBoundingClientRect(); return { name: getComputedStyle(element).animationName, cycleDuration: duration / repetitions, dividerToNextMessage: followingMessage.left - finalDivider.right, segmentWidths: segments.map((segment) => segment.getBoundingClientRect().width), trackWidth: element.getBoundingClientRect().width }; });
    assert.equal(tickerGeometry.name, "promo-ticker"); assert.equal(tickerGeometry.cycleDuration, 30000); assert.ok(Math.abs(tickerGeometry.segmentWidths[0] - tickerGeometry.segmentWidths[1]) < 1); assert.ok(Math.abs(tickerGeometry.trackWidth - tickerGeometry.segmentWidths[0] * 2) < 1); assert.ok(tickerGeometry.dividerToNextMessage >= (width <= 520 ? 17 : 25) && tickerGeometry.dividerToNextMessage <= (width <= 520 ? 19 : 27), "the final divider is immediately followed by the next repeated message set");
    assert.equal(await tickerSegments.first().locator(".promo-banner__ticker-item").count(), await tickerSegments.first().locator(".promo-banner__divider").count(), "every ticker divider sits between a message and its repeated successor");
    assert.equal(Math.round((await tickerSegments.first().locator(".promo-banner__divider").first().boundingBox()).width), 14);
    const announcementCta = page.locator('.promo-banner__ticker-track .promo-banner__message-link:not([tabindex="-1"])');
    assert.equal(await announcementCta.count(), 1, "only the first logical CTA remains keyboard-focusable");
    assert.deepEqual(await announcementCta.evaluate((element) => ({ border: getComputedStyle(element).borderStyle, decoration: getComputedStyle(element).textDecorationLine, height: Math.round(element.getBoundingClientRect().height) })), { border: "solid", decoration: "none", height: 22 });
    const headerBox = await page.locator(".site-header").boundingBox();
    assert.ok(headerBox && normalBox && headerBox.y >= normalBox.y + normalBox.height - 1, `${width}px header begins beneath the announcement`);
    await page.locator('a[href="/shawn"]').first().click();
    await page.waitForURL("**/shawn");
    await normal.waitFor();
    assert.equal(await normal.count(), 1, `${width}px announcement persists through an internal route transition`);
    await page.locator('a[href="/"]').first().click();
    await page.waitForURL((url) => url.pathname === "/");
    await normal.waitFor();
    if (process.env.BANNER_V2_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-banner-v2-normal-${width}.png`), fullPage: false });
    if (width === 1440) {
      announcementMode = "crossfade";
      await page.reload();
      const crossfade = page.locator(".promo-banner--normal.is-crossfade .promo-banner__message.is-active");
      await crossfade.waitFor();
      assert.equal(await page.locator(".promo-banner--normal.is-crossfade .promo-banner__divider").count(), 0, "crossfade mode never renders divider icons");
      assert.deepEqual(await crossfade.evaluate((element) => ({ duration: getComputedStyle(element).transitionDuration, easing: getComputedStyle(element).transitionTimingFunction })), { duration: "1.25s, 0s", easing: "cubic-bezier(0.4, 0, 0.2, 1), linear" });
      await page.getByText("SECOND CROSSFADE ANNOUNCEMENT").waitFor({ timeout: 6_000 });
      await page.waitForTimeout(300);
      const crossfadeOpacities = await page.locator(".promo-banner__crossfade .promo-banner__message").evaluateAll((elements) => elements.map((element) => Number(getComputedStyle(element).opacity)));
      assert.equal(crossfadeOpacities.every((opacity) => opacity > 0 && opacity < 1), true, "outgoing and incoming messages overlap during the eased crossfade");
      announcementMode = "static";
      await page.reload();
      await page.locator(".promo-banner--normal.is-static").waitFor();
      assert.equal(await page.locator(".promo-banner--normal.is-static .promo-banner__divider").count(), 0, "static mode never renders divider icons");
      announcementMode = "ticker";
      await page.reload();
      await normal.waitFor();
    }
    await page.getByRole("button", { name: "Dismiss announcement" }).click();
    await normal.waitFor({ state: "detached" });
    await page.reload();
    assert.equal(await page.locator(".promo-banner--normal").count(), 0, "dismissal persists for the unchanged announcement configuration");

    announcementUpdatedAt = "2026-08-30T00:05:00.000Z";
    await page.reload();
    await normal.waitFor();
    assert.equal(await normal.count(), 1, "an authoritative Admin republish revives a previously dismissed announcement");
    announcementEnabled = false;
    announcementUpdatedAt = "2026-08-30T00:06:00.000Z";
    await page.reload();
    assert.equal(await normal.count(), 0, "disabled announcement stays hidden");
    announcementEnabled = true;
    announcementUpdatedAt = "2026-08-30T00:07:00.000Z";
    announcementMalformed = true;
    await page.reload();
    assert.equal(await normal.count(), 0, "malformed announcement configuration fails closed in the Public shell");
    announcementMalformed = false;

    liveState = "stale";
    await page.reload();
    await normal.waitFor();
    assert.equal(await page.locator(".promo-banner--live").count(), 0, "stale live activity cannot take over the announcement");
    liveState = "expired";
    await page.reload();
    await normal.waitFor();
    assert.equal(await page.locator(".promo-banner--live").count(), 0, "expired live activity cannot take over the announcement");

    liveState = "live";
    await page.goto(ORIGIN);
    const takeover = page.locator(".promo-banner--live");
    await takeover.waitFor();
    assert.equal(await page.locator(".promo-banner--normal").count(), 0, "verified Live Now deliberately takes precedence over the enabled announcement");
    assert.equal(Math.round((await takeover.boundingBox()).height), 31, `${width}px live takeover is slimline`);
    const motion = await takeover.evaluate((element) => ({
      sweep: getComputedStyle(element, "::after").animationName,
      energy: getComputedStyle(element.querySelector(".promo-banner__energy")).animationName,
      pulse: getComputedStyle(element.querySelector(".promo-banner__live-mark > i")).animationName,
    }));
    assert.deepEqual(motion, { sweep: "live-banner-sweep", energy: "live-banner-energy", pulse: "live-banner-pulse" });
    const liveReadability = await takeover.evaluate((element) => {
      const mark = element.querySelector(".promo-banner__live-mark"); const signal = mark.querySelector("svg"); const cta = element.querySelector(".promo-banner__cta");
      return { markWrap: getComputedStyle(mark).whiteSpace, markFits: mark.scrollWidth <= mark.clientWidth, signalWidth: Math.round(signal.getBoundingClientRect().width), ctaFont: getComputedStyle(cta).fontSize };
    });
    assert.deepEqual(liveReadability, { markWrap: "nowrap", markFits: true, signalWidth: width <= 780 ? 0 : 12, ctaFont: width <= 520 ? "7.5px" : "9px" });
    assert.equal(await takeover.getByRole("button", { name: "Dismiss announcement" }).count(), 0, "the live takeover remains non-dismissible");

    const [headerLive, cart, account] = await Promise.all([page.locator(".header-watch").boundingBox(), page.locator(".cart-button").boundingBox(), page.locator(".account-login").boundingBox()]);
    assert.ok(headerLive && cart && account);
    assert.ok(headerLive.width > headerLive.height, `${width}px header Live Now is a horizontal content-sized chip`);
    assert.equal(Math.round(headerLive.height), 42, `${width}px header Live Now preserves the header action height`);
    assert.equal(Math.round(cart.height), 42, `${width}px cart geometry is unchanged`);
    assert.ok(cart.width >= 42, `${width}px cart retains its minimum control width`);
    assert.equal(Math.round(account.height), 42, `${width}px account geometry is unchanged`);
    assert.equal(await page.locator(".header-watch").evaluate((element) => getComputedStyle(element).borderRadius), "9px");
    const headerLiveReadability = await page.locator(".header-watch").evaluate((element) => {
      const indicator = element.querySelector(".live-indicator"); const label = indicator.querySelector("strong"); const style = getComputedStyle(element); const labelStyle = getComputedStyle(label);
      return { aspectRatio: style.aspectRatio, flexShrink: style.flexShrink, whiteSpace: labelStyle.whiteSpace, labelFits: label.scrollWidth <= label.clientWidth, indicatorFits: indicator.scrollWidth <= indicator.clientWidth, labelLines: label.getClientRects().length, fontSize: labelStyle.fontSize };
    });
    assert.deepEqual(headerLiveReadability, { aspectRatio: "auto", flexShrink: "0", whiteSpace: "nowrap", labelFits: true, indicatorFits: true, labelLines: 1, fontSize: width <= 420 ? "7.5px" : "8px" });
    const actionGeometry = await page.locator(".header-actions").evaluate((element) => {
      const boxes = [...element.children].map((child) => child.getBoundingClientRect()).filter((box) => box.width > 0 && box.height > 0);
      return { contained: element.scrollWidth <= element.clientWidth, separated: boxes.every((box, index) => index === 0 || boxes[index - 1].right <= box.left) };
    });
    assert.deepEqual(actionGeometry, { contained: true, separated: true }, `${width}px header actions neither overflow nor overlap`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `${width}px page has no horizontal overflow`);
    await page.locator(".header-watch").click();
    await page.waitForURL((url) => url.pathname === "/watch");
    const status = page.locator(".broadcast-status--live").first();
    await status.waitFor();
    assert.equal(Math.round((await status.boundingBox()).height), 25, "page-level Live Now status uses slim padding without reducing its type");
    assert.equal(await status.evaluate((element) => getComputedStyle(element).fontSize), "8px");
    assert.deepEqual(errors, []);
    if (process.env.BANNER_V2_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-banner-v2-${width}.png`), fullPage: false });
    await context.close();
  }

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  await mockApis(reducedPage, () => "off", () => "ticker", () => true, () => "2026-08-30T00:00:00.000Z", () => false);
  await reducedPage.goto(ORIGIN);
  await reducedPage.locator(".promo-banner--normal").waitFor();
  assert.equal(await reducedPage.locator(".promo-banner__ticker .promo-banner__message:visible").count(), 1, "reduced motion exposes one stable announcement");
  assert.equal(await reducedPage.locator(".promo-banner__ticker .promo-banner__divider:visible").count(), 0, "reduced motion leaves no orphan divider");
  await reducedContext.close();
});

async function mockApis(page, liveState, mode, announcementEnabled, announcementUpdatedAt, announcementMalformed) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/watch") return json(route, watchPayload(liveState()));
    if (pathname === "/api/catalogue/banner") {
      const payload = bannerPayload(mode(), announcementEnabled(), announcementUpdatedAt());
      if (announcementMalformed()) payload.normal.messages = [{ text: "", ctaLabel: null, href: null, newTab: false }];
      return json(route, payload);
    }
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-30", rates: { CAD: 1 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], collections: [], updatedAt: null });
    if (pathname === "/api/community/discord") return json(route, { available: false });
    return json(route, { ok: true });
  });
}

function bannerPayload(mode = "ticker", enabled = true, updatedAt = "2026-08-30T00:00:00.000Z") {
  return {
    ok: true,
    schema: "thirdrailify-banner-v1",
    normal: { enabled, dismissible: true, messages: mode === "crossfade" ? [{ text: "FIRST CROSSFADE ANNOUNCEMENT", ctaLabel: null, href: null, newTab: false }, { text: "SECOND CROSSFADE ANNOUNCEMENT", ctaLabel: null, href: null, newTab: false }] : [{ text: "ONE MOVING ANNOUNCEMENT", ctaLabel: "WATCH", href: "/watch", newTab: false }, { text: "SECOND MOVING ANNOUNCEMENT", ctaLabel: null, href: null, newTab: false }], mode, speed: mode === "crossfade" ? "fast" : "normal", glyph: "zap", glyphSize: "large" },
    live: { enabled: true, label: "LIVE NOW", showTitle: true, supportingText: "Confirmed by Watch", ctaLabel: "WATCH NOW", ctaPath: "/watch/live", animation: "pulse-sweep", intensity: "normal" },
    homeRail: { enabled: true, items: ["THIRD RAILIFY", "NEWS HANGOUT"], mode: "marquee", speed: "normal", easing: "linear", glyph: "zap", glyphSize: "medium" },
    updatedAt,
  };
}

function watchPayload(state) {
  const live = state !== "off";
  const item = candidate(live ? state : "archive");
  return { available: true, schema: "thirdrailify-broadcast-v1", generatedAt: new Date().toISOString(), retrievedAt: new Date().toISOString(), ageSeconds: 1, freshness: state === "stale" ? "stale" : "fresh", liveNow: live ? [item] : [], primary: item, latest: item, latestByPlatform: { youtube: item, rumble: null }, upcoming: null, providerStatus: { youtube: { state: live ? "live" : "completed", checkedAt: new Date().toISOString() }, rumble: { state: "offline", checkedAt: new Date().toISOString() } } };
}

function candidate(state) {
  const live = state !== "archive";
  return { platform: "youtube", key: "youtube:abc123DEF45", contentId: "abc123DEF45", watchUrl: "https://www.youtube.com/watch?v=abc123DEF45", embedUrl: null, title: live ? "Fixture live transmission" : "Fixture latest transmission", description: "Validated fixture description.", creatorName: "Third Railify", thumbnailUrl: null, providerState: live ? "live" : "completed", presentationState: live ? "live" : "archive", publishedAt: "2026-08-27T03:00:00.000Z", scheduledStart: null, actualStart: live ? new Date(Date.now() - 60_000).toISOString() : null, actualEnd: !live ? "2026-08-27T04:00:00.000Z" : null, liveVerifiedAt: live ? new Date(Date.now() - 10_000).toISOString() : null, liveExpiresAt: live ? new Date(Date.now() + (state === "expired" ? -180_000 : 180_000)).toISOString() : null, viewerCount: live ? 12 : null, observedAt: new Date().toISOString() };
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* still starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite preview did not start."); }
