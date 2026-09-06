import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const origin = process.env.CHECKOUT_BROWSER_ORIGIN || "http://127.0.0.1:4199";
const output = process.env.REPAIR_SCREENSHOTS || "output/commerce-repair";
const account = { avatarUrl: "https://cdn.thirdrailify.com/profile-media/checkout-avatar-fixture.png", id: "fixture-account", email: "checkout@example.test", displayName: "Checkout Fixture", emailVerified: true, providers: ["email"], role: "user", adminLevel: "none", status: "active" };
const address = { id: "adr_fixture", label: "Australian delivery", recipientName: "Checkout Fixture", company: "", address1: "1 Martin Place", address2: "", city: "Sydney", region: "NSW", countryCode: "AU", postalCode: "2000", phone: "", isDefault: true, revision: 1 };
const products = [
  { id: "product-393307261", slug: "gina-fixture", title: "Just Gina™ Icon | Unisex tee", amount: 3050, variantId: "variant-4974991984" },
  { id: "printful-18668025-466945458", slug: "fuc-yeh-fixture", title: "fuc yeh | Men's Premium Short Sleeve Tee", amount: 4100, variantId: "printful-variant-18668025-5484152196" },
].map(p => ({ ...p, description: "Controlled checkout fixture", images: [], categories: [], collectionSlugs: [], tags: [], available: true, maxQuantity: 20, price: { minUnitAmount: p.amount, maxUnitAmount: p.amount, label: "CAD" }, variants: [{ id: p.variantId, label: "M", options: { Size: "M" }, size: "M", color: null, unitAmount: p.amount, currency: "CAD", availability: "active" }] }));
const items = products.map(p => ({ productId: p.id, variantId: p.variantId, quantity: 1 }));
const readiness = { state: "active", storeActive: true, checkoutEnabled: true, paused: false, paymentReady: true, fulfillmentReady: true, paymentProvider: "paypal", destinations: ["AU", "CA"], blockers: [], revision: "a".repeat(64) };
const quote = { id: "fixture-quote", expiresAt: "2099-01-01T00:00:00Z", currency: "CAD", subtotalAmount: 7150, requiresShipping: true, checkoutAvailable: true, options: [{ id: "fixture-rate", name: "Flat Rate", amount: 1178, totalAmount: 8328, currency: "CAD", delivery: { minDays: 25, maxDays: 30 } }] };
const policy = name => ({ url: "/" + name, title: name, version: "fixture" });
const agreement = { id: "fixture-agreement", qualifyingInternetAgreement: true, merchant: { legalName: "Synthetic Merchant", tradingName: "Synthetic Store", phone: "Fixture phone", address: { line1: "Synthetic business address" }, supportEmail: "store@example.test" }, items: products.map(p => ({ productId: p.id, variantId: p.variantId, name: p.title, variant: "M", unitAmount: p.amount, quantity: 1, lineTotalAmount: p.amount })), totals: { productSubtotalAmount: 7150, shippingAmount: 1178, taxAmount: 0, totalAmount: 8328, currency: "CAD" }, tax: { statement: "Not collecting" }, shipping: { method: "Flat Rate", delivery: quote.options[0].delivery, destination: { city: "Sydney", region: "NSW", country: "AU" } }, payment: { terms: "PayPal payment after agreement review" }, fulfillment: { statement: "Fulfillment follows completed payment" }, policies: { terms: policy("terms"), privacy: policy("privacy"), returns: policy("refunds") }, conditions: [], offeredAt: "2026-09-07T00:00:00Z", expiresAt: "2099-01-01T00:00:00Z" };

