import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_DEPLOY_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SLUG = "third-railify-demo-draw";

test("deployed Wheels V1.5 serves contained rim markers and overflow-free public surfaces", { skip: !ORIGIN }, async (t) => {
  const artifacts = fileURLToPath(new URL("../.artifacts/wheels-v15-deployed/", import.meta.url)); await mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" }); await addConsent(context); const page = await context.newPage(); const errors = []; const writes = [];
    page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); }); page.on("pageerror", (error) => errors.push(error.message)); page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${url.pathname}`); });
    await page.goto(`${ORIGIN}/wheels/${SLUG}`, { waitUntil: "networkidle" }); await page.getByRole("heading", { level: 1, name: /Third Railify Demo Draw/i }).waitFor(); await assertPageFits(page, `detail ${viewport.width}`); await assertRimContained(page);
    const wheelsStyle = await page.locator('link[rel="stylesheet"][href*="wheels-"]').first().getAttribute("href"); assert.ok(wheelsStyle); const css = await (await context.request.get(new URL(wheelsStyle, ORIGIN).href)).text(); assert.match(css, /markerTravelV15/); assert.match(css, /wheel-stage__rim--outer\{overflow:clip\}/); assert.doesNotMatch(css, /translateY\(-333px\)/);
    await page.screenshot({ path: `${artifacts}/wheel-detail-${viewport.width}.png`, fullPage: viewport.width > 400 });
    if (viewport.width === 1440) { await page.locator(".participant-list button").first().click(); const details = page.getByRole("dialog"); await details.waitFor(); await assertElementFits(details, "participant details"); await page.screenshot({ path: `${artifacts}/participant-details-1440.png` }); await page.getByRole("button", { name: "Close participant details" }).click(); }
    await page.goto(`${ORIGIN}/wheels/${SLUG}/present`, { waitUntil: "networkidle" }); assert.equal(await page.locator(".winner-confetti,.winner-lightshow").count(), 0); await assertPageFits(page, `presentation ${viewport.width}`); await assertRimContained(page); if (viewport.width === 1440) await page.screenshot({ path: `${artifacts}/presentation-1440.png` });
    assert.deepEqual(writes, []); assert.deepEqual(errors, []); await context.close();
  }
  const protectedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await addConsent(protectedContext); const protectedPage = await protectedContext.newPage(); await protectedPage.goto(`${ORIGIN}/wheels/${SLUG}/edit`, { waitUntil: "networkidle" }); await protectedPage.getByRole("dialog", { name: /Sign in required|Editor access required/ }).waitFor(); assert.equal(await protectedPage.getByLabel("Wheel title").count(), 0); await assertPageFits(protectedPage, "protected edit"); await protectedPage.screenshot({ path: `${artifacts}/protected-editor-1440.png` }); await protectedContext.close();
});

async function addConsent(context) { const now = Date.now(); await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2_592_000_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN }]); }
async function assertPageFits(page, label) { const result = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })); assert.ok(result.scrollWidth <= result.clientWidth + 1, `${label} has no horizontal overflow: ${JSON.stringify(result)}`); }
async function assertElementFits(locator, label) { const result = await locator.evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })); assert.ok(result.scrollWidth <= result.clientWidth + 1, `${label} has no horizontal overflow: ${JSON.stringify(result)}`); }
async function assertRimContained(page) { const result = await page.locator(".wheel-control-stage .wheel-stage__rim--outer").evaluate((rim) => { const bounds = rim.getBoundingClientRect(); const markers = [...rim.querySelectorAll("i")].filter((item) => getComputedStyle(item).display !== "none").map((item) => item.getBoundingClientRect()); return { markerCount: rim.querySelectorAll("i").length, overflow: getComputedStyle(rim).overflow, contained: markers.every((box) => box.left >= bounds.left - 1 && box.right <= bounds.right + 1 && box.top >= bounds.top - 1 && box.bottom <= bounds.bottom + 1) }; }); assert.equal(result.markerCount, 12); assert.match(result.overflow, /clip|hidden/); assert.equal(result.contained, true); }
