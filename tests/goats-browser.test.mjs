import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import path from "node:path";

import { chromium } from "playwright-core";

const LIVE_ORIGIN = process.env.GOATS_BROWSER_ORIGIN || "";
const TARGET_ORIGIN = LIVE_ORIGIN || "http://127.0.0.1:4184";
const STRICT_LIVE = LIVE_ORIGIN === "https://thirdrailify.pages.dev";
const EXPECTED_FEATURE_COUNT = STRICT_LIVE ? 11 : 2;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
let server;

before(async () => {
  if (LIVE_ORIGIN) return;
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4184"], { stdio: "ignore" });
  await waitForServer();
});

after(() => server?.kill());

test("GOATS MapLibre renders real vector geography, compact flagged cards, both DOM markers, selection, pan, zoom, and responsive layout", async (t) => {
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
    const reason = request.failure()?.errorText || "failed";
    if (url.hostname === "tiles.openfreemap.org" && reason === "net::ERR_ABORTED") return;
    if (url.hostname === "tiles.openfreemap.org" || (url.origin === TARGET_ORIGIN && /^\/assets\//.test(url.pathname))) {
      requestFailures.push(`${request.url()}: ${reason}`);
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname === "tiles.openfreemap.org" && /\/planet\/.*\.pbf$/.test(url.pathname)) tileResponses.push({ url: response.url(), status: response.status() });
    if (url.origin === TARGET_ORIGIN && /^\/api\/goats\/(listings|map|products)/.test(url.pathname)) goatsApiResponses.push({ url: response.url(), status: response.status() });
  });
  if (!LIVE_ORIGIN) await routeGoatsApi(page);

  await page.goto(`${TARGET_ORIGIN}/goats`, { waitUntil: "domcontentloaded" });
  const mapRoot = page.locator('.goats-map[data-goats-map-state="ready"]');
  await mapRoot.waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await mapRoot.getAttribute("data-goats-map-engine"), "maplibre");
  assert.equal(await mapRoot.getAttribute("data-goats-map-feature-count"), String(EXPECTED_FEATURE_COUNT));
  assert.ok(Number(await mapRoot.getAttribute("data-goats-map-tile-count")) > 0, "readiness requires at least one loaded vector tile");
  assert.ok(Number(await mapRoot.getAttribute("data-goats-map-source-feature-count")) > 0, "readiness requires rendered vector basemap features");
  assert.equal(await page.getByText("Map view is unavailable.").count(), 0);
  assert.equal(await page.getByText("Interactive map could not load.").count(), 0);

  const mapViewport = page.locator(".goats-map__canvas.maplibregl-map");
  const bounds = await mapViewport.boundingBox();
  assert.ok(bounds && bounds.width > 250 && bounds.height >= 360, "the map viewport must have visible dimensions");
  const mapCanvas = mapViewport.locator("canvas.maplibregl-canvas");
  assert.equal(await mapCanvas.isVisible(), true, "MapLibre must expose a visible GL canvas");
  assert.equal(await mapCanvas.evaluate((canvas) => canvas.width > 250 && canvas.height >= 360), true);
  assert.ok(tileResponses.some((response) => response.status >= 200 && response.status < 300), "at least one real OpenFreeMap vector tile request must return success");
  assert.ok(goatsApiResponses.filter((response) => response.status === 200).length >= 3, "all authoritative GOATS read projections must return HTTP 200");

  const sydney = page.locator('[data-goats-marker-name="Southern Signal"]');
  const toronto = page.locator('[data-goats-marker-name="Midnight Rail"]');
  const daniel = page.locator('[data-goats-marker-name="Daniel Clancy"]');
  assert.equal(await sydney.count(), 1);
  assert.equal(await toronto.count(), 1);
  assert.equal(await sydney.isVisible(), true);
  assert.equal(await toronto.isVisible(), true);
  if (STRICT_LIVE) {
    assert.equal(await daniel.count(), 1);
    assert.equal(await daniel.isVisible(), true);
    assert.notEqual(await daniel.getAttribute("data-goats-marker-offset"), await sydney.getAttribute("data-goats-marker-offset"), "coincident privacy-safe coordinates must receive distinct visual pin offsets");
  }

  const heroOrbital = page.locator(".goats-hero__orbital");
  assert.equal(await heroOrbital.isVisible(), true, "the enhanced GOATS signal hero must be visible");
  assert.ok((await heroOrbital.boundingBox())?.width >= 280, "the animated hero signal must be a substantial visual element");
  assert.notEqual(await page.locator(".goats-hero__sweep").evaluate((element) => globalThis.getComputedStyle(element).animationName), "none");
  assert.equal(await page.locator(".goats-hero h1").evaluate((element) => Number.parseFloat(globalThis.getComputedStyle(element).lineHeight) / Number.parseFloat(globalThis.getComputedStyle(element).fontSize) >= .8), true, "the GOATS hero heading must retain the readable public-hero line-height rhythm");
  assert.equal(await heroOrbital.locator("img[data-goats-country-flag]").count(), 0, "the hero diagram must use uncrowded airport-code chips without flags");
  assert.equal(await heroOrbital.locator(".goats-hero__node").count(), 4, "the global radar must include Australian, Canadian, American, and European airport signals");
  for (const code of ["SYD", "YYZ", "LAX", "LHR"]) assert.match(await heroOrbital.textContent(), new RegExp(code));
  assert.equal(await page.locator(".goats-hero__montage").count(), 0, "unexplained listing thumbnails must not clutter the hero");
  const goatMotif = page.locator(".goats-hero__goat-motif");
  assert.equal(await goatMotif.isVisible(), true, "the hero must include the complementary illustrated goat motif");
  assert.notEqual(await goatMotif.evaluate((node) => getComputedStyle(node).maskImage), "none", "the goat motif must remain scalable vector art rendered as a CSS mask");

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
  await page.locator(".maplibregl-ctrl-zoom-in").click();
  await page.waitForTimeout(350);
  const zoomDistanceAfter = await markerDistance(sydney, toronto);
  assert.ok(zoomDistanceAfter > zoomDistanceBefore * 1.5, "the visible zoom control must change map scale");

  await page.getByRole("button", { name: "Reset results" }).click();
  await sydney.click();
  await page.locator(".goats-selected h3").filter({ hasText: "Southern Signal" }).waitFor({ state: "visible" });
  const sydneyCard = page.locator(".goats-map-marker-card").filter({ hasText: "Southern Signal" });
  await sydneyCard.waitFor({ state: "visible" });
  await page.waitForTimeout(250);
  assert.equal(await sydneyCard.evaluate((element) => {
    const popup = element.closest(".maplibregl-popup");
    return popup instanceof globalThis.HTMLElement && Number(globalThis.getComputedStyle(popup).opacity) > .9;
  }), true);
  assert.match(await sydneyCard.textContent(), /Approved signal.*Southern Signal.*Sydney.*View GOAT listing/s);
  assert.ok((await sydneyCard.boundingBox())?.width >= 290, "the rich marker card must not collapse to its media column");
  assert.equal(await sydneyCard.locator(".goats-map-marker-card__copy").isVisible(), true);
  assert.match(await sydneyCard.locator("a").getAttribute("href"), /^\/goats\/[a-z0-9-]*southern-signal$/);
  assert.equal(await sydneyCard.locator(".goats-map-marker-card__media").isVisible(), true);
  assert.equal(await sydneyCard.locator('[data-goats-country-flag="AU"]').count(), 1, "the popup must carry one Australian SVG flag beside the location only");
  const regularCardBounds = await sydneyCard.boundingBox();
  const regularMapBounds = await mapViewport.boundingBox();
  assert.ok(regularMapBounds && regularCardBounds && regularCardBounds.x >= regularMapBounds.x && regularCardBounds.x + regularCardBounds.width <= regularMapBounds.x + regularMapBounds.width && regularCardBounds.y >= regularMapBounds.y && regularCardBounds.y + regularCardBounds.height <= regularMapBounds.y + regularMapBounds.height, "the regular marker card must remain inside the map viewport");
  assert.equal(await sydneyCard.locator("xpath=ancestor::*[contains(@class, 'maplibregl-popup-content')]").evaluate((element) => {
    const match = globalThis.getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
    return match.length >= 3 && match[0] < 30 && match[1] < 30 && match[2] < 30;
  }), true, "marker card surface must be dark themed");
  await page.getByRole("button", { name: "Reset results" }).click();
  await page.locator(".goat-card").filter({ hasText: "Midnight Rail" }).locator("a").first().focus();
  if (!LIVE_ORIGIN) {
    assert.equal(await page.locator(".goat-card .goat-profile-avatar.is-fallback").count(), 2, "listing cards without profile media must render the default goat motif");
    assert.equal(await page.locator(".goat-card .goat-profile-avatar.is-fallback img, .goat-card .goat-profile-avatar.is-fallback svg").count(), 0, "card fallbacks must remain CSS-drawn");
  }
  await page.locator(".goats-selected h3").filter({ hasText: "Midnight Rail" }).waitFor({ state: "visible" });
  await page.waitForTimeout(650);
  await toronto.click();
  await page.locator(".goats-selected h3").filter({ hasText: "Midnight Rail" }).waitFor({ state: "visible" });

  if (STRICT_LIVE) {
    await page.getByRole("button", { name: "Reset results" }).click();
    await daniel.click();
    await page.locator(".goats-selected h3").filter({ hasText: "Daniel Clancy" }).waitFor({ state: "visible" });
  }

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
  assert.ok(paletteSize > 20, `the composed vector map must visibly contain geography (palette size: ${paletteSize})`);

  const locationTags = page.locator(".goats-location-tag");
  assert.ok(await locationTags.count() >= 3, "selected and gallery location tags must be present");
  assert.equal(await locationTags.evaluateAll((tags) => tags.every((tag) => Boolean(tag.querySelector("img[data-goats-country-flag]")))), true, "every visible GOATS location tag must have an SVG country flag prefix");
  assert.equal(await locationTags.locator("img[data-goats-country-flag]").evaluateAll((flags) => flags.every((flag) => {
    const bounds = flag.getBoundingClientRect();
    const radius = Number.parseFloat(globalThis.getComputedStyle(flag).borderTopLeftRadius) || 0;
    return bounds.width >= 18 && bounds.width <= 22 && bounds.height >= 11 && bounds.height <= 15 && bounds.width / bounds.height > 1.35 && radius <= 1;
  })), true, "all retained location flags must remain small rectangular marks rather than circular avatars");

  await sydney.click();
  await sydneyCard.waitFor({ state: "visible" });
  const initialMapBounds = await mapViewport.boundingBox();
  await page.getByRole("button", { name: "Expand map" }).click();
  assert.equal(await mapRoot.getAttribute("data-goats-map-expanded"), "true");
  assert.equal(await mapRoot.getAttribute("role"), "dialog");
  await page.waitForTimeout(250);
  const expandedMapBounds = await mapViewport.boundingBox();
  assert.ok(initialMapBounds && expandedMapBounds && expandedMapBounds.height > initialMapBounds.height + 100, "expanded mode must materially enlarge the interactive map");
  await sydneyCard.waitFor({ state: "visible" });
  await page.waitForTimeout(250);
  const expandedCardBounds = await sydneyCard.boundingBox();
  assert.ok(expandedMapBounds && expandedCardBounds && expandedCardBounds.x >= expandedMapBounds.x && expandedCardBounds.x + expandedCardBounds.width <= expandedMapBounds.x + expandedMapBounds.width, `the expanded marker card must remain inside the mobile or desktop map viewport (map ${JSON.stringify(expandedMapBounds)}, card ${JSON.stringify(expandedCardBounds)})`);
  assert.equal(await page.locator("body").evaluate((body) => globalThis.getComputedStyle(body).overflow), "hidden");
  await page.keyboard.press("Escape");
  assert.equal(await mapRoot.getAttribute("data-goats-map-expanded"), "false");
  await page.waitForTimeout(250);
  assert.deepEqual(applicationErrors, []);
  assert.deepEqual(requestFailures, []);
  assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true);

  if (LIVE_ORIGIN) console.log(JSON.stringify({
    origin: LIVE_ORIGIN,
    viewport,
    state: "ready",
    engine: "maplibre",
    featureCount: EXPECTED_FEATURE_COUNT,
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
    const output = process.env.TEMP || ".";
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('.goats-map[data-goats-map-state="ready"]').waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.locator(".goats-hero").screenshot({ path: path.join(output, `thirdrailify-goats-hero-${suffix}.png`) });
    await page.locator('[data-goats-marker-name="Southern Signal"]').click();
    await page.locator(".goats-map-marker-card").filter({ hasText: "Southern Signal" }).waitFor({ state: "visible" });
    await page.waitForTimeout(250);
    const proofViewport = viewport.width <= 500 ? "mobile" : "desktop";
    await page.locator(".goats-map-stage__grid").screenshot({ path: path.join(output, `thirdrailify-goats-map-${proofViewport}-PROOF.png`) });
    await page.locator(".goats-map-stage__grid").screenshot({ path: path.join(output, `thirdrailify-goats-map-card-${suffix}.png`) });
    await page.getByRole("button", { name: "Expand map" }).click();
    await page.waitForTimeout(250);
    await page.locator(".goats-map.is-expanded").screenshot({ path: path.join(output, `thirdrailify-goats-map-expanded-${suffix}.png`) });
  }
});

