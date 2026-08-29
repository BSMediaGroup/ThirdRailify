import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:44230";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS = process.env.VIP_CARD_SCREENSHOT_DIR || "";

test("Home and Community share a responsive VIP card with excited hover sparkles and reduced-motion safety", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44230"], { stdio: "ignore" });
  t.after(() => server.kill()); await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  if (SCREENSHOTS) await mkdir(SCREENSHOTS, { recursive: true });

  for (const [route, scope] of [["/", ".home-vip-section"], ["/community", ".community-vip-feature"]]) {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
      await addConsent(context);
      const page = await context.newPage(); const errors = [];
      page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => { const url = new URL(response.url()); if (url.origin === ORIGIN && response.status() >= 400) errors.push(`${response.status()} ${url.pathname}`); });
      await mockApis(page);
      await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const card = page.locator(`${scope} .vip-feature-card`);
      await card.scrollIntoViewIfNeeded();
      assert.equal(await card.count(), 1, `${route} has one shared VIP card at ${width}px`);
      assert.equal(await card.locator(".vip-feature-card__field i").count(), 18, `${route} has the full sparkle field at ${width}px`);
      assert.equal(await card.locator(".vip-feature-card__pulse i").count(), 3, `${route} has three pulse rings at ${width}px`);
      assert.equal(await card.locator(".vip-feature-card__prism i").count(), 3, `${route} has three moving light layers at ${width}px`);
      assert.equal(await card.getByRole("link", { name: "Enter the VIP preview" }).getAttribute("href"), "/vip");
      assert.equal(await card.getByRole("button", { name: /buy|purchase|subscribe/i }).count(), 0, `${route} exposes no membership mutation`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `${route} has no horizontal overflow at ${width}px`);

      const resting = await card.evaluate((element) => {
        const sparkle = element.querySelector(".vip-feature-card__field i");
        return { boxShadow: getComputedStyle(element).boxShadow, transform: getComputedStyle(element).transform, sparkleAnimation: getComputedStyle(sparkle).animationName, sparkleDuration: Number.parseFloat(getComputedStyle(sparkle).animationDuration) };
      });
      assert.equal(resting.sparkleAnimation, "vipFeatureSparkle");
      if (width === 1440) {
        await card.hover(); await page.waitForTimeout(120);
        const excited = await card.evaluate((element) => {
          const sparkle = element.querySelector(".vip-feature-card__field i");
          return { boxShadow: getComputedStyle(element).boxShadow, transform: getComputedStyle(element).transform, sparkleDuration: Number.parseFloat(getComputedStyle(sparkle).animationDuration), borderAnimationDuration: Number.parseFloat(getComputedStyle(element, "::after").animationDuration) };
        });
        assert.notEqual(excited.boxShadow, resting.boxShadow, `${route} gains a stronger hover glow`);
        assert.notEqual(excited.transform, "none", `${route} lifts on hover`);
        assert.equal(excited.sparkleDuration < resting.sparkleDuration, true, `${route} accelerates sparkles on hover`);
        assert.equal(excited.borderAnimationDuration < 2, true, `${route} accelerates the luminous perimeter on hover`);
        await page.mouse.move(1, 1); await card.getByRole("link", { name: "Enter the VIP preview" }).focus();
        assert.equal(await card.evaluate((element) => element.matches(":focus-within")), true, `${route} shares the glow with keyboard focus`);
      }
      if (SCREENSHOTS) await card.screenshot({ path: path.join(SCREENSHOTS, `${route === "/" ? "home" : "community"}-vip-${width}.png`) });
      assert.deepEqual(errors, [], `${route} has no runtime errors at ${width}px`);
      await context.close();
    }
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await addConsent(reducedContext);
  const reducedPage = await reducedContext.newPage(); await mockApis(reducedPage);
  await reducedPage.goto(ORIGIN, { waitUntil: "domcontentloaded" });
  const reducedCard = reducedPage.locator(".home-vip-section .vip-feature-card"); await reducedCard.scrollIntoViewIfNeeded();
  const reduced = await reducedCard.evaluate((element) => ({
    sparkle: getComputedStyle(element.querySelector(".vip-feature-card__field i")).animationName,
    prism: getComputedStyle(element.querySelector(".vip-feature-card__prism i")).animationName,
    pulse: getComputedStyle(element.querySelector(".vip-feature-card__pulse i")).animationName,
    perimeter: getComputedStyle(element, "::after").animationName,
  }));
  assert.deepEqual(reduced, { sparkle: "none", prism: "none", pulse: "none", perimeter: "none" });
  await reducedCard.hover();
  assert.equal(await reducedCard.evaluate((element) => getComputedStyle(element).transform), "none", "reduced motion keeps the static glow without lift");
  await reducedContext.close();
});

async function addConsent(context) {
  const now = Date.now();
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
}

async function mockApis(page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, USD: .73 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], collections: [], updatedAt: null });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false }, homeRail: { enabled: false, items: [] } });
    if (pathname === "/api/community/discord") return json(route, { available: true, schema: "thirdrailify-discord-community-v1", freshness: "fresh", generatedAt: "2026-08-29T00:00:00.000Z", ageSeconds: 0, guild: { id: "fixture", name: "Third Railify", inviteUrl: "https://discord.com/invite/Bd8hU5aFxA" }, counts: { onlineMembers: 0 }, channels: [], voiceSpaces: [], members: [] });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("VIP feature card test server did not start."); }
