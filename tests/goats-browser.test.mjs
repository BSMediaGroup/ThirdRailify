import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";

import { chromium } from "playwright-core";

const LIVE_ORIGIN = process.env.GOATS_BROWSER_ORIGIN || "";
const TARGET_ORIGIN = LIVE_ORIGIN || "http://127.0.0.1:4184";
const STRICT_LIVE = LIVE_ORIGIN === "https://thirdrailify.pages.dev";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("GOATS MapLibre renders real basemap tiles and visible clustered DOM pins for full-world data", async (t) => {
  if (!LIVE_ORIGIN) {
    const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4184"], { stdio: "ignore" });
    t.after(() => server.kill());
    await waitForPreview();
  }
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  const viewport = { width: Number(process.env.GOATS_BROWSER_WIDTH || 1440), height: Number(process.env.GOATS_BROWSER_HEIGHT || 1000) };
  const page = await browser.newPage({ viewport });
  const mapErrors = [];
  const requestFailures = [];
  const tileRequests = [];
  page.on("console", (message) => { if (/GOATS map|Content Security Policy/i.test(message.text()) || (STRICT_LIVE && message.type() === "error")) mapErrors.push(message.text()); });
  page.on("pageerror", (error) => mapErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (STRICT_LIVE && (url.hostname === "tiles.openfreemap.org" || (url.origin === TARGET_ORIGIN && (/^\/api\//.test(url.pathname) || /^\/assets\//.test(url.pathname))))) requestFailures.push(`${request.url()}: ${request.failure()?.errorText || "failed"}`);
  });
  page.on("request", (request) => { if (/tiles\.openfreemap\.org\/natural_earth\/.+\.png/.test(request.url())) tileRequests.push(request.url()); });
  if (!LIVE_ORIGIN && process.env.GOATS_BROWSER_REAL_TILES !== "1") await page.route("https://tiles.openfreemap.org/natural_earth/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG }));
  if (!LIVE_ORIGIN) await page.route("**/api/goats/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/goats/listings") return route.fulfill(json(listings()));
    if (pathname === "/api/goats/map") return route.fulfill(json(mapData()));
    if (pathname === "/api/goats/products") return route.fulfill(json({ ok: true, products: [] }));
    return route.fulfill(json({ ok: false, error: "not_found" }, 404));
  });

  await page.goto(`${TARGET_ORIGIN}/goats`, { waitUntil: "domcontentloaded" });
  const canvas = page.locator(".goats-map .maplibregl-canvas");
  await canvas.waitFor({ state: "visible", timeout: 15_000 });
  await page.locator('.goats-map__canvas[data-map-ready="true"]').waitFor({ state: "attached", timeout: 15_000 });
  await page.waitForTimeout(250);
  assert.equal(await page.getByText("Map view is unavailable.").count(), 0);
  const bounds = await canvas.boundingBox();
  assert.ok(bounds && bounds.width > 250 && bounds.height > 300);
  const markers = page.locator(".goats-map .goats-map__point, .goats-map .goats-map__cluster-count");
  const markerCount = await markers.count();
  assert.ok(markerCount > 0, "the deployed map must expose at least one interactive GOATS marker");
  assert.equal(await markers.first().isVisible(), true, "at least one GOATS marker must be visibly rendered");
  assert.ok(tileRequests.length > 0, "the map must request actual basemap tiles");
  const canvasPng = await canvas.screenshot();
  const renderedPixels = await page.evaluate(async (source) => {
    const image = new globalThis.Image();
    image.src = source;
    await image.decode();
    const surface = globalThis.document.createElement("canvas");
    surface.width = image.width; surface.height = image.height;
    const context = surface.getContext("2d");
    if (!context) return { paletteSize: 0, limePixels: 0 };
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    const palette = new Set();
    let limePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (offset % (4 * 64) === 0) palette.add(`${pixels[offset] >> 3},${pixels[offset + 1] >> 3},${pixels[offset + 2] >> 3}`);
      if (pixels[offset] > 175 && pixels[offset + 1] > 205 && pixels[offset + 2] < 135) limePixels += 1;
    }
    return { paletteSize: palette.size, limePixels };
  }, `data:image/png;base64,${canvasPng.toString("base64")}`);
  assert.ok(renderedPixels.paletteSize > 4, `the rendered map canvas must not be blank (palette size: ${renderedPixels.paletteSize})`);
  if (viewport.width > 500) assert.ok(renderedPixels.limePixels > 20, `the rendered map must contain visible GOATS signals (lime pixels: ${renderedPixels.limePixels})`);
  assert.deepEqual(mapErrors, []);
  assert.deepEqual(requestFailures, []);
  assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true);
  if (markerCount > 1 && viewport.width > 500) {
    await page.locator(".goats-map").scrollIntoViewIfNeeded();
    const midnightMarker = page.getByRole("button", { name: /Select Midnight Rail/ });
    await midnightMarker.click();
    await page.locator(".goats-selected h3").filter({ hasText: "Midnight Rail" }).waitFor({ state: "visible" });
    await page.waitForTimeout(650);
    const markerBounds = await page.getByRole("button", { name: /Select Midnight Rail/ }).boundingBox();
    assert.ok(markerBounds && Math.abs((markerBounds.x + markerBounds.width / 2) - (bounds.x + bounds.width / 2)) < 65, "selected marker must move to the map center");
  }
  if (LIVE_ORIGIN) console.log(JSON.stringify({ origin: LIVE_ORIGIN, viewport, ready: true, fallback: false, tileRequests: tileRequests.length, markerCount, overflow: false, errors: 0 }));
  if (process.env.GOATS_BROWSER_SCREENSHOTS === "1") {
    const suffix = `${viewport.width}x${viewport.height}`;
    await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-goats-map-${suffix}.png`), fullPage: true });
    await canvas.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-goats-map-canvas-${suffix}.png`) });
  }
});