test("GOATS live gallery keeps primary photos visible, native controls dark, and detail media viewport-filling", { skip: !STRICT_LIVE }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  const viewport = { width: Number(process.env.GOATS_BROWSER_WIDTH || 1440), height: Number(process.env.GOATS_BROWSER_HEIGHT || 900) };
  const page = await browser.newPage({ viewport });
  await page.goto(`${TARGET_ORIGIN}/goats`, { waitUntil: "domcontentloaded" });
  await page.locator('.goats-map[data-goats-map-state="ready"]').waitFor({ state: "visible", timeout: 20_000 });

  const filter = page.locator(".goats-controls select").first();
  assert.equal(await filter.evaluate((element) => globalThis.getComputedStyle(element).colorScheme.includes("dark")), true, "GOATS filters must request a dark native popup palette");
  assert.equal(await filter.locator("option").first().evaluate((option) => {
    const rgb = globalThis.getComputedStyle(option).backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
    return rgb.length >= 3 && rgb[0] < 30 && rgb[1] < 30 && rgb[2] < 30;
  }), true, "GOATS filter options must have a dark readable surface");

  const card = page.locator(".goat-card").filter({ hasText: "FagGOAT" }).first();
  await card.scrollIntoViewIfNeeded();
  const primary = card.locator('.goat-card__media[data-goats-primary-media="ready"] img');
  await primary.waitFor({ state: "visible" });
  await primary.evaluate((image) => image instanceof HTMLImageElement && image.decode ? image.decode() : Promise.resolve());
  assert.equal(await primary.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0), true, "the primary photo must finish loading before acceptance");
  assert.equal(await primary.evaluate((image) => Number(globalThis.getComputedStyle(image).zIndex)), 1, "the primary photo must remain above its failure fallback without hover");
  assert.equal(await card.locator(".goat-media-fallback").evaluate((fallback) => Number(globalThis.getComputedStyle(fallback).zIndex)), 0);

  const output = process.env.TEMP || ".";
  const proofViewport = viewport.width <= 500 ? "mobile" : "desktop";
  if (process.env.GOATS_BROWSER_SCREENSHOTS === "1") await card.screenshot({ path: path.join(output, `thirdrailify-goats-gallery-${proofViewport}-PROOF.png`) });

  await page.goto(`${TARGET_ORIGIN}/goats/faggoat`, { waitUntil: "domcontentloaded" });
  const detailStage = page.locator(".goat-detail__stage");
  await detailStage.waitFor({ state: "visible" });
  const detailImage = detailStage.locator("img");
  await detailImage.evaluate((image) => image instanceof HTMLImageElement && image.decode ? image.decode() : Promise.resolve());
  const fill = await detailStage.evaluate((stage) => {
    const image = stage.querySelector("img");
    if (!(image instanceof HTMLImageElement)) return null;
    const stageBounds = stage.getBoundingClientRect();
    const imageBounds = image.getBoundingClientRect();
    return { stageBounds, imageBounds, fit: globalThis.getComputedStyle(image).objectFit };
  });
  assert.ok(fill && fill.fit === "cover" && Math.abs(fill.stageBounds.width - fill.imageBounds.width) <= 2 && Math.abs(fill.stageBounds.height - fill.imageBounds.height) <= 2, "detail media must cover the full responsive canvas without letterbox gaps");
  assert.ok(fill && fill.stageBounds.height >= (viewport.width <= 500 ? viewport.height * .48 : Math.min(620, viewport.height * .65)), "detail media must materially fill the viewport");
  assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true);
  if (process.env.GOATS_BROWSER_SCREENSHOTS === "1") await page.locator(".goat-detail__hero").screenshot({ path: path.join(output, `thirdrailify-goats-detail-${proofViewport}-PROOF.png`) });
});

