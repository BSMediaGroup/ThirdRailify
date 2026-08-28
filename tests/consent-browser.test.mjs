import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4196";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const COOKIE = "thirdrailify_consent";
const VERSION = 1;
const LIFETIME_MS = 183 * 24 * 60 * 60 * 1000;

test("consent model, first layer, preference centre, storage gating, media gating, withdrawal, and responsive UX", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4196"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  const clean = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cleanPage = await clean.newPage(); const cleanApiRequests = [];
  await mockApis(cleanPage, cleanApiRequests);
  await cleanPage.goto(`${ORIGIN}/watch`);
  await cleanPage.locator(".privacy-dock").waitFor();
  assert.equal(await cleanPage.getByRole("button", { name: "Accept all" }).count(), 1);
  assert.equal(await cleanPage.getByRole("button", { name: "Reject non-essential" }).count(), 1);
  assert.equal(await cleanPage.getByRole("button", { name: "Manage" }).count(), 1);
  const [acceptStyle, rejectStyle] = await Promise.all([
    buttonStyle(cleanPage, "Accept all"), buttonStyle(cleanPage, "Reject non-essential"),
  ]);
  assert.deepEqual(acceptStyle, rejectStyle, "Accept and Reject share the same first-layer hierarchy");
  assert.equal(await cleanPage.locator("iframe").count(), 0, "no provider iframe exists before consent");
  assert.deepEqual(await cleanPage.evaluate(() => Object.keys(localStorage).sort()), ["thirdrailify-commerce-cart-v2"], "only requested essential cart storage exists before choice");
  assert.equal(cleanApiRequests.includes("/api/auth/session"), true, "essential auth hydration remains available");
  assert.equal(cleanApiRequests.includes("/api/watch"), true, "ordinary Watch browsing remains available");
  await cleanPage.getByRole("link", { name: "Shop", exact: true }).first().click();
  await cleanPage.waitForURL(`${ORIGIN}/shop`);
  assert.equal(await cleanPage.locator(".privacy-dock").count(), 1, "navigation does not imply consent or dismiss the dock");

  const manage = cleanPage.getByRole("button", { name: "Manage" });
  await manage.click();
  const dialog = cleanPage.getByRole("dialog", { name: "Privacy choices" });
  await dialog.waitFor();
  assert.equal(await dialog.getByLabel("Essential is always on").count(), 1);
  assert.equal(await dialog.getByLabel("Preferences").isChecked(), false);
  assert.equal(await dialog.getByLabel("External media").isChecked(), false);
  await dialog.getByLabel("Preferences").focus();
  await cleanPage.keyboard.press("Space");
  assert.equal(await dialog.getByLabel("Preferences").isChecked(), true, "category toggles are keyboard operable");
  await cleanPage.keyboard.press("Space");
  await dialog.getByRole("button", { name: "Save choices" }).focus();
  await cleanPage.keyboard.press("Tab");
  assert.equal(await dialog.getByRole("button", { name: "Close privacy choices" }).evaluate((element) => element === document.activeElement), true, "Tab remains trapped in the preference centre");
  await cleanPage.keyboard.press("Escape");
  await assertEventually(async () => !(await dialog.isVisible()));
  assert.equal(await manage.evaluate((element) => element === document.activeElement), true, "Escape restores focus to Manage");
  await cleanPage.getByRole("button", { name: "Reject non-essential" }).click();
  assert.equal(await cleanPage.locator(".privacy-dock").count(), 0);
  assert.deepEqual((await consentFromPage(cleanPage)).categories, { preferences: false, externalMedia: false });
  await cleanPage.reload();
  assert.equal(await cleanPage.locator(".privacy-dock").count(), 0, "rejection is remembered after reload");
  assert.deepEqual(await cleanPage.evaluate(() => Object.keys(localStorage).sort()), ["thirdrailify-commerce-cart-v2"]);
  await clean.close();

  for (const scenario of [
    { name: "malformed", value: "%7Bbroken" },
    { name: "wrong version", value: consentValue({ version: 99 }) },
    { name: "expired", value: consentValue({ timestamp: Date.now() - LIFETIME_MS - 2000, expiry: Date.now() - 1000 }) },
    { name: "malformed categories", value: consentValue({ categories: { preferences: true } }) },
  ]) {
    const context = await browser.newContext();
    await context.addCookies([{ name: COOKIE, value: scenario.value, url: ORIGIN, sameSite: "Lax" }]);
    const page = await context.newPage(); await mockApis(page);
    await page.goto(ORIGIN);
    assert.equal(await page.locator(".privacy-dock").count(), 1, `${scenario.name} preference is ignored`);
    assert.equal(await page.locator("iframe").count(), 0);
    await context.close();
  }

  const normalizedContext = await browser.newContext();
  await normalizedContext.addCookies([{ name: COOKIE, value: consentValue({ categories: { preferences: true, externalMedia: false, invented: true } }), url: ORIGIN, sameSite: "Lax" }]);
  const normalizedPage = await normalizedContext.newPage(); await mockApis(normalizedPage);
  await normalizedPage.goto(ORIGIN);
  assert.equal(await normalizedPage.locator(".privacy-dock").count(), 0, "valid known categories survive unknown extra input without granting it");
  await normalizedPage.getByRole("button", { name: "Privacy choices" }).click();
  assert.equal(await normalizedPage.getByRole("dialog").getByLabel("Preferences").isChecked(), true);
  assert.equal(await normalizedPage.getByRole("dialog").getByLabel("External media").isChecked(), false);
  await normalizedContext.close();

  const acceptContext = await browser.newContext(); const acceptPage = await acceptContext.newPage();
  await mockApis(acceptPage); await acceptPage.goto(ORIGIN);
  await acceptPage.getByRole("button", { name: "Accept all" }).click();
  const accepted = await consentFromPage(acceptPage);
  assert.deepEqual(accepted.categories, { preferences: true, externalMedia: true });
  assert.equal(accepted.version, VERSION);
  assert.ok(Date.parse(accepted.expiry) - Date.parse(accepted.timestamp) >= LIFETIME_MS - 1000);
  await assertEventually(async () => (await acceptPage.evaluate(() => localStorage.getItem("thirdrailify.storefront.currency-rates.v1"))) !== null);
  await acceptPage.reload();
  assert.equal(await acceptPage.locator(".privacy-dock").count(), 0, "acceptance is valid across reload");
  await acceptContext.close();

  const granularContext = await browser.newContext(); const granularPage = await granularContext.newPage();
  await mockApis(granularPage); await granularPage.goto(ORIGIN);
  await granularPage.getByRole("button", { name: "Manage" }).click();
  await granularPage.getByRole("dialog").getByRole("heading", { level: 3, name: "Preferences" }).click();
  await granularPage.getByRole("dialog").getByRole("button", { name: "Save choices" }).click();
  assert.deepEqual((await consentFromPage(granularPage)).categories, { preferences: true, externalMedia: false }, "granular Save grants only the selected category");
  await granularContext.close();

  const mediaContext = await browser.newContext({ viewport: { width: 1024, height: 768 } }); const mediaPage = await mediaContext.newPage(); const providerRequests = [];
  await mockApis(mediaPage, [], providerRequests); await mediaPage.goto(`${ORIGIN}/watch`);
  await mediaPage.getByText("External media is disabled by your privacy settings.").waitFor();
  assert.equal(await mediaPage.locator("iframe").count(), 0);
  assert.deepEqual(providerRequests, []);
  await mediaPage.getByRole("button", { name: "Allow media & play" }).click();
  await mediaPage.locator('iframe[src^="https://rumble.com/embed/"]').waitFor();
  assert.deepEqual((await consentFromPage(mediaPage)).categories, { preferences: false, externalMedia: true }, "media-only grant does not enable Preferences");
  assert.equal(providerRequests.length, 1, "provider is requested only after media consent");
  await mediaPage.evaluate(() => {
    localStorage.setItem("thirdrailify.storefront.currency.v1", "AUD");
    localStorage.setItem("thirdrailify.storefront.currency-rates.v1", "fixture");
    localStorage.setItem("thirdrailify-goats-draft-v2", "fixture");
  });
  await mediaPage.getByRole("button", { name: "Privacy choices" }).click();
  const mediaDialog = mediaPage.getByRole("dialog");
  await mediaDialog.getByRole("heading", { level: 3, name: "External media" }).click();
  await mediaDialog.getByRole("button", { name: "Save choices" }).click();
  assert.equal(await mediaPage.locator("iframe").count(), 0, "withdrawing media unmounts the iframe immediately");
  assert.deepEqual(await mediaPage.evaluate(() => Object.keys(localStorage).sort()), ["thirdrailify-commerce-cart-v2"], "Preferences-off save removes all owned optional values");
  await mediaPage.reload();
  assert.equal(await mediaPage.locator("iframe").count(), 0, "withdrawal remains effective after reload");
  await mediaContext.close();

  for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" }); const page = await context.newPage();
    await mockApis(page); await page.goto(ORIGIN);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `dock has no overflow at ${width}x${height}`);
    for (const name of ["Accept all", "Reject non-essential", "Manage"]) assert.equal(await inViewport(page.getByRole("button", { name })), true, `${name} is visible at ${width}x${height}`);
    assert.equal(await page.locator(".privacy-dock").evaluate((element) => getComputedStyle(element).animationName), "none", "reduced motion disables dock animation");
    await page.getByRole("button", { name: "Manage" }).click();
    const bounds = await page.getByRole("dialog").boundingBox();
    assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= height, `preference centre fits ${width}x${height}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `dialog has no overflow at ${width}x${height}`);
    await context.close();
  }

  const policyContext = await browser.newContext({ viewport: { width: 1024, height: 768 } }); const policyPage = await policyContext.newPage();
  await mockApis(policyPage); await policyPage.goto(`${ORIGIN}/privacy#cookies-local-storage`);
  const storageSection = policyPage.locator("#cookies-local-storage");
  for (const text of ["thirdrailify_consent", "Preferences", "External media", "approximately six months"]) assert.equal(await storageSection.getByText(new RegExp(text, "i")).count() > 0, true, `privacy page includes ${text}`);
  assert.equal(await policyPage.getByText(/DPO|Article 27 representative/i).count(), 0, "no unsupported legal role is invented");
  await policyContext.close();
});

