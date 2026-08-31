import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.CHECKOUT_BROWSER_ORIGIN || "http://127.0.0.1:4199";
const LIVE = Boolean(process.env.CHECKOUT_BROWSER_ORIGIN);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = join(tmpdir(), "thirdrailify-checkout-browser");
const IMAGE = "https://static.wixstatic.com/media/checkout-fixture.svg";

test("customer checkout is responsive, ephemeral, accessible, and bound to server-issued shipping", async (t) => {
  await mkdir(RESULTS, { recursive: true });
  if (!LIVE) {
    const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4199"], { stdio: "ignore" });
    t.after(() => server.kill()); await waitForServer();
  }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());

  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86400000).toISOString(), categories: { preferences: true, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
    await context.addInitScript(() => localStorage.setItem("thirdrailify-commerce-cart-v2", JSON.stringify([{ productId: "product-1", variantId: "variant-1", quantity: 1 }])));
    const page = await context.newPage(); const errors = []; let quoteMode = "unavailable"; let quoteCalls = 0;
    page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(IMAGE, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><rect width='100%' height='100%' fill='#171717'/></svg>" }));
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
      if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
      if (path === "/api/commerce/catalogue") return json(route, catalogue());
      if (path === "/api/commerce/shipping-markets") return json(route, { ok: true, authority: "Commerce D1", markets: [{ countryCode: "CA", displayName: "Canada" }] });
      if (path === "/api/commerce/payment-config") return json(route, paymentConfig());
      if (path === "/api/commerce/shipping-quotes") {
        quoteCalls += 1;
        if (quoteMode === "unavailable") return json(route, { ok: false, error: "shipping_unavailable", message: "Shipping calculation is not available yet." }, 409);
        return json(route, shippingQuote());
      }
      if (path === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
      if (path === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
      return json(route, { ok: false, error: "not_found" }, 404);
    });

    await page.goto(`${ORIGIN}/cart`); await page.getByRole("heading", { name: "Your cart." }).waitFor();
    await page.getByRole("link", { name: "Review delivery readiness" }).click(); await page.waitForURL(`${ORIGIN}/checkout`);
    await page.getByRole("heading", { level: 1, name: "Delivery & checkout." }).waitFor(); await page.getByText("BLEH Fixture", { exact: true }).waitFor();
    if (width === 1440) {
      await page.getByRole("button", { name: /Sign in to purchase/ }).click();
      await page.getByRole("dialog", { name: /Welcome back/ }).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem("thirdrailify-commerce-cart-v2") !== null), true);
      assert.equal(new URL(page.url()).pathname, "/checkout");
      await page.getByRole("button", { name: "Close account dialog" }).click();
    }
    await page.getByRole("button", { name: /Continue as guest/ }).click();
    await page.getByLabel("Customer email").fill("checkout@example.test");
    assert.match(await page.locator(".checkout-summary").innerText(), /BLEH Fixture.*M \/ Black.*Qty 1/s);
    const name = page.getByLabel("Recipient name");
    assert.equal(await name.getAttribute("autocomplete"), "name");
    assert.equal(await page.getByLabel("Address line 1").getAttribute("autocomplete"), "address-line1");
    assert.equal(await page.getByLabel("Postal / ZIP code").getAttribute("autocomplete"), "postal-code");
    await page.getByRole("button", { name: "Request shipping methods" }).click();
    await page.getByText("Enter the recipient name.").waitFor(); assert.equal(quoteCalls, 0);
    await fillDelivery(page);
    await page.getByLabel("State / province / region").fill("");
    await page.getByRole("button", { name: "Request shipping methods" }).click(); await page.getByText("State, province, or region is required for this country.").waitFor(); assert.equal(quoteCalls, 0);
    await page.getByLabel("State / province / region").fill("ON");
    await page.keyboard.press("Tab"); await name.focus();
    const focus = await name.evaluate((element) => ({ style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
    assert.equal(focus.style, "solid"); assert.ok(focus.width >= 2);
    await page.getByRole("button", { name: "Request shipping methods" }).click();
    await page.getByText("Shipping calculation is not available yet.").first().waitFor(); assert.equal(quoteCalls, 1);

    quoteMode = "available";
    await page.getByRole("button", { name: "Request shipping methods" }).click();
    await page.getByRole("radio", { name: /Standard delivery/ }).waitFor();
    assert.equal(await page.getByRole("radio", { name: /Standard delivery/ }).isChecked(), true);
    assert.match(await page.locator(".checkout-summary").innerText(), /\$8\.95 CAD/); assert.match(await page.locator(".checkout-summary").innerText(), /\$39\.45 CAD/);
    assert.match(await page.locator(".paypal-payment").innerText(), /PayPal unavailable[\s\S]*credentials are not configured/i);
    assert.match(await page.locator(".paypal-payment").innerText(), /Card payments temporarily unavailable/i);
    assert.match(await page.locator(".checkout-gate-message").innerText(), /Checkout is currently unavailable/);
    assert.doesNotMatch(await page.locator("body").innerText(), /11576|target-variant|printful|sync_variant|store_id|providerRateId/i);

    await page.getByLabel("Address line 1").fill("101 Changed Street");
    assert.equal(await page.getByRole("radio").count(), 0); assert.match(await page.locator(".shipping-unavailable").innerText(), /Delivery details changed/);
    await page.getByRole("button", { name: "Request shipping methods" }).click(); await page.getByRole("radio", { name: /Standard delivery/ }).waitFor();
    await page.getByRole("link", { name: "Back to cart" }).click(); await page.getByLabel("Quantity for BLEH Fixture").getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("link", { name: "Review delivery readiness" }).click(); await page.getByRole("heading", { level: 1, name: "Delivery & checkout." }).waitFor(); await page.getByText("BLEH Fixture", { exact: true }).waitFor();
    assert.match(await page.locator(".checkout-summary").innerText(), /Qty 2/); assert.equal(await page.getByRole("radio").count(), 0);

    const storage = await page.evaluate(() => ({ cart: localStorage.getItem("thirdrailify-commerce-cart-v2"), keys: Object.keys(localStorage), values: Object.values(localStorage) }));
    assert.deepEqual(storage.keys.filter((key) => key.includes("commerce")), ["thirdrailify-commerce-cart-v2"]);
    assert.doesNotMatch(JSON.stringify(storage.values), /checkout@example\.test|Checkout Fixture|100 Test Street|N6A 1A1|London/);
    assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${RESULTS}/checkout-${width}x${height}.png`, fullPage: true });
    await context.close();
  }

  const accountContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await accountContext.addInitScript(() => localStorage.setItem("thirdrailify-commerce-cart-v2", JSON.stringify([{ productId: "product-1", variantId: "variant-1", quantity: 1 }])));
  const accountPage = await accountContext.newPage(); const accountErrors = [];
  accountPage.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) accountErrors.push(message.text()); });
  accountPage.on("pageerror", (error) => accountErrors.push(error.message));
  await accountPage.route(IMAGE, (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><rect width='100%' height='100%' fill='#171717'/></svg>" }));
  await accountPage.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: true, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: true, account: { id: "account-fixture", email: "verified@example.test", displayName: "Account Fixture", username: null, avatarUrl: null, providers: ["email"], role: "user", adminLevel: "none", status: "active", emailVerified: true, createdAt: "2026-08-29T00:00:00.000Z", lastLoginAt: null, source: "test" }, access: { isAdmin: false, isMasterAdmin: false } });
    if (path === "/api/account/commerce") return json(route, { ok: true, authority: "Admin Commerce D1", linked: true, contact: { name: "Account Fixture", phone: "", email: "verified@example.test", emailVerified: true, revision: 1 }, addresses: [], orders: [], summary: { savedAddressCount: 0, orderCount: 0, liveOrderCount: 0, testOrderCount: 0 }, checkout: { enabled: false, livePaymentCaptureEnabled: false, fulfillmentSubmissionEnabled: false, shippingConfigured: false, message: "Checkout is currently unavailable. No order or payment can be created." } });
    if (path === "/api/commerce/catalogue") return json(route, catalogue());
    if (path === "/api/commerce/shipping-markets") return json(route, { ok: true, authority: "Commerce D1", markets: [{ countryCode: "CA", displayName: "Canada" }] });
    if (path === "/api/commerce/payment-config") return json(route, paymentConfig());
    if (path === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (path === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
  await accountPage.goto(`${ORIGIN}/checkout`);
  await accountPage.getByText("Purchasing as Account Fixture", { exact: true }).waitFor();
  assert.equal(await accountPage.getByLabel("Customer email").inputValue(), "verified@example.test");
  assert.equal(await accountPage.getByLabel("Recipient name").inputValue(), "Account Fixture");
  assert.equal(await accountPage.getByLabel("Customer email").isEditable(), false);
  await accountPage.getByText("Your verified primary account email is used for this purchase.").waitFor();
  assert.equal(await accountPage.evaluate(() => localStorage.getItem("thirdrailify-commerce-cart-v2") !== null), true);
  assert.equal(await accountPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.deepEqual(accountErrors, []);
  await accountContext.close();

  const staleContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await staleContext.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86400000).toISOString(), categories: { preferences: true, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
  await staleContext.addInitScript(() => localStorage.setItem("thirdrailify-commerce-cart-v2", JSON.stringify([{ productId: "archived-product", variantId: "archived-variant", quantity: 2 }])));
  const stalePage = await staleContext.newPage(); const staleErrors = [];
  stalePage.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) staleErrors.push(message.text()); });
  stalePage.on("pageerror", (error) => staleErrors.push(error.message));
  await stalePage.route("**/api/**", async (route) => { const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (path === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, authority: { currentProducts: 0, reconciled: true }, updatedAt: "2026-09-01T00:00:00.000Z", collections: [], products: [] });
    if (path === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (path === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
  await stalePage.goto(`${ORIGIN}/cart`); await stalePage.getByRole("heading", { name: "Your cart." }).waitFor();
  await stalePage.getByRole("heading", { name: "Unavailable catalogue item" }).waitFor();
  assert.match(await stalePage.locator(".cart-summary").innerText(), /1 unavailable cart item[\s\S]*excluded from the subtotal/i);
  await stalePage.getByRole("button", { name: "Open cart, 2 items" }).click();
  const drawer = stalePage.getByRole("dialog", { name: "Your cart" }); await drawer.getByRole("heading", { name: "Unavailable catalogue item" }).waitFor();
  await drawer.getByRole("button", { name: "Remove unavailable item from cart" }).click();
  await drawer.getByRole("heading", { name: "Nothing on the rail yet." }).waitFor();
  assert.equal(await stalePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.deepEqual(staleErrors, []);
  await stalePage.screenshot({ path: `${RESULTS}/stale-cart-390x844.png`, fullPage: true });
  await staleContext.close();
});

async function fillDelivery(page) {
  await page.getByLabel("Recipient name").fill("Checkout Fixture");
  await page.getByLabel("Address line 1").fill("100 Test Street");
  await page.getByLabel("City / locality").fill("London");
  await page.getByLabel("State / province / region").fill("ON");
  await page.getByLabel("Postal / ZIP code").fill("N6A 1A1");
  await page.getByLabel("Destination country").selectOption("CA");
}
function paymentConfig() { return { ok: true, provider: "paypal", preferred: true, environment: "sandbox", currency: "CAD", intent: "CAPTURE", clientId: null, configured: false, webhookConfigured: false, storeCheckoutEnabled: false, donationsEnabled: false, emergencyPaused: false, stripe: { configured: true, enabled: false, preferred: false }, message: "PayPal credentials are not configured." }; }
function shippingQuote() { return { ok: true, quote: { id: "shq_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", expiresAt: "2099-08-29T01:15:00.000Z", currency: "CAD", subtotalAmount: 3050, requiresShipping: true, checkoutAvailable: false, options: [{ id: "shr_bbbbbbbbbbbbbbbbbbbbbbbb", name: "Standard delivery", amount: 895, currency: "CAD", totalAmount: 3945, delivery: { minDays: 3, maxDays: 7, minDate: null, maxDate: null } }] } }; }
function catalogue() { return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-29T00:00:00.000Z", collections: [], products: [{ id: "product-1", slug: "bleh-fixture", title: "BLEH Fixture", description: "Fixture product.", images: [IMAGE], categories: ["Apparel"], collectionSlugs: [], tags: [], featured: false, featuredOrder: null, displayOrder: 10, maxQuantity: 5, available: true, price: { minUnitAmount: 3050, maxUnitAmount: 3050, label: "CA$30.50" }, variants: [{ id: "variant-1", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 3050, currency: "CAD", availability: "active" }] }] }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Checkout browser test server did not start."); }
