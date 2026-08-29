import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_DEPLOY_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SLUG = "third-railify-demo-draw";

test("deployed Wheels V1.4 exposes the polished landing and finite demo celebration without writes", { skip: !ORIGIN }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await addConsent(context);
  const page = await context.newPage();
  const errors = [];
  const writes = [];
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${url.pathname}`); });
  const wheelResponse = await context.request.get(`${ORIGIN}/api/wheels/${SLUG}`);
  assert.equal(wheelResponse.ok(), true);
  const wheelPayload = await wheelResponse.json();
  const expectedParticles = wheelPayload.wheel.config.celebrationIntensity === "strong" ? 148 : wheelPayload.wheel.config.celebrationIntensity === "normal" ? 96 : 44;

  await page.goto(`${ORIGIN}/wheels`, { waitUntil: "networkidle" });
  const build = page.locator(".wheels-hero__actions .button--primary");
  const explore = page.getByRole("link", { name: /Explore public wheels/i });
  assert.match((await build.textContent()) || "", /Build a wheel|Log in for creator access/);
  assert.equal(await build.evaluate((node) => node.classList.contains("button--primary")), true);
  assert.equal(await explore.evaluate((node) => node.classList.contains("button--ghost")), true);
  const baselineDelta = await page.locator(".wheels-hero__actions").evaluate((node) => { const boxes = [...node.children].map((child) => child.getBoundingClientRect()); return Math.abs((boxes[0].top + boxes[0].height / 2) - (boxes[1].top + boxes[1].height / 2)); });
  assert.ok(baselineDelta < 2, `hero controls align: ${baselineDelta}`);
  assert.notEqual(await page.locator(".wheels-trust-rail").evaluate((node) => getComputedStyle(node).borderBottomStyle), "none");
  assert.equal(await noOverflow(page), true);

  await page.goto(`${ORIGIN}/wheels/${SLUG}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start demo spin" }).click();
  const result = page.getByRole("dialog");
  await result.waitFor({ timeout: 15_000 });
  assert.equal(await page.locator(".winner-confetti i").count(), expectedParticles, "deployed confetti uses the authoritative bounded intensity tier");
  assert.equal(await page.locator(".winner-lightshow").count(), 1);
  assert.equal(await result.getByRole("button", { name: "Close result" }).isEnabled(), true);
  await result.getByRole("button", { name: "Close result" }).click();
  assert.equal(await page.locator(".winner-confetti, .winner-lightshow").count(), 0);
  assert.equal(await noOverflow(page), true);
  assert.deepEqual(writes, [], "demo acceptance must not issue API writes");
  assert.deepEqual(errors, [], "stable V1.4 routes must not emit console errors");
  await context.close();

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await addConsent(reduced);
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${ORIGIN}/wheels/${SLUG}`, { waitUntil: "networkidle" });
  await reducedPage.getByRole("button", { name: "Start demo spin" }).click();
  await reducedPage.getByRole("dialog").waitFor({ timeout: 15_000 });
  assert.equal(await reducedPage.locator(".winner-confetti i").count(), 0);
  assert.equal(await reducedPage.locator(".winner-lightshow").count(), 1);
  assert.equal(await noOverflow(reducedPage), true);
  await reduced.close();
});

async function addConsent(context) {
  const now = Date.now();
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2_592_000_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN }]);
}

function noOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); }
