import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_DEPLOY_ORIGIN;
const WHEEL_SLUG = process.env.WHEELS_DEPLOY_WHEEL_SLUG || "wheel-of-names-test";
const STAGE_SLUG = process.env.WHEELS_DEPLOY_STAGE_SLUG || "sample-stage";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = fileURLToPath(new URL("../.artifacts/wheels-mechanics-v2-deployed/", import.meta.url));

test("deployed Mechanics V2 keeps Demo spins authoritative, exact, responsive, and mutation-free", { skip: !ORIGIN }, async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "no-preference" });
  await addConsent(context);
  const page = await context.newPage();
  await stabilizePreview(page);
  const evidence = monitor(page);
  await page.goto(`${ORIGIN}/wheels/${WHEEL_SLUG}`, { waitUntil: "networkidle" });
  const canvas = page.locator(".wheel-stage canvas").first();
  await canvas.waitFor();
  assert.equal(await fits(page), true);
  assert.equal(evidence.mechanicsRequests, 0);
  await page.screenshot({ path: `${ARTIFACTS}/preview-wheel-desktop-idle.png` });

  const started = performance.now();
  await page.getByRole("button", { name: "Start demo spin" }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${ARTIFACTS}/preview-wheel-desktop-in-motion.png` });
  await page.getByRole("dialog").waitFor({ timeout: 15_000 });
  const elapsed = performance.now() - started;
  const metrics = await canvas.evaluate((node) => structuredClone(node.__wheelSpinV110));
  assert.equal(evidence.mechanicsRequests, 1);
  assert.equal(metrics.version, "wheel-spin-v2");
  assert.equal(metrics.mechanicsVersion, 2);
  assert.equal(metrics.durationMs, 10_000);
  assert.equal(metrics.completed, true);
  assert.ok(Math.abs(metrics.settledAt - metrics.startAt - metrics.durationMs) < 75, JSON.stringify(metrics));
  assert.ok(elapsed >= 9_950 && elapsed < 10_800, String(elapsed));
  assert.ok(Math.abs(metrics.actualFinalFrameDelta - metrics.expectedFinalFrameDelta) < 1e-7, JSON.stringify(metrics));
  await page.screenshot({ path: `${ARTIFACTS}/preview-wheel-desktop-settled.png` });
  assert.deepEqual(evidence.writes, []);
  assert.deepEqual(evidence.errors, []);

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
  await addConsent(mobileContext);
  const mobile = await mobileContext.newPage();
  await stabilizePreview(mobile);
  const mobileEvidence = monitor(mobile);
  await mobile.goto(`${ORIGIN}/wheels/${WHEEL_SLUG}/present`, { waitUntil: "networkidle" });
  await mobile.locator(".wheel-stage canvas").first().waitFor();
  assert.equal(await fits(mobile), true);
  assert.equal(mobileEvidence.mechanicsRequests, 0);
  assert.deepEqual(mobileEvidence.writes, []);
  assert.deepEqual(mobileEvidence.errors, []);
  await mobile.screenshot({ path: `${ARTIFACTS}/preview-presentation-mobile.png` });
  await mobileContext.close();

  const stage = await context.newPage();
  await stabilizePreview(stage);
  const stageEvidence = monitor(stage);
  await stage.goto(`${ORIGIN}/wheels/stages/${STAGE_SLUG}`, { waitUntil: "networkidle" });
  const stageCanvases = stage.locator(".stage-wheel-tile canvas");
  const stageCount = await stageCanvases.count();
  assert.ok(stageCount >= 2 && stageCount <= 6, String(stageCount));
  assert.equal(await fits(stage), true);
  assert.equal(stageEvidence.mechanicsRequests, 0);
  await stage.screenshot({ path: `${ARTIFACTS}/preview-stage-idle.png` });
  await stage.getByRole("button", { name: "SPIN ALL", exact: true }).click();
  await stage.waitForTimeout(900);
  await stage.screenshot({ path: `${ARTIFACTS}/preview-stage-in-motion.png` });
  await stage.waitForFunction(() => {
    const canvases = [...document.querySelectorAll(".stage-wheel-tile canvas")];
    return canvases.length > 1 && canvases.every((canvas) => canvas.__wheelSpinV110?.completed);
  }, null, { timeout: 25_000 });
  const stageMetrics = await stageCanvases.evaluateAll((nodes) => nodes.map((node) => structuredClone(node.__wheelSpinV110)));
  assert.equal(stageEvidence.mechanicsRequests, 1);
  assert.equal(new Set(stageMetrics.map((item) => item.startAt)).size, 1);
  assert.equal(new Set(stageMetrics.map((item) => item.mechanicsRevision)).size, 1);
  assert.ok(stageMetrics.every((item) => item.version === "wheel-spin-v2" && item.mechanicsVersion === 2 && item.completed));
  assert.ok(stageMetrics.every((item) => Math.abs(item.actualFinalFrameDelta - item.expectedFinalFrameDelta) < 1e-7));
  assert.deepEqual(stageEvidence.writes, []);
  assert.deepEqual(stageEvidence.errors, []);
  await stage.screenshot({ path: `${ARTIFACTS}/preview-stage-settled.png` });
  await context.close();
});

function monitor(page) {
  const evidence = { writes: [], errors: [], externalWarnings: [], mechanicsRequests: 0 };
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/wheels/mechanics") evidence.mechanicsRequests += 1;
    if (path.startsWith("/api/wheels") && !["GET", "HEAD"].includes(request.method())) evidence.writes.push(`${request.method()} ${path}`);
  });
  page.on("console", (entry) => {
    if (entry.type() !== "error") return;
    const message = `${entry.text()}${entry.location().url ? ` @ ${entry.location().url}` : ""}`;
    if (message.includes("static.cloudflareinsights.com/beacon.min.js") && message.includes("integrity")) evidence.externalWarnings.push(message);
    else evidence.errors.push(message);
  });
  page.on("pageerror", (error) => evidence.errors.push(error.message));
  return evidence;
}

async function stabilizePreview(page) {
  await page.route("**/api/analytics", (route) => route.fulfill({ status: 204 }));
  await page.route("https://thirdrailify-admin.pages.dev/api/auth/config", async (route) => {
    const response = await fetch("https://admin.thirdrailify.com/api/auth/config");
    await route.fulfill({ status: response.status, contentType: response.headers.get("content-type") || "application/json", headers: { "access-control-allow-origin": ORIGIN }, body: await response.text() });
  });
}

async function addConsent(context) {
  const now = Date.now();
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2_592_000_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN }]);
}

function fits(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}