test("GOAT detail identity and engagement controls remain compact and responsive", { skip: Boolean(LIVE_ORIGIN) }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await routeGoatsApi(page);
    await page.goto(`${TARGET_ORIGIN}/goats/faggoat`, { waitUntil: "domcontentloaded" });
    const identity = page.locator(".goat-detail__identity");
    await identity.waitFor({ state: "visible" });
    const avatar = identity.locator(":scope > .goat-profile-avatar");
    const [avatarBox, identityTitleBox] = await Promise.all([avatar.boundingBox(), identity.locator("h1").boundingBox()]);
    assert.ok(avatarBox && identityTitleBox && Math.abs((avatarBox.y + avatarBox.height / 2) - (identityTitleBox.y + identityTitleBox.height / 2)) <= 2, "profile image must remain vertically centred beside the display name");
    assert.ok(avatarBox && avatarBox.width >= 64 && avatarBox.width <= 80, "profile image must use the refined compact size");
    assert.match(await avatar.locator("img").getAttribute("src"), /^data:image\/gif;base64,/, "animated GIF profile media must render through a native image element");

    const reactions = page.locator(".goat-reactions button");
    assert.equal(await reactions.count(), 2);
    assert.equal(await reactions.locator("svg").count(), 2, "reactions use thumb icons");
    for (const button of await reactions.all()) {
      const box = await button.boundingBox();
      assert.ok(box && box.width < 80 && box.height <= 42, "reaction controls remain discreet");
    }
    const like = reactions.first();
    await like.evaluate((button) => button.setAttribute("aria-pressed", "true"));
    assert.notEqual(await like.locator("svg").evaluate((icon) => globalThis.getComputedStyle(icon).fill), "none", "selected thumb gains a fill colour");
    assert.equal(await page.locator(".goat-copy-link svg").count(), 1, "copy-link action includes an icon");
    assert.equal(await page.getByText("No comments yet.", { exact: true }).count(), 1);
    assert.equal(await page.getByText("No approved comments yet.", { exact: true }).count(), 0);
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true);
    if (process.env.GOATS_BROWSER_SCREENSHOTS === "1") await page.locator(".goat-detail__hero").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-goats-detail-faggoat-${viewport.width}.png`) });

    await page.goto(`${TARGET_ORIGIN}/goats/long-goat`, { waitUntil: "domcontentloaded" });
    const longIdentity = page.locator(".goat-detail__identity.is-long");
    await longIdentity.waitFor({ state: "visible" });
    const fallbackAvatar = longIdentity.locator(":scope > .goat-profile-avatar.is-fallback");
    const [longAvatarBox, longTitleBox] = await Promise.all([fallbackAvatar.boundingBox(), longIdentity.locator("h1").boundingBox()]);
    assert.ok(longAvatarBox && longTitleBox && longTitleBox.height <= longAvatarBox.height * 1.65, "wrapped display names stay proportionate to the profile image");
    assert.equal(await fallbackAvatar.locator("img, svg").count(), 0, "the absent-profile fallback must be drawn without an image or SVG asset");
    assert.equal(await fallbackAvatar.locator(".goat-profile-avatar__motif").count(), 1, "the absent-profile fallback must expose the CSS goat motif");
    if (process.env.GOATS_BROWSER_SCREENSHOTS === "1") await page.locator(".goat-detail__hero").screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-goats-detail-identity-${viewport.width}.png`) });
    await page.close();
  }
});

