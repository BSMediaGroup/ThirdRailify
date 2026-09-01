import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4198";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VIEWPORTS = [[1440, 900], [768, 1024], [390, 844]];

test("Donate is a complete responsive, accessible, and fail-closed one-time PayPal destination", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--mode", "paypal-fixture", "--host", "127.0.0.1", "--port", "4198"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = []; const paypalRequests = []; const failedResponses = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { const host = new URL(request.url()).hostname; if (host === "paypal.com" || host.endsWith(".paypal.com") || host.endsWith(".paypalobjects.com")) paypalRequests.push(request.url()); });
    page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
    await mockShellApis(page);
    await page.goto(`${ORIGIN}/donate`, { waitUntil: "domcontentloaded" });
    await page.locator(".donate-hero h1").waitFor();
    const privacyDock = page.locator(".privacy-dock");
    if (await privacyDock.isVisible()) await privacyDock.getByRole("button", { name: "Reject non-essential" }).click();

    assert.equal(await page.title(), "Donate to Third Railify | Power the Signal");
    assert.equal(await page.locator("h1").count(), 1, `Donate has one H1 at ${width}x${height}`);
    assert.match(await page.locator("h1").innerText(), /DONATE\.\s*POWER THE\s+SIGNAL\./i);
    assert.equal(await page.locator(".donate-signal").isVisible(), true, "the graphical community-power signal is visible");
    assert.ok((await page.locator(".donate-hero").boundingBox())?.height >= (width <= 520 ? 900 : 600), "the hero remains a substantial composed experience");
    const headerBottom = await page.locator(".site-header").evaluate((element) => element.getBoundingClientRect().bottom);
    const headingTop = await page.locator("h1").evaluate((element) => element.getBoundingClientRect().top);
    assert.ok(headingTop >= headerBottom, `heading clears the global header at ${width}x${height}`);
    assert.equal(await page.locator('input[name="donation-frequency"]').count(), 1);
    const suggestedDonationValues = await page.locator('input[name="donation-amount"]').evaluateAll((inputs) => inputs.map((input) => input.value));
    assert.deepEqual(suggestedDonationValues, ["5", "15", "25", "50", "100", "250", "500", "1000"], "both rows of suggested donation amounts are available in order");
    const once = page.locator('input[name="donation-frequency"][value="once"]');
    assert.equal(await once.isChecked(), true, "only one-time donations are offered");
    await page.locator(".donate-amount label").filter({ has: page.locator('input[value="25"]') }).click();
    assert.equal(await page.locator('input[name="donation-amount"][value="25"]').isChecked(), true, "suggested amount label selects its radio");
    assert.match(await page.locator(".donate-summary").innerText(), /\$25 CAD[\s\S]*one-time donation/i);
    await page.locator(".donate-amount label").filter({ has: page.locator('input[value="1000"]') }).click();
    assert.equal(await page.locator('input[name="donation-amount"][value="1000"]').isChecked(), true, "second-row suggested amount selects its radio");
    assert.match(await page.locator(".donate-summary").innerText(), /\$1,000 CAD/);
    await page.locator(".donate-custom-amount input").fill("73");
    assert.match(await page.locator(".donate-summary").innerText(), /\$73 CAD/);
    const payment = page.locator(".paypal-payment");
    assert.match(await payment.innerText(), /PayPal unavailable[\s\S]*credentials are not configured/i);
    assert.equal(await page.locator(".donate-form[action], .donate-form a[href*='paypal' i]").count(), 0, "no provider handoff exists");
    assert.deepEqual(paypalRequests, [], "the page creates no PayPal request");
    assert.equal(await page.locator('.site-footer a[href="/donate"]').getByText("Donate", { exact: true }).count(), 1);
    assert.equal(await page.locator('.site-footer a[href="/support"]').count(), 0);
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `no horizontal overflow at ${width}x${height}`);
    assert.deepEqual(errors, [], `no page errors at ${width}x${height}; failed responses: ${failedResponses.join(", ") || "none"}`);
    if (process.env.DONATE_BROWSER_SCREENSHOTS === "1") {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-donate-${width}-PROOF.png`), fullPage: true });
    }
    await context.close();
  }

  const aliasContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const aliasPage = await aliasContext.newPage(); await mockShellApis(aliasPage);
  await aliasPage.goto(`${ORIGIN}/support?source=legacy#donation-console`);
  await aliasPage.waitForURL(`${ORIGIN}/donate?source=legacy#donation-console`);
  await aliasPage.goto(`${ORIGIN}/donate-1?source=wix#donation-console`);
  await aliasPage.waitForURL(`${ORIGIN}/donate?source=wix#donation-console`);
  await aliasPage.goto(`${ORIGIN}/`); await aliasPage.locator('.community-links a[href="/donate"]').waitFor();
  assert.equal(await aliasPage.locator('.community-links a[href="/support"]').count(), 0);
  await aliasContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage(); await mockShellApis(reducedPage); await reducedPage.goto(`${ORIGIN}/donate`);
  for (const selector of [".donate-hero__rails i", ".donate-signal__scope::before", ".donate-signal__orbit", ".donate-signal__wave i"]) {
    const elementSelector = selector.replace("::before", "");
    const pseudo = selector.endsWith("::before") ? "::before" : null;
    assert.equal(await reducedPage.locator(elementSelector).first().evaluate((element, pseudoElement) => getComputedStyle(element, pseudoElement).animationName, pseudo), "none", `${selector} respects reduced motion`);
  }
  await reducedContext.close();

  for (const [width, height] of VIEWPORTS) {
    const scenario = paymentScenario("completed");
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.addInitScript(() => { window.__THIRDRAILIFY_REPEAT_APPROVAL__ = true; });
    await mockShellApis(page, scenario);
    await page.goto(`${ORIGIN}/donate`, { waitUntil: "domcontentloaded" });
    const privacyDock = page.locator(".privacy-dock");
    if (await privacyDock.isVisible()) await privacyDock.getByRole("button", { name: "Reject non-essential" }).click();
    await page.locator(".donate-custom-amount input").fill("73");
    await page.getByTestId("synthetic-paypal-approval").click();

    const confirmation = page.locator(".donation-confirmation");
    await confirmation.getByRole("heading", { name: "Thank you for supporting Third Railify" }).waitFor();
    assert.match(await confirmation.innerText(), /Your contribution has been received successfully\.[\s\S]*\$15\.00 CAD[\s\S]*Payment confirmed[\s\S]*don_fixture-reference/i, "the server-created CAD amount and local donation reference are presented");
    assert.equal(await page.locator(".donate-form, .paypal-payment, input[name='donation-amount']").count(), 0, "all payment and amount-changing controls leave the terminal state");
    assert.equal(scenario.createCalls, 1, "one server donation intent is created");
    assert.equal(scenario.captureCalls, 1, "a replayed approval cannot initiate a second capture");
    assert.equal(await confirmation.getAttribute("role"), "status");
    assert.equal(await confirmation.getAttribute("aria-live"), "polite");
    assert.equal(await confirmation.evaluate((element) => document.activeElement === element), true, "the completed status surface receives focus");
    assert.doesNotMatch(await page.locator("body").innerText(), /donor@example\.test|client-secret|PAYPALORDERFIXTURE|CAPTUREFIXTURE/i, "PII, secrets, and provider internals are not rendered");
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `completed state has no overflow at ${width}x${height}`);
    const box = await confirmation.boundingBox();
    const completedHeaderBottom = await page.locator(".site-header").evaluate((element) => element.getBoundingClientRect().bottom);
    assert.ok(box && box.y >= completedHeaderBottom, `the focused success surface clears the sticky header at ${width}x${height} (surface ${box?.y ?? "missing"}, header ${completedHeaderBottom})`);
    assert.ok(box && box.height < (width <= 780 ? 760 : 950), `completed state remains compact at ${width}x${height} (${box?.height ?? "missing"}px)`);
    if (process.env.DONATE_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-donate-complete-${width}-PROOF.png`) });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".donation-confirmation").getByRole("heading", { name: "Thank you for supporting Third Railify" }).waitFor();
    assert.equal(scenario.createCalls, 1, "reload does not create another donation intent");
    assert.equal(scenario.captureCalls, 1, "reload revalidates status and does not capture again");
    assert.ok(scenario.statusCalls >= 1, "reload restores completion only after server status revalidation");

    await page.goto(`${ORIGIN}/watch`);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator(".donation-confirmation").getByRole("heading", { name: "Thank you for supporting Third Railify" }).waitFor();
    assert.equal(scenario.captureCalls, 1, "back navigation restores from server status without another capture");

    await page.getByRole("button", { name: "Make another donation" }).click();
    await page.getByTestId("synthetic-paypal-approval").click();
    assert.equal(scenario.createCalls, 2, "a deliberate new donation creates one new intent");
    assert.notEqual(scenario.requestIds[0], scenario.requestIds[1], "the new donation uses a distinct request identifier");
    await context.close();
  }

  for (const captureStatus of ["pending", "failed"]) {
    const scenario = paymentScenario(captureStatus);
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await context.newPage(); await mockShellApis(page, scenario);
    await page.goto(`${ORIGIN}/donate`);
    await page.getByTestId("synthetic-paypal-approval").click();
    const expectedStatus = captureStatus === "pending" ? "pending provider confirmation" : "not completed";
    await page.locator(".paypal-payment__status").filter({ hasText: expectedStatus }).waitFor();
    assert.equal(await page.locator(".donation-confirmation:not(.is-checking)").count(), 0, `${captureStatus} authority never renders the thank-you state`);
    assert.doesNotMatch(await page.locator("body").innerText(), /Thank you for supporting Third Railify/i);
    assert.match(await page.locator(".paypal-payment__status").innerText(), captureStatus === "pending" ? /pending provider confirmation/i : /not completed/i);
    assert.equal(await page.getByTestId("synthetic-paypal-approval").isDisabled(), captureStatus === "pending", "pending locks the control while failure preserves safe retry");
    assert.equal(scenario.captureCalls, 1);
    await context.close();
  }
});

function paymentScenario(captureStatus) {
  return { captureStatus, createCalls: 0, captureCalls: 0, statusCalls: 0, requestIds: [] };
}

async function mockShellApis(page, payment = null) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, USD: .73, AUD: 1.1 } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/analytics") return route.fulfill({ status: 204, body: "" });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], updatedAt: null });
    if (pathname === "/api/commerce/payment-config") return json(route, payment ? { ok: true, provider: "paypal", preferred: true, environment: "sandbox", currency: "CAD", intent: "CAPTURE", clientId: "fixture-client-id", configured: true, webhookConfigured: true, storeCheckoutEnabled: false, donationsEnabled: true, emergencyPaused: false, stripe: { configured: true, enabled: false, preferred: false }, message: null } : { ok: true, provider: "paypal", preferred: true, environment: "sandbox", currency: "CAD", intent: "CAPTURE", clientId: null, configured: false, webhookConfigured: false, storeCheckoutEnabled: false, donationsEnabled: false, emergencyPaused: false, stripe: { configured: true, enabled: false, preferred: false }, message: "PayPal credentials are not configured." });
    if (payment && pathname === "/api/commerce/paypal/donation") { payment.createCalls += 1; const request = JSON.parse(route.request().postData() || "{}"); payment.requestIds.push(request.donationRequestId); return json(route, { ok: true, provider: "paypal", attemptId: `pat_fixture-${payment.createCalls}`, orderId: `PAYPALORDERFIXTURE${payment.createCalls}`, target: "donation", reference: `don_fixture-reference-${payment.createCalls}`, environment: "sandbox", currency: "CAD", amount: 1500, payer: { email: "donor@example.test" }, clientSecret: "client-secret" }, 201); }
    if (payment && pathname === "/api/commerce/paypal/capture") { payment.captureCalls += 1; return json(route, { ok: true, attemptId: `pat_fixture-${payment.createCalls}`, kind: "donation", reference: `don_fixture-reference-${payment.createCalls}`, status: payment.captureStatus, captureId: "CAPTUREFIXTURE", payerEmail: "donor@example.test" }); }
    if (payment && pathname === "/api/commerce/payment-status") { payment.statusCalls += 1; return json(route, { ok: true, payment: { reference: `pat_fixture-${payment.createCalls}`, kind: "donation", orderReference: null, donationReference: `don_fixture-reference-${payment.createCalls}`, environment: "sandbox", currency: "CAD", amount: 1500, status: payment.captureStatus, updatedAt: "2026-09-01T00:00:00.000Z", providerOrderId: "PAYPALORDERFIXTURE" } }); }
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: false, messages: [], mode: "static", speed: "normal" }, live: { enabled: false }, updatedAt: "2026-08-29T00:00:00.000Z" });
    return json(route, { error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite donate test server did not start."); }