const ONE_PIXEL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

function json(body, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(body) }; }
function product() { return { id: "product-1", slug: "demo", name: "Demo product", image: null }; }
function listing(id, slug, name, label, latitude, longitude) { return { id, slug, displayName: name, description: "Approved community map fixture.", rating: 5, publishedAt: "2026-08-28T00:00:00.000Z", product: product(), location: { label, countryCode: id === "sydney" ? "AU" : "CA", latitude, longitude }, media: { main: null, profile: null, gallery: [] }, counts: { likes: 0, dislikes: 0, comments: 0 } }; }
function listings() { const items = [listing("sydney", "southern-signal", "Southern Signal", "Sydney, AU", -33.8688, 151.2093), listing("toronto", "midnight-rail", "Midnight Rail", "Toronto, CA", 43.6532, -79.3832)]; return { ok: true, items, page: 1, pageSize: 12, total: 2, stats: { listings: 2, countries: 2, products: 1 }, facets: { countries: [{ code: "AU", count: 1 }, { code: "CA", count: 1 }] } }; }
function mapData() { return { type: "FeatureCollection", features: [{ type: "Feature", id: "sydney", geometry: { type: "Point", coordinates: [151.2093, -33.8688] }, properties: { id: "sydney", slug: "southern-signal", displayName: "Southern Signal", locationLabel: "Sydney, AU", countryCode: "AU", imageUrl: null, product: product(), rating: 5, excerpt: "Fixture", galleryPage: 1 } }, { type: "Feature", id: "toronto", geometry: { type: "Point", coordinates: [-79.3832, 43.6532] }, properties: { id: "toronto", slug: "midnight-rail", displayName: "Midnight Rail", locationLabel: "Toronto, CA", countryCode: "CA", imageUrl: null, product: product(), rating: 5, excerpt: "Fixture", galleryPage: 1 } }] }; }

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(TARGET_ORIGIN)).ok) return; } catch { /* Preview is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite preview did not start.");
}