test("active Cart to Australian delivery, shipping, agreement and PayPal boundary at four widths", async t => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  t.after(() => browser.close());
  // Public configuration is a read-only SDK configuration; all transaction endpoints are trapped below.
  const payment = await (await fetch("https://thirdrailify.com/api/commerce/payment-config")).json();
  assert.equal(payment.storeCheckoutEnabled, true); assert.equal(payment.stripe.enabled, false);
  for (const [width, height] of [[1920,1080],[1440,900],[768,1024],[390,844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86400000).toISOString(), categories: { preferences: true, externalMedia: false } })), url: origin, sameSite: "Lax" }]);
    await context.addInitScript(items => localStorage.setItem("thirdrailify-commerce-cart-v2", JSON.stringify(items)), items);
    let mode = "active", quoteCalls = 0, transactions = 0, agreementCalls = 0;
    const errors = [];
    const sdkRequests = [];
    const page = await context.newPage();
    await page.route(account.avatarUrl, route => route.fulfill({ contentType: "image/png", path: "assets/logos/thirdrail-logo4.png" }));
    page.on("pageerror", e => errors.push(e.message));
    page.on("requestfailed", r => sdkRequests.push({ url: r.url().split("?")[0], failure: r.failure()?.errorText }));
    page.on("request", r => { if (/paypal/.test(r.url())) sdkRequests.push(r.url().split("?")[0]); });
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      const json = body => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/api/auth/config") return json({ configured: true, emailSignupConfigured: true, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: origin, adminOrigin: origin, environment: "test", cookieMode: "host-only" });
      if (path === "/api/auth/session") return json({ ok: true, authenticated: mode !== "guest", account: mode === "guest" ? null : account, access: { isAdmin: false, isMasterAdmin: false }, csrfToken: "fixture" });
      if (path === "/api/account/commerce") return json({ ok: true, linked: true, contact: { name: account.displayName, email: account.email, emailVerified: true }, addresses: [{ ...address, countryCode: mode === "destination" ? "ZZ" : "AU" }], orders: [], summary: {}, checkout: { enabled: true } });
      if (path === "/api/commerce/catalogue") return json({ ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: mode !== "paused", checkoutReadiness: mode === "paused" ? { ...readiness, state: "paused", paused: true, checkoutEnabled: false, blockers: [{ code: "store_paused", message: "The store is temporarily paused." }] } : readiness, collections: [], products: mode === "invalid" ? products.slice(1) : products });
      if (path === "/api/commerce/shipping-markets") return json({ ok: true, markets: [{ countryCode: "AU", displayName: "Australia" }, { countryCode: "CA", displayName: "Canada" }] });
      if (path === "/api/commerce/payment-config") return json(payment);
      if (path === "/api/commerce/shipping-quotes") { quoteCalls++; const body = route.request().postDataJSON(); assert.equal(body.recipient.countryCode, "AU"); assert.equal(body.recipient.region, "NSW"); assert.deepEqual(body.items, items); return json({ ok: true, quote }); }
      if (path === "/api/commerce/agreement") { agreementCalls++; return json({ ok: true, agreement, acceptanceToken: "fixture-token" }); }
      if (/paypal\/(store|capture)|commerce\/checkout/.test(path)) { transactions++; return route.abort(); }
      if (path === "/api/currency-rates") return json({ ok: true, base: "CAD", rates: { CAD: 1 }, date: "2026-09-07" });
      if (path === "/api/catalogue/banner") return json({ ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
      if (path === "/api/watch") return json({ available: false, liveNow: [], primary: null });
      return json({ ok: true, items: [], available: false });
    });
    await page.goto(origin + "/cart");
    await page.getByRole("button", { name: /Open cart,/ }).click();
    const drawer = page.getByRole("dialog", { name: "Your cart" });
    const drawerCheckout = drawer.getByRole("link", { name: "Proceed to checkout" });
    await drawerCheckout.waitFor();
    assert.equal(await drawerCheckout.getAttribute("class"), "button button--primary");
    await page.screenshot({ path: `${output}/drawer-${width}.png`, fullPage: true });
    await drawerCheckout.click();
    await page.waitForURL(origin + "/checkout");
    assert.equal(await drawer.count(), 0);
    await page.goto(origin + "/cart");
    const cta = page.getByRole("link", { name: "Proceed to checkout" }); await cta.waitFor();
    await page.getByText("Australian delivery", { exact: true }).waitFor();
    assert.equal(quoteCalls, 0); assert.equal(await cta.getAttribute("class"), "button button--primary");
    await check(page); await page.screenshot({ path: `${output}/cart-${width}.png`, fullPage: true });
    await cta.click(); await page.waitForURL(origin + "/checkout");
    await page.waitForFunction(() => document.querySelector('input[name="address1"]')?.value === "1 Martin Place");
    assert.equal(await page.getByLabel("Country", { exact: true }).inputValue(), "AU");
    assert.equal(await page.getByLabel("State / territory", { exact: true }).inputValue(), "NSW");
    const checkoutAvatar = page.locator(".checkout-account-identity img.account-avatar");
    await checkoutAvatar.waitFor();
    assert.equal(await checkoutAvatar.getAttribute("src"), account.avatarUrl);
    assert.equal(await page.locator(".account-widget img.account-avatar").first().getAttribute("src"), account.avatarUrl);
    await checkoutAvatar.evaluate(img => img.decode());
    await check(page); await page.screenshot({ path: `${output}/delivery-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Request shipping methods" }).click();
    await page.getByRole("radio", { name: /Flat Rate/ }).waitFor(); assert.equal(quoteCalls, 1);
    await page.screenshot({ path: `${output}/shipping-${width}.png`, fullPage: true });
    assert.equal(await page.getByRole("button", { name: "Review transaction agreement" }).count(), 0);
    assert.equal(await page.getByRole("checkbox", { name: /I explicitly accept/ }).count(), 0);
    assert.equal(await page.locator(".checkout-summary details").count(), 0);
    await page.getByText("Secure PayPal payment", { exact: true }).waitFor();
    await page.locator(".paypal-payment").scrollIntoViewIfNeeded();
    const paypalButton = page.locator(".paypal-payment").getByRole("button").first();
    await paypalButton.waitFor({ state: "visible" }).catch(async error => { throw new Error(JSON.stringify({ errors, sdkRequests, html: await page.locator(".paypal-payment").evaluate(e => e.querySelector("paypal-button")?.shadowRoot?.innerHTML || e.innerHTML), message: error.message })); });
    await page.waitForFunction(() => document.querySelector(".paypal-payment paypal-button")?.shadowRoot?.querySelector("button")?.disabled === false);
    assert.equal(await paypalButton.isEnabled(), true);
    const notice = page.locator(".paypal-payment__acceptance");
    await notice.waitFor();
    assert.match(await notice.innerText(), /By clicking PayPal Checkout/);
    for (const link of await notice.getByRole("link").all()) {
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
    }
    assert.doesNotMatch(await page.locator(".checkout-summary").innerText(), /Fixture phone|Synthetic business address|Business premises/);
    assert.match(await page.locator(".checkout-summary").innerText(), /83\.28 CAD/);
    assert.match(await page.locator(".checkout-summary").innerText(), /Not collecting/);
    assert.equal(await page.locator('input[autocomplete="cc-number"]').count(), 0);
    await check(page); await page.screenshot({ path: `${output}/review-${width}.png`, fullPage: true });
    assert.equal(transactions, 0); assert.deepEqual(errors, []);
    assert.equal(agreementCalls, 0, "Simply reviewing checkout does not offer or accept an agreement");
    if (width === 390) {
      // All application API calls are intercepted fixtures. Stop the click at
      // the application create boundary, before any provider transaction.
      let acceptedRequest;
      await page.route("**/api/commerce/paypal/store", async route => {
        acceptedRequest = route.request().postDataJSON();
        return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ ok: false, message: "Synthetic acceptance verified; no order created." }) });
      });
      const attempted = page.waitForResponse(response => response.url().endsWith("/api/commerce/paypal/store"));
      await paypalButton.click();
      await attempted;
      assert.equal(agreementCalls, 1);
      assert.equal(acceptedRequest.agreementAccepted, true);
      assert.equal(acceptedRequest.agreementId, agreement.id);
      assert.equal(acceptedRequest.agreementToken, "fixture-token");
      assert.deepEqual(acceptedRequest.items, items);
      assert.equal(transactions, 0);
      for (const [next, button] of [["paused", "Store paused"], ["invalid", "Remove unavailable items"], ["destination", "Choose another destination"]]) {
        mode = next; await page.goto(origin + "/cart"); await page.getByRole("button", { name: button, exact: true }).waitFor(); assert.equal(await page.getByRole("button", { name: button, exact: true }).isDisabled(), true); await check(page);
        if (next !== "destination") {
          await page.getByRole("button", { name: /Open cart,/ }).click();
          const blockedDrawer = page.getByRole("dialog", { name: "Your cart" });
          await blockedDrawer.getByRole("button", { name: button, exact: true }).waitFor();
          assert.equal(await blockedDrawer.getByRole("button", { name: button, exact: true }).isDisabled(), true);
          await blockedDrawer.getByRole("button", { name: "Close cart", exact: true }).click();
        }
      }
      mode = "guest"; await page.goto(origin + "/cart"); await page.getByRole("link", { name: "Proceed to checkout" }).click(); await page.getByRole("button", { name: /Continue as guest/ }).waitFor();
      await page.evaluate(() => localStorage.removeItem("thirdrailify-commerce-cart-v2")); await context.clearCookies();
    }
    await context.close();
  }
});

async function check(page) { await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); assert.doesNotMatch(await page.locator("body").innerText(), /Checkout is currently unavailable/); }
