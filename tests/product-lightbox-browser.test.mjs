import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";
const ORIGIN = "http://127.0.0.1:4209";
const LIVE = false;
const IMAGE = "https://files.cdn.printful.com/files/lightbox-front.png";
const BACK = "https://files.cdn.printful.com/files/lightbox-back.png";
const DETAIL = IMAGE + "?detail=1";
const BROKEN = "https://files.cdn.printful.com/files/lightbox-broken.png";
const VARIANT = "https://files.cdn.printful.com/files/lightbox-variant.png";
const RESULTS = ".artifacts/product-lightbox";

test("fullscreen product gallery selection, gestures, modality and responsive geometry", async (t) => {
  await mkdir(RESULTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4209"], { stdio: "ignore" });
  t.after(() => server.kill()); await waitForServer();
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  t.after(() => browser.close());
  for (const [width, height] of [[1440,900], [768,1024], [390,844], [844,390]]) {
    const { page, context } = await fixturePage(browser, width, height, width === 1440 ? "no-preference" : "reduce");
    const pageErrors = []; page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(`${ORIGIN}/product-page/bleh-tee`);
    const trigger = page.locator(".product-media__expand");
    await trigger.waitFor();
    await page.locator("#product-quantity").fill("3");
    await trigger.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "BLEH | Unisex classic tee" });
    await dialog.waitFor();
    const slide = dialog.locator(".product-lightbox__stage img");
    assert.equal(await slide.getAttribute("src"), IMAGE);
    assert.equal(await dialog.getByRole("status").innerText(), "1 / 4");
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" });
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await page.getByRole("button", { name: "View 2", exact: true }).click(); await trigger.click();
    assert.equal(await slide.getAttribute("src"), BACK);
    await dialog.getByRole("button", { name: "Close fullscreen gallery" }).click();
    assert.equal(await page.getByLabel("Size", { exact: true }).inputValue(), "M");
    assert.equal(await page.getByLabel("Size", { exact: true }).locator('option[value="L"]').isDisabled(), true);
    await page.getByLabel("Color", { exact: true }).selectOption("Gold");
    assert.equal(await page.getByLabel("Size", { exact: true }).inputValue(), "L");
    await page.waitForFunction(url => document.querySelector(".product-media__expand img")?.getAttribute("src") === url, VARIANT);
    const purchasePrice = await page.locator(".product-detail__copy .commerce-price--cad").first().innerText();
    const cartBefore = await page.evaluate(() => JSON.stringify(localStorage));
    await trigger.click();
    assert.equal(await slide.getAttribute("src"), VARIANT);
    assert.equal(await dialog.getByRole("status").innerText(), "5 / 5");
    await dialog.getByRole("button", { name: "Next image", exact: true }).click();
    assert.equal(await slide.getAttribute("src"), IMAGE);
    await page.keyboard.press("ArrowRight"); assert.equal(await slide.getAttribute("src"), BACK);
    await dialog.getByRole("button", { name: "Previous image", exact: true }).click();
    assert.equal(await slide.getAttribute("src"), IMAGE);
    await dialog.getByRole("button", { name: "Show image 3 of 5", exact: true }).click();
    assert.equal(await slide.getAttribute("src"), DETAIL);
    await dialog.getByRole("button", { name: "Show image 2 of 5", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".product-lightbox__stage img")?.naturalWidth > 0);
    const geometry = await dialog.evaluate(el => {
      const rect = el.getBoundingClientRect(); const img = el.querySelector(".product-lightbox__stage img"); const stage = img.parentElement.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewport: [innerWidth, innerHeight], fit: getComputedStyle(img).objectFit, image: [img.clientWidth, img.clientHeight], stage: [stage.width, stage.height], controls: [...el.querySelectorAll(".product-lightbox__header button, .product-lightbox__zoom button, .product-lightbox__footer > button")].every(button => { const b = button.getBoundingClientRect(); return b.x >= 0 && b.y >= 0 && b.right <= innerWidth && b.bottom <= innerHeight; }) };
    });
    assert.equal(geometry.x, 0); assert.equal(geometry.y, 0); assert.deepEqual([geometry.width, geometry.height], [width,height]); assert.equal(geometry.fit, "contain"); assert.deepEqual(geometry.image, geometry.stage); assert.equal(geometry.controls, true);
    assert.equal(await noOverflow(page), true);
    if (width !== 1440) assert.equal(await slide.evaluate(el => getComputedStyle(el).transitionDuration), "0s");
    await page.screenshot({ path: `${RESULTS}/fullscreen-${width}x${height}.png` });
    await dialog.getByRole("button", { name: "Zoom in", exact: true }).click();
    const stage = dialog.locator(".product-lightbox__stage"); assert.equal(await stage.getAttribute("data-zoom"), "1.5");
    const box = await stage.boundingBox(); const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 100, y + 30); await page.mouse.up();
    assert.equal(await slide.getAttribute("src"), BACK); assert.notEqual(await slide.evaluate(el => el.style.transform), "translate(0px, 0px) scale(1.5)");
    await dialog.getByRole("button", { name: "Zoom out", exact: true }).click(); assert.equal(await stage.getAttribute("data-zoom"), "1");
    await dialog.getByRole("button", { name: "Zoom in", exact: true }).click(); await dialog.getByRole("button", { name: "Reset image to fit" }).click();
    assert.equal(await stage.getAttribute("data-zoom"), "1");
    const touch = await context.newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 100, y }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.detach();
    assert.equal(await slide.getAttribute("src"), DETAIL);
    await dialog.getByRole("button", { name: "Show image 4 of 5", exact: true }).click();
    await dialog.getByText("This image is unavailable. Select another view.").waitFor();
    await dialog.getByRole("button", { name: "Close fullscreen gallery" }).click();
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await page.getByRole("button", { name: "View 5", exact: true }).click(); await trigger.click();
    assert.equal(await slide.getAttribute("src"), VARIANT);
    const close = dialog.getByRole("button", { name: "Close fullscreen gallery" });
    await close.focus(); await page.keyboard.press("Shift+Tab"); assert.equal(await dialog.getByRole("button", { name: "Next image", exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("Tab"); assert.equal(await close.evaluate(el => el === document.activeElement), true);
    await page.evaluate(() => { window.galleryEscape = 0; document.addEventListener("keydown", e => { if (e.key === "Escape") window.galleryEscape++; }); });
    const beforeScroll = await page.evaluate(() => window.scrollY); await page.mouse.wheel(0, 600);
    assert.equal(await page.evaluate(() => window.scrollY), beforeScroll);
    assert.equal(await page.locator("#product-quantity").evaluate(el => { el.focus(); return el === document.activeElement; }), false);
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.galleryEscape), 0);
    assert.equal(await page.locator(".product-detail__copy .commerce-price--cad").first().innerText(), purchasePrice);
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), cartBefore);
    assert.equal(await page.getByLabel("Color", { exact: true }).inputValue(), "Gold"); assert.equal(await page.getByLabel("Size", { exact: true }).inputValue(), "L"); assert.equal(await page.locator("#product-quantity").inputValue(), "3");
    assert.equal(await page.getByRole("button", { name: "View 5", exact: true }).getAttribute("aria-pressed"), "true");
    for (let n = 0; n < 3; n++) { await trigger.click(); await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" }); }
    assert.equal(await page.evaluate(() => document.body.style.position), "");
    await page.evaluate(() => window.scrollTo(0, 500)); assert.ok(await page.evaluate(() => window.scrollY) > 0);
    await trigger.focus(); const scroll = await page.evaluate(() => window.scrollY); await page.keyboard.press("Enter"); await close.click(); assert.equal(await page.evaluate(() => window.scrollY), scroll);
    await trigger.click(); await page.evaluate(() => { history.pushState({}, "", "/product-page/icon-hat"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await dialog.waitFor({ state: "detached" }); await page.getByRole("heading", { level: 1, name: "Third Railify Icon | Dad hat" }).waitFor();
    await trigger.click(); assert.equal(await page.getByRole("button", { name: "Next image", exact: true }).count(), 0); await page.keyboard.press("Escape");
    await page.goto(`${ORIGIN}/product-page/logo-tee`); await page.getByRole("heading", { level: 1, name: "Third Railify Logo V2 | Unisex classic tee" }).waitFor(); assert.equal(await trigger.count(), 0);
    await page.route("**/api/commerce/products/icon-hat", route => json(route, { ok: true, source: "commerce-d1", product: { ...catalogue().products[1], images: [BROKEN] } }));
    await page.goto(`${ORIGIN}/product-page/icon-hat`); await page.locator(".product-media__expand[aria-disabled=true]").waitFor();
    await trigger.focus(); await page.keyboard.press("Enter"); assert.equal(await page.locator("dialog.product-lightbox").count(), 0);
    assert.deepEqual(pageErrors, []);
    await context.close();
  }
});

async function fixturePage(browser, width, height, reducedMotion = "reduce") {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86400000).toISOString(), categories: { preferences: true, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
  const page = await context.newPage(); const errors = []; page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); }); page.on("pageerror", (error) => errors.push(error.message)); page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  const imagePolicy = headers.match(/img-src [^;]+/)[0];
  if (!LIVE) await page.route((url) => url.origin === ORIGIN && !url.pathname.startsWith("/api/"), async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    return route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": imagePolicy } });
  });
  await page.route("https://files.cdn.printful.com/files/lightbox-*", (route) => {
    const url = route.request().url(); if (url.includes("broken")) return route.fulfill({ status: 404, body: "missing" });
    const number = url.includes("variant") ? 4 : url.includes("back") ? 2 : url.includes("detail") ? 3 : 1;
    return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${number === 2 ? 1000 : 600}" height="750"><rect x="4" y="4" width="98%" height="98%" fill="${["", "#19445b", "#673f35", "#395c36", "#533969"][number]}" stroke="#ffd12f" stroke-width="8"/><text x="50%" y="45%" fill="white" text-anchor="middle" font-size="52">VIEW ${number}</text><text x="50%" y="55%" fill="white" text-anchor="middle" font-size="24">Complete artwork / edge border</text></svg>` });
  });
  await page.route("**/api/**", (route) => { const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (path === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, BRL: 4.02, EUR: .63, USD: .73, AUD: 1.1 } });
    if (path === "/api/analytics") return json(route, { ok: true, accepted: true });
    if (path === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (path === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (path === "/api/commerce/catalogue") return json(route, catalogue());
    if (path.startsWith("/api/commerce/products/")) { const slug = decodeURIComponent(path.split("/").pop()); const product = catalogue().products.find((entry) => entry.slug === slug); return json(route, product ? { ok: true, source: "commerce-d1", product } : { ok: false }, product ? 200 : 404); }
    return json(route, { ok: false, error: "not_found" }, 404);
  }); return { context, page, errors };
}
function catalogue() { const base = { description: "Fixture product.", images: [IMAGE, BACK, DETAIL, IMAGE, BROKEN], tags: [], featuredOrder: null, maxQuantity: 5, available: true, price: { minUnitAmount: 3050, maxUnitAmount: 3050, label: "CA$30.50" }, variants: [{ id: "variant-1", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 3050, currency: "CAD", availability: "active" }, { id: "variant-2", label: "L / Gold", size: "L", color: "Gold", options: { Size: "L", Color: "Gold" }, image: VARIANT, unitAmount: 4050, currency: "CAD", availability: "active" }] }; const products = [
  { ...base, id: "product-1", slug: "bleh-tee", title: "BLEH | Unisex classic tee", categories: ["Apparel"], collectionSlugs: ["apparel"], featured: true, featuredOrder: 10, displayOrder: 10 },
  { ...base, images: [IMAGE], variants: [], id: "product-2", slug: "icon-hat", title: "Third Railify Icon | Dad hat", categories: ["Headwear"], collectionSlugs: ["headwear"], featured: true, featuredOrder: 20, displayOrder: 20 },
  { ...base, images: [], variants: [], id: "product-3", slug: "logo-tee", title: "Third Railify Logo V2 | Unisex classic tee", categories: ["Apparel"], collectionSlugs: ["apparel"], featured: false, displayOrder: 30, price: { minUnitAmount: 3050, maxUnitAmount: 3450, label: "From CA$30.50" } },
  ]; return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-29T00:00:00.000Z", collections: [{ title: "Apparel", slug: "apparel", description: "Wear the signal.", displayOrder: 10, productCount: 2, productIds: ["product-1", "product-3"] }, { title: "Headwear", slug: "headwear", description: "Top the line.", displayOrder: 20, productCount: 1, productIds: ["product-2"] }], products }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function noOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Shop V2 test server did not start."); }
