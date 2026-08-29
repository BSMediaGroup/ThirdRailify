import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_DEPLOY_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SLUG = "third-railify-demo-draw";

test("deployed Wheels V1.2 public HUD, details, brand, protected edit, and presentation", { skip: !ORIGIN }, async (t) => {
  const artifacts = fileURLToPath(new URL("../.artifacts/wheels-v12-deployed/", import.meta.url));
  await mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await addConsent(context);
  const page = await context.newPage();
  const errors = [];
  const writes = [];
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { const url = new URL(request.url()); if (url.pathname.startsWith("/api/") && request.method() !== "GET" && request.method() !== "HEAD") writes.push(`${request.method()} ${request.url()}`); });

  await page.goto(`${ORIGIN}/wheels`, { waitUntil: "networkidle" });
  const heroMark = page.locator(".hero-wheel__hub .wheels-brand-mark");
  await heroMark.waitFor();
  await assertVisibleBrandMark(heroMark);
  await page.screenshot({ path: `${artifacts}/landing-1440.png`, fullPage: true });

  await page.route(`**/api/wheels/${SLUG}`, async (route) => { await new Promise((resolve) => setTimeout(resolve, 650)); await route.continue(); });
  const loading = page.goto(`${ORIGIN}/wheels/${SLUG}`);
  const loadingMark = page.locator(".wheel-route-state .wheels-brand-mark");
  await loadingMark.waitFor();
  await assertVisibleBrandMark(loadingMark);
  await page.screenshot({ path: `${artifacts}/loading-1440.png`, fullPage: true });
  await loading;
  await page.unroute(`**/api/wheels/${SLUG}`, { behavior: "wait" });
  await page.getByRole("heading", { level: 1, name: "Third Railify Demo Draw" }).waitFor();
  await page.getByText("POINTER TARGET").waitFor();
  assert.equal(await page.locator(".pointer-target-hud strong").textContent(), "Demo GOAT 01");
  await assertVisibleBrandMark(page.locator(".wheel-stage__hub .wheels-brand-mark"));
  await assertNoOverflow(page);
  await page.screenshot({ path: `${artifacts}/detail-hud-1440.png`, fullPage: true });

  await page.locator(".participant-list").getByRole("button", { name: /Demo GOAT 03/ }).click();
  const rowDialog = page.getByRole("dialog", { name: "Demo GOAT 03" });
  await rowDialog.waitFor();
  assert.match(await rowDialog.textContent(), /18\.18%.*2 of 11/s);
  await page.screenshot({ path: `${artifacts}/participant-row-1440.png` });
  await page.getByRole("button", { name: "Close participant details" }).click();

  const canvas = page.locator(".wheel-control-stage canvas");
  const canvasBox = await canvas.boundingBox();
  assert.ok(canvasBox);
  await canvas.click({ position: { x: canvasBox.width * .9, y: canvasBox.height * .5 } });
  const segmentDialog = page.getByRole("dialog", { name: "Demo GOAT 03" });
  await segmentDialog.waitFor();
  assert.match(await segmentDialog.textContent(), /18\.18%.*2 of 11/s);
  await page.screenshot({ path: `${artifacts}/participant-segment-1440.png` });
  await page.getByRole("button", { name: "Close participant details" }).click();

  await page.goto(`${ORIGIN}/wheels/${SLUG}/edit`, { waitUntil: "networkidle" });
  await page.getByRole("dialog", { name: "Sign in required" }).waitFor();
  assert.equal(await page.locator(".wheel-control-page").count(), 1);
  assert.equal(await page.locator(".wheel-control-stage canvas").count(), 1);
  assert.equal(await page.getByLabel("Wheel title").count(), 0);
  await page.screenshot({ path: `${artifacts}/protected-edit-1440.png`, fullPage: true });

  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${ORIGIN}/wheels/${SLUG}/present`, { waitUntil: "networkidle" });
    await page.getByText("POINTER TARGET").waitFor();
    const alignment = await page.evaluate(() => [document.querySelector(".presentation-bar>a"), document.querySelector(".presentation-bar>button")].map((control) => {
      const icon = control.querySelector("svg").getBoundingClientRect();
      const label = control.querySelector("span").getBoundingClientRect();
      return { delta: Math.abs((icon.top + icon.height / 2) - (label.top + label.height / 2)), iconTop: icon.top, labelTop: label.top };
    }));
    assert.ok(alignment.every(({ delta }) => delta < 2), `presentation icon/label centres align at ${viewport.width}: ${JSON.stringify(alignment)}`);
    await assertNoOverflow(page);
    await page.screenshot({ path: `${artifacts}/presentation-${viewport.width}.png`, fullPage: true });
  }

  assert.deepEqual(writes, [], "remote acceptance must not issue mutation requests");
  if (new URL(ORIGIN).hostname === "thirdrailify.pages.dev") assert.deepEqual(errors, [], "stable Wheels pages must not emit page-origin console errors");
});

async function addConsent(context) {
  const now = Date.now();
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2_592_000_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN }]);
}

async function assertVisibleBrandMark(locator) {
  const dimensions = await locator.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { width: box.width, height: box.height, source: node.getAttribute("data-brand-source"), path: node.querySelector("path")?.getAttribute("d") || "" };
  });
  assert.ok(dimensions.width > 20 && dimensions.height > 20, `brand mark has visible dimensions: ${JSON.stringify(dimensions)}`);
  assert.match(dimensions.source || "", /trzap-0|data:image\/svg\+xml/);
  assert.match(dimensions.path, /^M875\.185,1122\.86/);
}

async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
}
