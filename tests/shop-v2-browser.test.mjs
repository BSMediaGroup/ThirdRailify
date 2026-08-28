import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4198";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = join(tmpdir(), "thirdrailify-shop-v2-browser");
const IMAGE = "https://static.wixstatic.com/media/shop-v2-fixture.svg";

test("Shop V2 is CAD-only in galleries and keeps comparison, purchase, drawer, and cart UX correctly scoped", async (t) => {
  await mkdir(RESULTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4198"], { stdio: "ignore" });
  t.after(() => server.kill()); await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());

  for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844]]) {
    const { context, page, errors } = await fixturePage(browser, width, height);
    await page.goto(`${ORIGIN}/shop?currency=AUD`); await page.getByRole("heading", { name: "The complete replacement drop." }).waitFor(); await page.locator(".product-card").first().waitFor();
    assert.equal(await page.locator('[aria-label="Display currency"]:visible, [aria-label="Compare in currency"]:visible').count(), 0, `gallery has no visible currency control at ${width}x${height}`);
    assert.equal(await page.locator(".product-currency-comparison").count(), 0);
    assert.equal(await page.locator(".product-card .commerce-price--cad").count(), 3);
    assert.equal(await page.locator('.product-card .currency-flag[data-currency-flag="ca"]').count(), 3);
    const style = await page.locator(".product-card .commerce-price strong").first().evaluate((element) => { const css = getComputedStyle(element); return { color: css.color, size: parseFloat(css.fontSize) }; });
    assert.ok(style.size >= 16); assert.notEqual(style.color, "rgb(255, 255, 255)");
    assert.deepEqual(await page.locator(".collection-card strong").allTextContents(), ["Apparel", "Headwear"]);
    assert.equal(await noOverflow(page), true); assert.deepEqual(errors, []);
    if (width === 1440 || width === 390) await page.screenshot({ path: `${RESULTS}/shop-${width}x${height}.png`, fullPage: true });
    await context.close();
  }

  for (const [width, height] of [[1365,768],[1024,768],[768,1024],[390,844]]) {
    const { context, page, errors } = await fixturePage(browser, width, height);
    await page.goto(`${ORIGIN}/shop/bleh-tee`); await page.getByRole("heading", { level: 1, name: "BLEH | Unisex classic tee" }).waitFor();
    const primary = page.locator(".product-detail__copy > .commerce-price--cad"); const primaryText = await primary.innerText();
    assert.equal(await primary.locator('.currency-flag[data-currency-flag="ca"]').count(), 1);
    assert.equal(await page.locator(".product-currency-comparison").count(), 1);
    const chooser = page.getByRole("combobox", { name: "Compare in currency" }); const beforeCode = await chooser.locator("span").innerText(); await chooser.focus(); await page.keyboard.press("ArrowDown");
    assert.equal(await page.getByRole("listbox", { name: "Comparison currency" }).count(), 1);
    await page.keyboard.press("End"); await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
    assert.notEqual(await chooser.locator("span").innerText(), beforeCode); assert.equal(await primary.innerText(), primaryText);
    await chooser.click(); assert.equal(await page.getByRole("option", { name: "EUR" }).locator('img[data-currency-flag="eu"]').count(), 1); await page.keyboard.press("Escape");
    const variantBox = await page.getByLabel("Variant").boundingBox(); const quantityBox = await page.getByLabel("Quantity").boundingBox();
    assert.ok(variantBox && quantityBox && Math.abs(variantBox.y - quantityBox.y) < 3, `variant and quantity share a row at ${width}x${height}`);
    assert.equal(await noOverflow(page), true); assert.deepEqual(errors, []);
    if (width === 1365 || width === 390) await page.screenshot({ path: `${RESULTS}/product-${width}x${height}.png`, fullPage: true });
    await context.close();
  }

  const { context, page, errors } = await fixturePage(browser, 1440, 900);
  await page.goto(`${ORIGIN}/cart`); await page.getByRole("heading", { level: 2, name: "Your cart is empty." }).waitFor();
  await page.goto(`${ORIGIN}/shop/bleh-tee`); await page.getByRole("button", { name: "Add selected variant" }).click();
  await page.getByRole("dialog", { name: "Your cart" }).waitFor(); assert.equal(await page.locator('.cart-drawer .currency-flag[data-currency-flag="ca"]').count() >= 2, true);
  await page.getByRole("link", { name: "View full cart" }).click(); await page.waitForURL(`${ORIGIN}/cart`);
  assert.equal(await page.locator('.cart-page .currency-flag[data-currency-flag="ca"]').count() >= 3, true);
  const quantity = page.getByLabel("Quantity for BLEH | Unisex classic tee"); await quantity.getByRole("button", { name: "Increase quantity" }).click(); assert.match(await page.getByText("Subtotal").locator("..").innerText(), /61\.00/);
  await page.screenshot({ path: `${RESULTS}/cart-1440x900.png`, fullPage: true }); await page.getByRole("button", { name: "Clear cart" }).click(); await page.getByRole("heading", { level: 2, name: "Your cart is empty." }).waitFor();
  await page.goto(`${ORIGIN}/cart-page?source=legacy#items`); await page.waitForURL(`${ORIGIN}/cart?source=legacy#items`); assert.equal(await noOverflow(page), true); assert.deepEqual(errors, []); await context.close();
});

