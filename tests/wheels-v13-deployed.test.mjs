import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_DEPLOY_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SLUG = "third-railify-demo-draw";

test("deployed Wheels V1.3 keeps portable controls authorized and demo spins local", { skip: !ORIGIN }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  const errors = [];
  const writes = [];
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${url.pathname}`);
  });

  await page.goto(`${ORIGIN}/wheels`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: /SPIN THE RAIL/i }).waitFor();

  await page.goto(`${ORIGIN}/wheels/${SLUG}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Third Railify Demo Draw" }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Edit" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Import / Export" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Official draw" }).count(), 0);
  const officialHistoryBefore = await page.locator(".result-history li").count();
  await page.getByRole("button", { name: "Start demo spin" }).click();
  const result = page.getByRole("dialog").filter({ hasText: "DEMO / NOT RECORDED" });
  await result.waitFor();
  await result.getByText("Demo result — not recorded as an official draw.").waitFor();
  assert.equal(await result.getByText("OFFICIAL DRAW · RECORDED").count(), 0);
  assert.equal(await page.locator(".result-history li").count(), officialHistoryBefore);
  await page.getByRole("button", { name: "Close result" }).click();

  await page.goto(`${ORIGIN}/wheels/${SLUG}/edit`, { waitUntil: "networkidle" });
  await page.getByRole("dialog", { name: "Sign in required" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Import / Export" }).count(), 0);
  assert.equal(await page.getByLabel("Wheel title").count(), 0);

  await page.goto(`${ORIGIN}/wheels/new`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Sign in required" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Import wheel file" }).count(), 0);
  assert.equal(await page.getByLabel("Wheel title").count(), 0);

  const schema = await page.request.get(`${ORIGIN}/schemas/thirdrailify-wheel-v1.schema.json`);
  assert.equal(schema.status(), 200);
  assert.equal((await schema.json()).$id, "urn:thirdrailify:wheel:1");
  assert.deepEqual(writes, [], "anonymous acceptance must not issue mutation requests");
  if (new URL(ORIGIN).hostname === "thirdrailify.pages.dev") assert.deepEqual(errors, [], "stable Wheels V1.3 routes must not emit page-origin console errors");
});

async function addConsent(context) {
  const now = Date.now();
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2_592_000_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN }]);
}
