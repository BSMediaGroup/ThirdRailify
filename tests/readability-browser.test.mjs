import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { browserFixture } from "./readability-fixtures.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ORIGIN = "http://127.0.0.1:44351";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

test("omitted account, delivery, product and Poll editor text retains readable component typography", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44351", "--strictPort"], { cwd: ROOT, stdio: "ignore" });
  t.after(() => server.kill());
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(ORIGIN)).ok) break; } catch { /* Local Vite startup. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());
  const account = browserFixture(ROOT, "account-v2-browser.test.mjs", ORIGIN);
  const polls = browserFixture(ROOT, "polls-browser.test.mjs", ORIGIN);
  for (const width of [1440, 390]) {
    const { context, page } = await account.fixturePage(browser, width, 900, true);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/commerce/products/*", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, source: "commerce-d1", product: account.catalogue().products[0] }) }));
    await page.route(/\/api\/polls(?:\/|\?|$)/, polls.respond);
    await page.goto(`${ORIGIN}/account/profile`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Profile & contact", exact: true }).waitFor();
    await fonts(page);
    await typography(page.locator(".account-form label > span").first(), 10, /Geist Mono/);
    assert.equal(await page.locator(".account-form input").first().evaluate((el) => getComputedStyle(el).fontSize), "13px", "input scale is preserved");
    assert.equal(await page.locator(".account-identity-strip h1").evaluate((el) => parseFloat(getComputedStyle(el).fontSize)), width === 1440 ? 72 : 46.8, "account heading scale is preserved");
    await page.goto(`${ORIGIN}/account/delivery`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Add address", exact: true }).click();
    const address = page.getByRole("dialog", { name: "Add a destination" });
    await address.waitFor();
    await typography(address.locator(".geography-field > label").first(), 10, /Geist Mono/);
    await page.getByRole("button", { name: "Close address editor" }).click();
    await page.goto(`${ORIGIN}/shop/signal-tee`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1, name: "Signal Tee" }).waitFor();
    await fonts(page);
    await typography(page.locator(".commerce-variant-selector label"), 10, /Geist Mono/);
    await typography(page.locator(".commerce-quantity label"), 10, /Geist Mono/);
    await page.goto(`${ORIGIN}/cart`, { waitUntil: "domcontentloaded" });
    await page.locator(".cart-page-row").waitFor();
    await typography(page.locator(".cart-page-row__total").getByText("Line total", { exact: true }), 10, /Geist Mono/);
    const disabled = page.locator(".cart-summary .button:disabled");
    assert.equal(await disabled.count(), 1);
    assert.equal(await disabled.evaluate((el) => getComputedStyle(el).opacity), "1", "disabled checkout copy is not dimmed twice");
    await page.goto(`${ORIGIN}/polls/new`, { waitUntil: "domcontentloaded" });
    await page.locator(".poll-editor-option__media > span").first().waitFor();
    await fonts(page);
    await typography(page.locator(".poll-editor-option__media > span").first(), 10, /monospace/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await context.close();
  }
});

async function fonts(page) { await page.evaluate(() => document.fonts.ready); }
async function typography(locator, size, family) {
  const result = await locator.evaluate((el) => {
    const style = getComputedStyle(el), box = el.getBoundingClientRect();
    return { size: parseFloat(style.fontSize), family: style.fontFamily, height: box.height, width: box.width, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  });
  assert.equal(result.size, size);
  assert.match(result.family, family);
  assert.ok(result.width > 0 && result.height >= size, "text has a visible line box");
  assert.ok(result.scrollHeight <= result.clientHeight + 1, "corrected text is not vertically clipped");
}