test("GOAT submission accepts animated GIF only for profile media without canvas flattening", { skip: Boolean(LIVE_ORIGIN) }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  await routeGoatsApi(page);
  await page.goto(`${TARGET_ORIGIN}/goats/submit`, { waitUntil: "domcontentloaded" });
  const mainInput = page.locator("label.goat-upload").filter({ hasText: "Main image" }).locator('input[type="file"]');
  const profileInput = page.locator("label.goat-upload").filter({ hasText: "Profile image" }).locator('input[type="file"]');
  assert.doesNotMatch(await mainInput.getAttribute("accept"), /image\/gif/);
  assert.match(await profileInput.getAttribute("accept"), /image\/gif/);
  const bytes = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAIfkEAQAAAAAsAAAAAAEAAQAAAgJEAQA7", "base64");
  await profileInput.setInputFiles({ name: "animated-profile.gif", mimeType: "image/gif", buffer: bytes });
  const preview = page.locator("label.goat-upload").filter({ hasText: "Profile image" }).locator(".goat-upload__preview");
  await preview.waitFor({ state: "visible" });
  assert.match(await preview.textContent(), /goat-profile\.gif/);
  assert.match(await preview.locator("img").getAttribute("src"), /^blob:/, "the original GIF must remain a browser-native preview rather than a canvas derivative");
});

