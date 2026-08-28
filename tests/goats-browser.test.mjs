import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import path from "node:path";

import { chromium } from "playwright-core";

const LIVE_ORIGIN = process.env.GOATS_BROWSER_ORIGIN || "";
const TARGET_ORIGIN = LIVE_ORIGIN || "http://127.0.0.1:4184";
const STRICT_LIVE = LIVE_ORIGIN === "https://thirdrailify.pages.dev";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
let server;

before(async () => {
  if (LIVE_ORIGIN) return;
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4184"], { stdio: "ignore" });
  await waitForServer();
});

after(() => server?.kill());

test("GOATS Leaflet renders successful real raster tiles, both DOM markers, selection, pan, zoom, and responsive layout", async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  const viewport = { width: Number(process.env.GOATS_BROWSER_WIDTH || 1440), height: Number(process.env.GOATS_BROWSER_HEIGHT || 900) };
  const page = await browser.newPage({ viewport });
  const applicationErrors = [];
  const requestFailures = [];
  const tileResponses = [];
  const goatsApiResponses = [];
  page.on("console", (message) => {
    if (/GOATS map|Content Security Policy/i.test(message.text()) || (STRICT_LIVE && message.type() === "error")) applicationErrors.push(message.text());
  });
  page.on("pageerror", (error) => applicationErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "tiles.openfreemap.org" || (url.origin === TARGET_ORIGIN && /^\/assets\//.test(url.pathname))) {
      requestFailures.push(`${request.url()}: ${request.failure()?.errorText || "failed"}`);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname === "tiles.openfreemap.org" && /\/natural_earth\/ne2sr\//.test(url.pathname)) tileResponses.push({ url: response.url(), status: response.status() });
    if (url.origin === TARGET_ORIGIN && /^\/api\/goats\/(listings|map|products)/.test(url.pathname)) goatsApiResponses.push({ url: response.url(), status: response.status() });
  });
  if (!LIVE_ORIGIN) await routeGoatsApi(page);

  await page.goto(`${TARGET_ORIGIN}/goats`, { waitUntil: "domcontentloaded" });
  const mapRoot = page.locator('.goats-map[data-goats-map-state="ready"]');
  await mapRoot.waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await mapRoot.getAttribute("data-goats-map-engine"), "leaflet");
  assert.equal(await mapRoot.getAttribute("data-goats-map-feature-count"), "2");
  assert.ok(Number(await mapRoot.getAttribute("data-goats-map-tile-count")) > 0, "readiness requires at least one loaded tile");
  assert.equal(await page.getByText("Map view is unavailable.").count(), 0);
  assert.equal(await page.getByText("Interactive map could not load.").count(), 0);

  const mapViewport = page.locator(".goats-map__canvas.leaflet-container");
  const bounds = await mapViewport.boundingBox();
  assert.ok(bounds && bounds.width > 250 && bounds.height >= 360, "the map viewport must have visible dimensions");
  const visibleTiles = page.locator(".goats-map .leaflet-tile-loaded");
  assert.ok(await visibleTiles.count() > 0, "Leaflet must expose loaded raster tile elements");
  assert.equal(await visibleTiles.first().isVisible(), true);
  assert.equal(await visibleTiles.first().evaluate((tile) => tile instanceof globalThis.HTMLImageElement && tile.complete && tile.naturalWidth > 1 && tile.naturalHeight > 1), true);
  assert.ok(tileResponses.some((response) => response.status >= 200 && response.status < 300), "at least one real OpenFreeMap raster tile request must return success");
  assert.ok(goatsApiResponses.filter((response) => response.status === 200).length >= 3, "all authoritative GOATS read projections must return HTTP 200");

  const sydney = page.locator('[data-goats-marker-name="Southern Signal"]');
  const toronto = page.locator('[data-goats-marker-name="Midnight Rail"]');
  assert.equal(await sydney.count(), 1);
  assert.equal(await toronto.count(), 1);
  assert.equal(await sydney.isVisible(), true);
  assert.equal(await toronto.isVisible(), true);

  const beforePan = await sydney.boundingBox();
  await mapViewport.hover({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 75, bounds.y + bounds.height / 2 + 35, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const afterPan = await sydney.boundingBox();
  assert.ok(beforePan && afterPan && Math.abs(afterPan.x - beforePan.x) > 15, "dragging must pan the map");

  await page.getByRole("button", { name: "Reset results" }).click();
  await page.waitForTimeout(200);
  const zoomDistanceBefore = await markerDistance(sydney, toronto);
  await page.locator(".leaflet-control-zoom-in").click();
  await page.waitForTimeout(350);
  const zoomDistanceAfter = await markerDistance(sydney, toronto);
  assert.ok(zoomDistanceAfter > zoomDistanceBefore * 1.5, "the visible zoom control must change map scale");

  await page.getByRole("button", { name: "Reset results" }).click();
  await sydney.click();
  await page.locator(".goats-selected h3").filter({ hasText: "Southern Signal" }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Reset results" }).click();
  await toronto.click();
  await page.locator(".goats-selected h3").filter({ hasText: "Midnight Rail" }).waitFor({ state: "visible" });

  await page.getByRole("button", { name: "Reset results" }).click();
  await page.locator(".goat-card").filter({ hasText: "Southern Signal" }).locator("a").first().focus();
  await page.locator(".goats-selected h3").filter({ hasText: "Southern Signal" }).waitFor({ state: "visible" });
  assert.equal(await sydney.getAttribute("class").then((value) => value?.includes("is-selected")), true, "listing selection must select its marker");

  await page.getByRole("button", { name: "Reset results" }).click();
  await page.waitForTimeout(250);
  assert.equal(await sydney.isVisible(), true);
  assert.equal(await toronto.isVisible(), true);
  await page.evaluate(() => {
    globalThis.document.body.tabIndex = -1;
    globalThis.document.body.focus();
  });
  const mapPng = await mapViewport.screenshot();
  const paletteSize = await renderedPaletteSize(page, mapPng);
  assert.ok(paletteSize > 20, `the composed raster map must visibly contain geography (palette size: ${paletteSize})`);
  assert.deepEqual(applicationErrors, []);
  assert.deepEqual(requestFailures, []);
  assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true);

  if (LIVE_ORIGIN) console.log(JSON.stringify({
    origin: LIVE_ORIGIN,
    viewport,
    state: "ready",
    engine: "leaflet",
    featureCount: 2,
    tileResponses: tileResponses.filter((response) => response.status >= 200 && response.status < 300).length,
    representativeTile: tileResponses.find((response) => response.status >= 200 && response.status < 300),
    sydneySelectable: true,
    torontoSelectable: true,
    pan: true,
    zoom: true,
    overflow: false,
    errors: 0,
  }));
  if (process.env.GOATS_BROWSER_SCREENSHOTS === "1") {
    const suffix = `${viewport.width}x${viewport.height}`;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('.goats-map[data-goats-map-state="ready"]').waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.locator(".goats-map-stage__grid").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-goats-map-${suffix}.png`) });
  }
});

test("GOATS reports failure only after every initial raster tile fails", { skip: Boolean(LIVE_ORIGIN) }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await routeGoatsApi(page);
  await page.route("https://tiles.openfreemap.org/natural_earth/ne2sr/**", (route) => route.abort("failed"));
  await page.goto(`${TARGET_ORIGIN}/goats`, { waitUntil: "domcontentloaded" });
  const failed = page.locator('.goats-map[data-goats-map-state="failed"]');
  await failed.waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await failed.getAttribute("data-goats-map-engine"), "leaflet");
  assert.equal(await failed.getAttribute("data-goats-map-tile-count"), "0");
  assert.equal(await page.getByText("Interactive map could not load.").isVisible(), true);
});

async function routeGoatsApi(page) {
  await page.route("**/api/goats/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/goats/listings") return route.fulfill(json(listings()));
    if (pathname === "/api/goats/map") return route.fulfill(json(mapData()));
    if (pathname === "/api/goats/products") return route.fulfill(json({ ok: true, products: [] }));
    return route.fulfill(json({ ok: false, error: "not_found" }, 404));
  });
}

async function markerDistance(first, second) {
  const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  assert.ok(a && b, "both markers must remain represented by DOM elements");
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function renderedPaletteSize(page, png) {
  return page.evaluate(async (source) => {
    const image = new globalThis.Image();
    image.src = source;
    await image.decode();
    const surface = globalThis.document.createElement("canvas");
    surface.width = image.width;
    surface.height = image.height;
    const context = surface.getContext("2d");
    if (!context) return 0;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    const palette = new Set();
    for (let offset = 0; offset < pixels.length; offset += 4 * 64) {
      palette.add(`${pixels[offset] >> 3},${pixels[offset + 1] >> 3},${pixels[offset + 2] >> 3}`);
    }
    return palette.size;
  }, `data:image/png;base64,${png.toString("base64")}`);
}

function json(body, status = 200) { return { status, contentType: "application/json", body: JSON.stringify(body) }; }
function product() { return { id: "product-1", slug: "demo", name: "Demo product", image: null }; }
function listing(id, slug, name, label, latitude, longitude) { return { id, slug, displayName: name, description: "Approved community map fixture.", rating: 5, publishedAt: "2026-08-28T00:00:00.000Z", product: product(), location: { label, countryCode: id === "sydney" ? "AU" : "CA", latitude, longitude }, media: { main: null, profile: null, gallery: [] }, counts: { likes: 0, dislikes: 0, comments: 0 } }; }
function listings() { const items = [listing("sydney", "southern-signal", "Southern Signal", "Sydney, AU", -33.8688, 151.2093), listing("toronto", "midnight-rail", "Midnight Rail", "Toronto, CA", 43.6532, -79.3832)]; return { ok: true, items, page: 1, pageSize: 12, total: 2, stats: { listings: 2, countries: 2, products: 1 }, facets: { countries: [{ code: "AU", count: 1 }, { code: "CA", count: 1 }] } }; }
function mapData() { return { type: "FeatureCollection", features: [{ type: "Feature", id: "sydney", geometry: { type: "Point", coordinates: [151.2093, -33.8688] }, properties: { id: "sydney", slug: "southern-signal", displayName: "Southern Signal", locationLabel: "Sydney, AU", countryCode: "AU", imageUrl: null, product: product(), rating: 5, excerpt: "Fixture", galleryPage: 1 } }, { type: "Feature", id: "toronto", geometry: { type: "Point", coordinates: [-79.3832, 43.6532] }, properties: { id: "toronto", slug: "midnight-rail", displayName: "Midnight Rail", locationLabel: "Toronto, CA", countryCode: "CA", imageUrl: null, product: product(), rating: 5, excerpt: "Fixture", galleryPage: 1 } }] }; }

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(TARGET_ORIGIN)).ok) return; } catch { /* Vite is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite did not start.");
}