async function buttonStyle(page, name) {
  return page.getByRole("button", { name }).evaluate((element) => {
    const style = getComputedStyle(element); const box = element.getBoundingClientRect();
    return { className: element.className, height: Math.round(box.height), font: style.font, border: style.border, background: style.backgroundColor, color: style.color };
  });
}

async function inViewport(locator) {
  const box = await locator.boundingBox();
  if (!box) return false;
  const viewport = locator.page().viewportSize();
  return Boolean(viewport && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
}

async function consentFromPage(page) {
  return page.evaluate((name) => {
    const part = document.cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    return part ? JSON.parse(decodeURIComponent(part.slice(name.length + 1))) : null;
  }, COOKIE);
}

function consentValue(overrides = {}) {
  const now = Date.now();
  const record = {
    version: VERSION,
    timestamp: new Date(now).toISOString(),
    expiry: new Date(now + LIFETIME_MS).toISOString(),
    categories: { preferences: false, externalMedia: false },
    ...overrides,
  };
  if (typeof record.timestamp === "number") record.timestamp = new Date(record.timestamp).toISOString();
  if (typeof record.expiry === "number") record.expiry = new Date(record.expiry).toISOString();
  return encodeURIComponent(JSON.stringify(record));
}

async function mockApis(page, apiRequests = [], providerRequests = []) {
  await page.route("https://rumble.com/embed/**", (route) => { providerRequests.push(route.request().url()); return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Rumble fixture</title>" }); });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname; apiRequests.push(path);
    if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (path === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-28", rates: { CAD: 1, USD: .75, AUD: 1.1 } });
    if (path === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], updatedAt: null });
    if (path === "/api/catalogue/banner") return json(route, { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: false, messages: [], mode: "static", speed: "normal" }, live: { enabled: false }, updatedAt: "2026-08-28T00:00:00.000Z" });
    if (path === "/api/watch") return json(route, watchPayload());
    if (path === "/api/watch/episodes") return json(route, { schema: "thirdrailify-watch-episodes-v1", items: [], summary: { slotCount: 24, visibleCount: 0, placeholderCount: 24 } });
    return json(route, { error: "not_found" }, 404);
  });
}

