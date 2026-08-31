import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4201";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = join(tmpdir(), "thirdrailify-featured-merchandising-browser");
const IMAGE = "https://images.example.test/featured-fixture.svg";

test("Home and Shop keep fixed Featured slots with zero and partial authoritative inventory", async (t) => {
  await mkdir(RESULTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4201"], { stdio: "ignore" });
  t.after(() => server.kill()); await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  const zeroCatalogue = catalogue([fixtureProduct("normal-a"), fixtureProduct("normal-b")]);

  for (const [width, height] of [[1920, 1080], [1440, 900], [768, 1024], [390, 844]]) {
    const { context, page, errors } = await fixturePage(browser, width, height, zeroCatalogue);
    await page.goto(`${ORIGIN}/`); await page.locator('.merch-preview [data-featured-state="empty"]').first().waitFor();
    assert.equal(await page.locator(".merch-preview .product-card").count(), 0);
    assert.equal(await page.locator('.merch-preview [data-featured-state="empty"]').count(), 3);
    assert.equal(await page.locator('.merch-preview a[href^="/shop/"]').count(), 0);
    assert.equal(await noOverflow(page), true, `Homepage zero Featured overflow at ${width}`);
    if (width === 1440) await page.screenshot({ path: join(RESULTS, "homepage-zero-featured-1440.png"), fullPage: true });
    await page.goto(`${ORIGIN}/shop`); await page.locator('.featured-stage [data-featured-state="empty"]').first().waitFor();
    assert.equal(await page.locator(".featured-stage__active[href]").count(), 0);
    assert.equal(await page.locator('.featured-stage [data-featured-state="empty"]').count(), 3);
    assert.equal(await page.locator('.featured-stage a[href^="/shop/"]').count(), 0);
    assert.equal(await noOverflow(page), true, `Shop zero Featured overflow at ${width}`);
    assert.deepEqual(errors, []);
    if (width === 1440) await page.screenshot({ path: join(RESULTS, "shop-zero-featured-1440.png"), fullPage: true });
    await context.close();
  }

  const partialCatalogue = catalogue([fixtureProduct("featured-one", { featured: true, featuredOrder: 10 }), fixtureProduct("normal-a"), fixtureProduct("normal-b")]);
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const { context, page, errors } = await fixturePage(browser, width, height, partialCatalogue);
    await page.goto(`${ORIGIN}/`); await page.locator(".merch-preview .product-card").waitFor();
    assert.equal(await page.locator(".merch-preview .product-card").count(), 1);
    assert.equal(await page.locator('.merch-preview [data-featured-state="empty"]').count(), 2);
    assert.deepEqual(await featuredSlugs(page, ".merch-preview"), ["featured-one"]);
    assert.equal(await noOverflow(page), true, `Homepage partial Featured overflow at ${width}`);
    if (width === 1440) await page.screenshot({ path: join(RESULTS, "homepage-partial-featured-1440.png"), fullPage: true });
    await page.goto(`${ORIGIN}/shop`); await page.locator(".featured-stage__active[href]").waitFor();
    assert.equal(await page.locator(".featured-stage__active[href]").count(), 1);
    assert.equal(await page.locator('.featured-stage [data-featured-state="empty"]').count(), 2);
    assert.deepEqual(await featuredSlugs(page, ".featured-stage"), ["featured-one"]);
    assert.equal(await noOverflow(page), true, `Shop partial Featured overflow at ${width}`);
    assert.deepEqual(errors, []);
    if (width === 1440) await page.screenshot({ path: join(RESULTS, "shop-partial-featured-1440.png"), fullPage: true });
    await context.close();
  }
});

test("catalogue failure is visually distinct from valid zero Featured inventory", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4201"], { stdio: "ignore" });
  t.after(() => server.kill()); await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  const { context, page } = await fixturePage(browser, 1440, 900, null, 503);
  await page.goto(`${ORIGIN}/`); await page.locator('.merch-preview [data-featured-state="error"]').first().waitFor();
  assert.equal(await page.getByText("NO FEATURED PRODUCT", { exact: true }).count(), 0);
  assert.equal(await page.locator('.merch-preview [data-featured-state="error"]').count(), 3);
  await page.goto(`${ORIGIN}/shop`); await page.locator('.featured-stage [data-featured-state="error"]').first().waitFor();
  assert.equal(await page.getByText("NO FEATURED PRODUCT", { exact: true }).count(), 0);
  assert.equal(await page.locator('.featured-stage [data-featured-state="error"]').count(), 3);
  await context.close();
});

async function fixturePage(browser, width, height, payload, catalogueStatus = 200) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86400000).toISOString(), categories: { preferences: true, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
  const page = await context.newPage(); const errors = [];
  page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(IMAGE, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="100%" height="100%" fill="#171717"/><path d="M80 375h440" stroke="#f0c419" stroke-width="38"/></svg>' }));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (path === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (path === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-31", rates: { CAD: 1, USD: .73 } });
    if (path === "/api/commerce/catalogue") return json(route, payload ?? { ok: false, error: "catalogue_unavailable" }, catalogueStatus);
    if (path === "/api/catalogue/banner") return json(route, { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: false, dismissible: false, messages: [], mode: "static", speed: "normal" }, live: { enabled: false }, homeRail: { enabled: false, items: [], mode: "static", speed: "normal", easing: "linear", glyph: "zap", glyphSize: "small" }, updatedAt: "2026-08-31T00:00:00.000Z" });
    if (path === "/api/community/discord") return json(route, { available: true, schema: "thirdrailify-discord-community-v1", freshness: "fresh", generatedAt: "2026-08-31T00:00:00.000Z", ageSeconds: 0, guild: { id: "fixture", name: "Third Railify", inviteUrl: "https://discord.com/invite/Bd8hU5aFxA" }, counts: { onlineMembers: 0 }, channels: [], voiceSpaces: [], members: [] });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
  return { context, page, errors };
}

function catalogue(products) { return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-31T00:00:00.000Z", collections: [], products }; }
function fixtureProduct(id, overrides = {}) { return { id, slug: id, title: id.replaceAll("-", " "), description: "Fixture product.", images: [IMAGE], categories: [], collectionSlugs: [], tags: [], featured: false, featuredOrder: null, displayOrder: 100, maxQuantity: 5, available: true, price: { minUnitAmount: 3000, maxUnitAmount: 3000, label: "CA$30.00" }, variants: [{ id: `${id}-variant`, label: "Standard", size: null, color: null, options: {}, unitAmount: 3000, currency: "CAD", availability: "active" }], ...overrides }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function noOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); }
async function featuredSlugs(page, root) { return page.locator(`${root} a`).evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute("href")).filter((href) => href?.startsWith("/shop/")).map((href) => href.slice("/shop/".length)))]); }
async function waitForServer() { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Featured merchandising test server did not start."); }