test("GOATS automatically falls back to Leaflet only when OpenFreeMap vector tiles fail", { skip: Boolean(LIVE_ORIGIN) }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await routeGoatsApi(page);
  await page.route("https://tiles.openfreemap.org/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (/\/planet\/.*\.pbf$/.test(pathname)) return route.abort("failed");
    return route.continue();
  });
  await page.goto(`${TARGET_ORIGIN}/goats`, { waitUntil: "domcontentloaded" });
  const fallback = page.locator('.goats-map[data-goats-map-state="ready"]');
  await fallback.waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await fallback.getAttribute("data-goats-map-engine"), "leaflet");
  assert.ok(Number(await fallback.getAttribute("data-goats-map-tile-count")) > 0);
  assert.equal(await page.getByText("Interactive map could not load.").count(), 0);
});

test("GOATS exposes the accessible final fallback only after vector and raster engines both fail", { skip: Boolean(LIVE_ORIGIN) }, async (t) => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await routeGoatsApi(page);
  await page.route("https://tiles.openfreemap.org/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (/\/planet\/.*\.pbf$/.test(pathname) || /\/natural_earth\/ne2sr\//.test(pathname)) return route.abort("failed");
    return route.continue();
  });
  await page.goto(`${TARGET_ORIGIN}/goats`, { waitUntil: "domcontentloaded" });
  const failed = page.locator('.goats-map[data-goats-map-state="failed"]');
  await failed.waitFor({ state: "visible", timeout: 25_000 });
  assert.equal(await failed.getAttribute("data-goats-map-engine"), "leaflet");
  assert.equal(await failed.getAttribute("data-goats-map-tile-count"), "0");
  assert.equal(await page.getByText("Interactive map could not load.").isVisible(), true);
});