function watchPayload() {
  const candidate = { platform: "rumble", key: "rumble:fixture", contentId: "fixture", watchUrl: "https://rumble.com/fixture", embedUrl: "https://rumble.com/embed/fixture", title: "Consent fixture", description: "Fixture", creatorName: "Third Railify", thumbnailUrl: null, providerState: "completed", presentationState: "archive", publishedAt: "2026-08-27T03:00:00.000Z", scheduledStart: null, actualStart: null, actualEnd: "2026-08-27T04:00:00.000Z", liveVerifiedAt: null, liveExpiresAt: null, viewerCount: null, observedAt: "2026-08-27T04:00:00.000Z" };
  return { available: true, schema: "thirdrailify-broadcast-v1", generatedAt: "2026-08-28T00:00:00.000Z", retrievedAt: "2026-08-28T00:00:01.000Z", ageSeconds: 1, freshness: "fresh", liveNow: [], primary: candidate, latest: candidate, latestByPlatform: { youtube: null, rumble: candidate }, upcoming: null, providerStatus: { youtube: { state: "offline", checkedAt: "2026-08-28T00:00:00.000Z" }, rumble: { state: "completed", checkedAt: "2026-08-28T00:00:00.000Z" } } };
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function assertEventually(predicate) { for (let attempt = 0; attempt < 50; attempt += 1) { if (await predicate()) return; await new Promise((resolve) => setTimeout(resolve, 20)); } assert.fail("condition did not become true"); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite consent test server did not start."); }
