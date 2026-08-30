import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4198";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VIEWPORTS = [[1440, 900], [768, 1024], [390, 844]];

test("Donate is a complete responsive, accessible, and fail-closed one-time PayPal destination", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4198"], { stdio: "ignore" });
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
    assert.equal(await page.locator('input[name="donation-amount"]').count(), 4);
    const once = page.locator('input[name="donation-frequency"][value="once"]');
    assert.equal(await once.isChecked(), true, "only one-time donations are offered");
    await page.locator(".donate-amount label").filter({ has: page.locator('input[value="25"]') }).click();
    assert.equal(await page.locator('input[name="donation-amount"][value="25"]').isChecked(), true, "suggested amount label selects its radio");
    assert.match(await page.locator(".donate-summary").innerText(), /\$25 CAD[\s\S]*one-time donation/i);
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
});

async function mockShellApis(page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, USD: .73, AUD: 1.1 } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], updatedAt: null });
    if (pathname === "/api/commerce/payment-config") return json(route, { ok: true, provider: "paypal", preferred: true, environment: "sandbox", currency: "CAD", intent: "CAPTURE", clientId: null, configured: false, webhookConfigured: false, storeCheckoutEnabled: false, donationsEnabled: false, emergencyPaused: false, stripe: { configured: true, enabled: false, preferred: false }, message: "PayPal credentials are not configured." });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: false, messages: [], mode: "static", speed: "normal" }, live: { enabled: false }, updatedAt: "2026-08-29T00:00:00.000Z" });
    return json(route, { error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite donate test server did not start."); }
