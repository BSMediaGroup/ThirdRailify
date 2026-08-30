import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4203";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("Public account widget matches Admin typography and opens the shield link in a new tab", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4203"], {
    env: { ...process.env, VITE_THIRDRAILIFY_ADMIN_ORIGIN: ORIGIN },
    stdio: "ignore",
  });
  t.after(() => server.kill());
  await waitForServer();

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/config") return json(route, { configured: true, publicOrigin: ORIGIN, adminOrigin: ORIGIN, oauthProviders: [], oauthProviderStates: [], cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: true, csrfToken: "fixture-csrf", access: { isAdmin: true, isMasterAdmin: true }, account: { id: "fixture", email: "master@example.test", displayName: "Master Admin 1", username: null, avatarUrl: null, providers: ["email"], role: "admin", adminLevel: "master", status: "active", emailVerified: true, createdAt: "2026-08-30T00:00:00.000Z", lastLoginAt: null, source: "test" } });
    if (path === "/api/account/commerce/inbox") return json(route, { ok: true, authority: "Admin Commerce D1", items: [], total: 3, unread: 3 });
    if (path === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (path === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    return json(route, { ok: false, error: "not_found" }, 404);
  });

  await page.goto(ORIGIN, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Master Admin 1 account menu" }).click();
  const messagesLink = page.getByRole("menuitem", { name: /Messages/ });
  await messagesLink.waitFor();
  assert.equal(await messagesLink.getAttribute("href"), "/account/messages");
  assert.equal(await messagesLink.locator(".account-menu__badge").innerText(), "3");
  const adminLink = page.getByRole("menuitem", { name: "Admin dashboard" });
  await adminLink.waitFor();
  assert.equal(await adminLink.getAttribute("target"), "_blank");
  assert.equal(await adminLink.getAttribute("rel"), "noopener noreferrer");
  assert.equal(await adminLink.locator("svg path").first().getAttribute("d"), "M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Z");
  assert.equal(await adminLink.evaluate((element) => getComputedStyle(element).fontSize), "16px");
  assert.equal(await page.locator(".account-menu__identity > div > span").evaluate((element) => getComputedStyle(element).fontSize), "9.92px");
  assert.equal(await page.locator(".account-menu__overview dt").first().evaluate((element) => getComputedStyle(element).fontSize), "8px");
  assert.ok(await page.locator(".account-menu").evaluate((element) => element.scrollWidth <= element.clientWidth));
  await page.screenshot({ path: join(tmpdir(), "thirdrailify-account-widget-1440x900.png") });
  assert.deepEqual(errors, []);
});

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(ORIGIN)).ok) return; } catch { /* server starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Account widget fixture server did not start.");
}
