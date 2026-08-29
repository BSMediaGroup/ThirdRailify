import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_DEPLOY_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("deployed Wheels V1.6 is truthful to the genuine Public gallery and performs no writes", { skip: !ORIGIN }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" }); await addConsent(context); const page = await context.newPage();
  const writes = []; const documents = []; const errors = [];
  page.on("request", (request) => { const url = new URL(request.url()); if (request.resourceType() === "document") documents.push(url.pathname); if (url.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${url.pathname}`); });
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); }); page.on("pageerror", (error) => errors.push(error.message));
  const response = await context.request.get(`${ORIGIN}/api/wheels?sort=recent`); assert.equal(response.ok(), true); const projection = await response.json(); assert.equal(projection.count, projection.items.length); assert.ok(projection.items.length > 0, "staging has at least its genuine public fixture");
  await page.goto(`${ORIGIN}/wheels`, { waitUntil: "networkidle" }); const initialDocuments = documents.length; await page.locator(`a[href="/wheels/${projection.items[0].slug}"]`).first().click(); await page.getByRole("heading", { level: 1, name: projection.items[0].title }).waitFor();
  assert.equal(await page.locator("[data-site-shell]").count(), 1); assert.equal(await fits(page), true); const detail = await context.request.get(`${ORIGIN}/api/wheels/${projection.items[0].slug}`); assert.equal(detail.ok(), true); const detailPayload = await detail.json(); assert.equal(await page.locator(".wheel-control-page").evaluate((node) => getComputedStyle(node).getPropertyValue("--wheel-accent").trim().toUpperCase()), detailPayload.wheel.config.pointerAccent.toUpperCase());
  if (projection.items.length === 1) {
    assert.equal(await page.getByRole("button", { name: /Previous wheel unavailable; start of gallery/ }).isDisabled(), true); assert.equal(await page.getByRole("button", { name: /Next wheel unavailable; end of gallery/ }).isDisabled(), true); assert.match(await page.locator(".wheel-navigator").innerText(), /01 \/ 01/);
  } else {
    await page.locator("[data-site-shell]").evaluate((node) => node.setAttribute("data-v16-remote", "retained")); const next = projection.items[1]; await page.getByRole("button", { name: `Next wheel: ${next.title}` }).click(); await page.locator('[data-wheel-scene="outgoing"]').waitFor(); await page.locator('[data-wheel-scene="outgoing"]').waitFor({ state: "detached", timeout: 2500 }); await page.getByRole("heading", { level: 1, name: next.title }).waitFor(); assert.equal(await page.locator('[data-site-shell][data-v16-remote="retained"]').count(), 1); assert.equal(documents.length, initialDocuments); assert.equal(await fits(page), true);
  }
  await page.getByRole("button", { name: "Start demo spin" }).click(); await page.getByRole("dialog").waitFor({ timeout: 15_000 }); await page.getByRole("button", { name: "Close result" }).click(); assert.deepEqual(writes, []); assert.equal(documents.length, initialDocuments, "deployed wheel navigation and demo draw issue no document reload"); assert.deepEqual(errors, []); await context.close();
});

async function addConsent(context) { const now = Date.now(); await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2_592_000_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN }]); }
function fits(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1); }
