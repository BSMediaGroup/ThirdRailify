import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4207";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("Public account messages open full details and support individual and bulk controls", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4207"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    const actions = [];
    let item = message();
    page.on("dialog", (dialog) => dialog.accept());
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: true, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
      if (path === "/api/auth/session") return json(route, { ok: true, authenticated: true, csrfToken: "inbox-csrf", access: { isAdmin: false, isMasterAdmin: false }, account: { id: "account-fixture", email: "member@example.test", displayName: "Rail Member", username: null, avatarUrl: null, providers: ["email"], role: "user", adminLevel: "none", status: "active", emailVerified: true, createdAt: "2026-08-01T00:00:00.000Z", lastLoginAt: null, source: "test" } });
      if (path === "/api/account/commerce") return json(route, overview());
      if (path === "/api/account/commerce/inbox" && route.request().method() === "GET") return json(route, { ok: true, authority: "Admin Commerce D1", items: item ? [item] : [], total: item ? 1 : 0, unread: item?.unread ? 1 : 0 });
      if (path === "/api/account/commerce/inbox/bulk") {
        const body = route.request().postDataJSON(); actions.push(body.action);
        if (body.action === "delete") item = null;
        else if (item) item = { ...item, unread: body.action === "unread", readAt: body.action === "read" ? new Date().toISOString() : null };
        return json(route, { ok: true, updated: 1 });
      }
      return json(route, { ok: false, error: "not_found" }, 404);
    });

    await page.goto(`${ORIGIN}/account/messages`);
    await page.getByRole("heading", { level: 1, name: "Messages" }).waitFor();
    await page.locator(".account-message").click();
    const dialog = page.getByRole("dialog", { name: "Your order is on the rail" });
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /Full authoritative message body.*TR-TEST1001.*order fixture/is);
    await dialog.getByRole("button", { name: "Close message" }).click();
    await page.getByLabel("Select Your order is on the rail").check();
    await page.locator(".account-inbox__bulk").getByRole("button", { name: "Unread", exact: true }).click();
    await page.locator(".account-message.is-unread").waitFor();
    await page.locator(".account-message").click();
    await dialog.waitFor();
    await dialog.getByRole("button", { name: "Close message" }).click();
    await page.locator(".account-message__actions").getByRole("button", { name: "Delete" }).click();
    await page.getByText("Your inbox is clear").waitFor();
    assert.deepEqual(actions, ["read", "unread", "read", "delete"]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await context.close();
  }
});

function message() { return { id: "account-message-1", category: "Orders", sourceType: "order", sourceId: "ord-fixture", title: "Your order is on the rail", preview: "A concise list preview.", body: "Full authoritative message body with delivery and status context.", actionUrl: "/account/orders", actionLabel: "View orders", details: { reference: "TR-TEST1001", note: "order fixture" }, createdAt: "2026-08-31T00:00:00.000Z", expiresAt: null, readAt: null, unread: true }; }
function overview() { return { ok: true, authority: "Admin Commerce D1", linked: true, contact: { name: "Rail Member", phone: null, email: "member@example.test", emailVerified: true, revision: 1 }, addresses: [], orders: [], summary: { savedAddressCount: 0, orderCount: 0, liveOrderCount: 0, testOrderCount: 0 }, checkout: { enabled: false, livePaymentCaptureEnabled: false, fulfillmentSubmissionEnabled: false, shippingConfigured: false, message: "Checkout unavailable." } }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Public inbox test server did not start."); }
