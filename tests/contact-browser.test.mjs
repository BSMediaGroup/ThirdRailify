import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4199";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("homepage contact band opens an accessible protected modal and submits no delivery authority", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4199"], { stdio: "ignore" });
  t.after(() => server.kill()); await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());

  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      window.turnstile = {
        render(container, options) { container.textContent = "Human verification complete"; setTimeout(() => options.callback("fixture-contact-token"), 0); return "contact-widget"; },
        reset() {}, remove() {},
      };
    });
    const page = await context.newPage(); const errors = []; const submissions = []; const failedResponses = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
    await mockApis(page, submissions);
    await page.goto(ORIGIN); await page.locator(".contact-band").scrollIntoViewIfNeeded();
    const privacyDock = page.locator(".privacy-dock"); if (await privacyDock.isVisible()) await privacyDock.getByRole("button", { name: "Reject non-essential" }).click();
    const trigger = page.getByRole("button", { name: "Contact", exact: true });
    assert.equal(await trigger.isVisible(), true);
    assert.equal(await page.locator('.contact-band a[href="/donate"]').getByText("Donate", { exact: true }).count(), 1);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Send a message." }); await dialog.waitFor();
    assert.equal(await page.locator("body").evaluate((body) => body.style.overflow), "hidden");
    assert.equal(await page.locator('input[name="name"]').evaluate((input) => document.activeElement === input), true, "first field receives focus");
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" });
    await assertEventually(() => trigger.evaluate((button) => document.activeElement === button));

    await trigger.click(); await page.getByRole("dialog", { name: "Send a message." }).waitFor();
    await page.locator('input[name="name"]').fill("Rail Viewer");
    await page.locator('input[name="email"]').fill("viewer@example.test");
    await page.locator('select[name="topic"]').selectOption("show-media");
    await page.locator('textarea[name="message"]').fill("I would like to ask about an upcoming Third Railify programme.");
    await page.locator(".contact-consent input").check();
    const submit = page.getByRole("button", { name: "Send message" }); await submit.waitFor();
    await assertEventually(async () => !(await submit.isDisabled()));
    if (process.env.CONTACT_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-contact-form-${width}-PROOF.png`), fullPage: false });
    await submit.click(); await page.getByText("Message delivered", { exact: true }).waitFor();
    const successClose = page.getByRole("button", { name: "Close", exact: true });
    await assertEventually(() => successClose.evaluate((button) => document.activeElement === button));
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].turnstileToken, "fixture-contact-token");
    assert.equal(submissions[0].email, "viewer@example.test");
    assert.equal("to" in submissions[0] || "cc" in submissions[0], false, "browser payload contains no delivery recipients");
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `no overflow at ${width}x${height}`);
    assert.deepEqual(errors, [], `no browser errors at ${width}x${height}; failed responses: ${failedResponses.join(", ") || "none"}`);
    if (process.env.CONTACT_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-contact-success-${width}-PROOF.png`), fullPage: false });
    await successClose.click(); await assertEventually(() => trigger.evaluate((button) => document.activeElement === button));
    await page.locator(".contact-band").scrollIntoViewIfNeeded();
    if (process.env.CONTACT_BROWSER_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-contact-band-${width}-PROOF.png`), fullPage: false });
    await context.close();
  }
});

async function mockApis(page, submissions) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/contact") { submissions.push(JSON.parse(route.request().postData() || "{}")); return json(route, { ok: true, message: "Your message has been sent to Third Railify." }); }
    if (pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: "fixture-site-key", oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, USD: .73 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], updatedAt: null });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/community/discord") return json(route, { available: true, schema: "thirdrailify-discord-community-v1", freshness: "fresh", generatedAt: "2026-08-29T00:00:00.000Z", ageSeconds: 0, guild: { id: "1114717958573396008", name: "Third Railify", inviteUrl: "https://discord.com/invite/Bd8hU5aFxA" }, counts: { onlineMembers: 0 }, channels: [], voiceSpaces: [], members: [] });
    return json(route, { error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite contact test server did not start."); }
async function assertEventually(assertion) { for (let attempt = 0; attempt < 50; attempt += 1) { if (await assertion()) return; await new Promise((resolve) => setTimeout(resolve, 20)); } assert.fail("condition did not become true"); }