async function routeGoatsApi(page) {
  await page.route("**/api/goats/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/goats/listings") return route.fulfill(json(listings()));
    if (pathname === "/api/goats/map") return route.fulfill(json(mapData()));
    if (pathname === "/api/goats/config") return route.fulfill(json({ ok: true, submissionEnabled: true, captchaConfigured: false, geocoderConfigured: false, consentVersion: "goats-v2-2026-08", turnstileSiteKey: null, engagement: { comments: "auto", reactions: "auto" }, limits: { maxImageBytes: 10 * 1024 * 1024, maxGalleryImages: 5 } }));
    if (pathname === "/api/goats/products") return route.fulfill(json({ ok: true, products: [] }));
    if (/^\/api\/goats\/listings\/(faggoat|long-goat)\/comments$/.test(pathname)) return route.fulfill(json({ ok: true, items: [], page: 1, pageSize: 20, total: 0 }));
    if (pathname === "/api/goats/listings/faggoat") return route.fulfill(json({ ok: true, item: detailListing("FagGOAT", true) }));
    if (pathname === "/api/goats/listings/long-goat") return route.fulfill(json({ ok: true, item: detailListing("Extraordinary GOAT Signal", false) }));
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
function detailListing(displayName, hasProfile) { return { ...listing("detail", "faggoat", displayName, "Toronto, ON, Canada", 43.6532, -79.3832), description: "A compact approved detail fixture.", media: { main: fixtureMedia("main", 900, 1100), profile: hasProfile ? animatedGifMedia() : null, gallery: [] }, counts: { likes: 5, dislikes: 1, comments: 0 }, currentReaction: 0, engagement: { comments: "auto", reactions: "auto" }, neighbours: { previous: null, next: null } }; }
function animatedGifMedia() { return { id: "profile-gif-fixture", role: "profile", sortOrder: 0, url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAIfkEAQAAAAAsAAAAAAEAAQAAAgJEAQA7" }; }
function fixtureMedia(role, width, height) { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#171b10"/><circle cx="50%" cy="42%" r="28%" fill="#dfff38" opacity=".2"/><path d="M0 ${height * .72}  ${width} ${height * .36}V${height}H0Z" fill="#ffd12f" opacity=".22"/></svg>`; return { id: `${role}-fixture`, role, sortOrder: 0, url: `data:image/svg+xml,${encodeURIComponent(svg)}` }; }
function listings() { const items = [listing("sydney", "southern-signal", "Southern Signal", "Sydney, AU", -33.8688, 151.2093), listing("toronto", "midnight-rail", "Midnight Rail", "Toronto, CA", 43.6532, -79.3832)]; return { ok: true, items, page: 1, pageSize: 12, total: 2, stats: { listings: 2, countries: 2, products: 1 }, facets: { countries: [{ code: "AU", count: 1 }, { code: "CA", count: 1 }] } }; }
function mapData() { return { type: "FeatureCollection", features: [{ type: "Feature", id: "sydney", geometry: { type: "Point", coordinates: [151.2093, -33.8688] }, properties: { id: "sydney", slug: "southern-signal", displayName: "Southern Signal", locationLabel: "Sydney, AU", countryCode: "AU", imageUrl: null, product: product(), rating: 5, excerpt: "Fixture", galleryPage: 1 } }, { type: "Feature", id: "toronto", geometry: { type: "Point", coordinates: [-79.3832, 43.6532] }, properties: { id: "toronto", slug: "midnight-rail", displayName: "Midnight Rail", locationLabel: "Toronto, CA", countryCode: "CA", imageUrl: null, product: product(), rating: 5, excerpt: "Fixture", galleryPage: 1 } }] }; }

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(TARGET_ORIGIN)).ok) return; } catch { /* Vite is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite did not start.");
}