async function fixturePage(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86400000).toISOString(), categories: { preferences: true, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
  const page = await context.newPage(); const errors = []; page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); }); page.on("pageerror", (error) => errors.push(error.message)); page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.route(IMAGE, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="100%" height="100%" fill="#171717"/><path d="M90 375h420" stroke="#f0c419" stroke-width="42"/><text x="300" y="340" fill="white" text-anchor="middle" font-size="62">THIRD RAIL</text></svg>` }));
  await page.route("**/api/**", (route) => { const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (path === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, BRL: 4.02, EUR: .63, USD: .73, AUD: 1.1 } });
    if (path === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (path === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (path === "/api/commerce/catalogue") return json(route, catalogue());
    if (path.startsWith("/api/commerce/products/")) { const slug = decodeURIComponent(path.split("/").pop()); const product = catalogue().products.find((entry) => entry.slug === slug); return json(route, product ? { ok: true, source: "commerce-d1", product } : { ok: false }, product ? 200 : 404); }
    return json(route, { ok: false, error: "not_found" }, 404);
  }); return { context, page, errors };
}
function catalogue() { const base = { description: "Fixture product.", images: [IMAGE], tags: [], featuredOrder: null, maxQuantity: 5, available: true, price: { minUnitAmount: 3050, maxUnitAmount: 3050, label: "CA$30.50" }, variants: [{ id: "variant-1", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 3050, currency: "CAD", availability: "active" }] }; const products = [
  { ...base, id: "product-1", slug: "bleh-tee", title: "BLEH | Unisex classic tee", categories: ["Apparel"], collectionSlugs: ["apparel"], featured: true, featuredOrder: 10, displayOrder: 10 },
  { ...base, id: "product-2", slug: "icon-hat", title: "Third Railify Icon | Dad hat", categories: ["Headwear"], collectionSlugs: ["headwear"], featured: true, featuredOrder: 20, displayOrder: 20 },
  { ...base, id: "product-3", slug: "logo-tee", title: "Third Railify Logo V2 | Unisex classic tee", categories: ["Apparel"], collectionSlugs: ["apparel"], featured: false, displayOrder: 30, price: { minUnitAmount: 3050, maxUnitAmount: 3450, label: "From CA$30.50" } },
  ]; return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-29T00:00:00.000Z", collections: [{ title: "Apparel", slug: "apparel", description: "Wear the signal.", displayOrder: 10, productCount: 2, productIds: ["product-1", "product-3"] }, { title: "Headwear", slug: "headwear", description: "Top the line.", displayOrder: 20, productCount: 1, productIds: ["product-2"] }], products }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function noOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Shop V2 test server did not start."); }
