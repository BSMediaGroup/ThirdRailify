import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4207";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = path.resolve(".artifacts/gaming-public");
const SCREENSHOTS = process.env.GAMING_BROWSER_SCREENSHOTS === "1";

test("Gaming route is responsive, accessible, content-complete, and theme-scoped", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4207"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  if (SCREENSHOTS) await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of [[1920, 1080], [1440, 1000], [1024, 900], [768, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await installTurnstile(context);
    const page = await context.newPage();
    const errors = collectBrowserErrors(page);
    await mockApis(page, []);
    await page.goto(`${ORIGIN}/gaming`);
    await page.getByRole("heading", { level: 1, name: /Third Railify\s*Gaming/i }).waitFor();
    await dismissPrivacy(page);

    assert.equal(await page.locator("html").evaluate((root) => root.classList.contains("theme-gaming")), true);
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `no overflow at ${width}x${height}`);
    assert.equal(await page.locator('.gaming-hero a[href="https://rumble.com/thirdrailifygaming"]').count(), 1);
    assert.deepEqual(await page.locator(".gaming-schedule > div > span > strong").allTextContents(), ["MON", "TUE", "THU", "FRI"]);
    assert.deepEqual(await page.locator(".gaming-schedule > div > span > small").allTextContents(), ["2 PM", "2 PM", "2 PM", "2 PM"]);
    assert.equal(await page.locator(".gaming-card").count(), 4);
    assert.deepEqual(await page.locator(".gaming-card h3").allTextContents(), ["WITCHER", "LUMINARY", "SUPER MARIO WORLD", "PARTY ANIMAL"]);
    assert.deepEqual(await page.locator(".gaming-card__platform").allTextContents(), ["PC via Steam", "PC via Steam", "PC via Steam", "PC via Steam"]);
    assert.equal(await page.locator('.gaming-card a[href="https://store.steampowered.com/app/1648360/Luminary/"]').count(), 1);
    assert.equal(await page.locator('.gaming-card a[href*="store.steampowered.com/app/"]').count(), 1);
    assert.equal(await page.locator('.gaming-card[data-cover="fallback"]').count() >= 3, true);
    assert.equal(await page.title(), "Third Railify Gaming | Third Railify");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${ORIGIN}/gaming`);

    if (SCREENSHOTS && [1920, 1440, 390].includes(width)) {
      await page.screenshot({ path: path.join(ARTIFACTS, `hero-${width}x${height}.png`), fullPage: false });
      await page.locator(".gaming-about").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(ARTIFACTS, `about-${width}x${height}.png`), fullPage: false });
      await page.locator(".gaming-rotation").scrollIntoViewIfNeeded();
      await page.locator(".gaming-card--luminary img").evaluate((image) => image.complete && image.naturalWidth > 0 ? true : new Promise((resolve) => { image.addEventListener("load", () => resolve(true), { once: true }); image.addEventListener("error", () => resolve(false), { once: true }); }));
      await page.screenshot({ path: path.join(ARTIFACTS, `rotation-${width}x${height}.png`), fullPage: false });
    }

    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      assert.equal(await page.locator('.mobile-nav a[href="/gaming"]').getByText("Gaming", { exact: true }).isVisible(), true);
      await page.getByRole("button", { name: "Close navigation" }).click();
    }

    assert.deepEqual(errors, [], `browser errors at ${width}x${height}`);
    await context.close();
  }
});

test("Gaming request form normalizes exact Steam listings and preserves input after a safe backend failure", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4208"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer("http://127.0.0.1:4208");
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installTurnstile(context);
  const page = await context.newPage();
  const submissions = [];
  await mockApis(page, submissions, { failFirstSuggestion: true });
  await page.goto("http://127.0.0.1:4208/gaming#suggest");
  await dismissPrivacy(page);
  await page.locator(".gaming-form").scrollIntoViewIfNeeded();
  if (SCREENSHOTS) { await mkdir(ARTIFACTS, { recursive: true }); await page.screenshot({ path: path.join(ARTIFACTS, "suggestion-form-1440x1000.png"), fullPage: false }); }
  await page.locator('input[name="gameTitle"]').fill("Risk of Rain 2");
  assert.equal(await page.getByRole("link", { name: /Search Steam for Risk of Rain 2/ }).getAttribute("href"), "https://store.steampowered.com/search/?term=Risk%20of%20Rain%202");
  await page.locator('input[name="steamUrl"]').fill("https://store.steampowered.com/app/632360/Risk_of_Rain_2/");
  await page.locator('textarea[name="pitch"]').fill("A co-op run with enough chaos to earn the slot.");
  const submit = page.getByRole("button", { name: /Submit request/ });
  await assertEventually(async () => !(await submit.isDisabled()));
  await submit.click();
  await page.getByRole("alert").getByText("The request queue is temporarily unavailable.", { exact: true }).waitFor();
  assert.equal(await page.locator('input[name="gameTitle"]').inputValue(), "Risk of Rain 2");
  assert.equal(await page.locator('textarea[name="pitch"]').inputValue(), "A co-op run with enough chaos to earn the slot.");
  await assertEventually(async () => !(await submit.isDisabled()));
  await submit.click();
  await page.getByText("Signal received.", { exact: true }).waitFor();
  assert.equal(submissions.length, 2);
  assert.equal(submissions[1].gameTitle, "Risk of Rain 2");
  assert.equal(submissions[1].steamUrl, "https://store.steampowered.com/app/632360/");
  assert.equal(submissions[1].turnstileToken, "fixture-gaming-token");
  if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "suggestion-success-1440x1000.png"), fullPage: false });
});

test("Gaming motion respects reduced motion and the green root theme is removed on SPA navigation", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4209"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer("http://127.0.0.1:4209");
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await installTurnstile(context);
  const page = await context.newPage();
  await mockApis(page, []);
  await page.goto("http://127.0.0.1:4209/gaming");
  await dismissPrivacy(page);
  assert.equal(await page.locator(".gaming-hero").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".gaming-instrument__orbit--outer").evaluate((node) => getComputedStyle(node).animationName), "none");
  const gamingScrollbar = await page.locator("html").evaluate((node) => getComputedStyle(node).scrollbarColor);
  assert.match(gamingScrollbar, /69, 227, 125|rgb\(69 227 125\)/);
  if (SCREENSHOTS) { await mkdir(ARTIFACTS, { recursive: true }); await page.screenshot({ path: path.join(ARTIFACTS, "gaming-scrollbar-reduced-motion-1280x900.png"), fullPage: false }); }
  await page.locator('.site-footer a[href="/shop"]').evaluate((link) => link.click());
  await page.waitForURL("http://127.0.0.1:4209/shop");
  assert.equal(await page.locator("html").evaluate((root) => root.classList.contains("theme-gaming")), false);
  const standardScrollbar = await page.locator("html").evaluate((node) => getComputedStyle(node).scrollbarColor);
  assert.notEqual(standardScrollbar, gamingScrollbar);
  if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "normal-shop-theme-restored-1280x900.png"), fullPage: false });
  await page.goBack();
  await page.waitForURL("http://127.0.0.1:4209/gaming");
  assert.equal(await page.locator("html").evaluate((root) => root.classList.contains("theme-gaming")), true);
  await page.locator(".gaming-close").scrollIntoViewIfNeeded();
  if (SCREENSHOTS) await page.screenshot({ path: path.join(ARTIFACTS, "closing-cta-reduced-motion-1280x900.png"), fullPage: false });
});

async function installTurnstile(context) {
  await context.addInitScript(() => {
    let currentOptions;
    window.turnstile = {
      render(container, options) { currentOptions = options; container.textContent = "Human verification complete"; setTimeout(() => options.callback("fixture-gaming-token"), 0); return "gaming-widget"; },
      reset() { setTimeout(() => currentOptions?.callback("fixture-gaming-token"), 0); }, remove() {},
    };
  });
}

async function mockApis(page, submissions, options = {}) {
  let suggestionAttempts = 0;
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/gaming/suggestions") {
      suggestionAttempts += 1;
      submissions.push(JSON.parse(route.request().postData() || "{}"));
      if (options.failFirstSuggestion && suggestionAttempts === 1) return json(route, { ok: false, error: "relay_unavailable", message: "The request queue is temporarily unavailable." }, 503);
      return json(route, { ok: true, reference: "GAM-TEST0001", message: "Your game request entered the Third Railify Gaming queue." });
    }
    if (pathname === "/api/auth/config") { const requestOrigin = new URL(route.request().url()).origin; return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: "fixture-site-key", oauthProviders: [], oauthProviderStates: [], publicOrigin: requestOrigin, adminOrigin: requestOrigin, environment: "test", cookieMode: "host-only" }); }
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-09-01", rates: { CAD: 1, USD: .73 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], collections: [], updatedAt: null });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/community/discord") return json(route, { available: false, channels: [], voiceSpaces: [], members: [] });
    if (pathname === "/api/analytics") return json(route, { ok: true });
    return json(route, { error: "not_found" }, 404);
  });
}

function collectBrowserErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return errors;
}
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function dismissPrivacy(page) { const dock = page.locator(".privacy-dock"); if (await dock.isVisible()) await dock.getByRole("button", { name: "Reject non-essential" }).click(); }
async function waitForServer(origin = ORIGIN) { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(origin)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`Vite Gaming test server did not start at ${origin}.`); }
async function assertEventually(assertion) { for (let attempt = 0; attempt < 80; attempt += 1) { if (await assertion()) return; await new Promise((resolve) => setTimeout(resolve, 25)); } assert.fail("condition did not become true"); }
