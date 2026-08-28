import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.GOATS_SUBMIT_ORIGIN || "";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("deployed GOATS submission location and product controls work responsively", { skip: !ORIGIN }, async (t) => {
  const catalogue = await fetch(`${ORIGIN}/api/goats/products`).then((response) => response.json());
  const product = catalogue.products.find((item) => item.image) || catalogue.products[0]; assert.ok(product);
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true }); t.after(() => browser.close());
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport }); const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${ORIGIN}/goats/submit`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Public display name").fill("Live UI Check"); await page.getByLabel("Private email").fill("acceptance@example.test");
    await page.getByLabel("Main image *").setInputFiles({ name: "goat.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    await page.getByRole("button", { name: "Continue" }).click(); await page.getByLabel("Country").selectOption("AU"); await page.getByLabel("City or location").fill("10 Martin Place Sydney");
    const option = page.getByRole("option").filter({ hasText: "Sydney" }).first(); await option.waitFor({ timeout: 12_000 }); await option.getByRole("button").click();
    assert.equal(await page.getByLabel("City or location").inputValue(), "Sydney"); assert.equal(await page.getByLabel("State / region Optional").inputValue(), "New South Wales"); assert.equal(await page.locator('.goat-location-combobox [role="option"]').count(), 0);
    await page.getByLabel("Owned product").selectOption(product.id); const preview = page.getByLabel(`Selected product: ${product.name}`); await preview.waitFor(); assert.equal(await preview.locator("img").count(), product.image ? 1 : 0);
    await page.getByRole("button", { name: "Continue" }).click(); await page.getByLabel("Story / review").fill("A live responsive acceptance story for the improved GOATS submission controls."); await page.getByLabel("4 stars").check(); assert.equal(await page.locator(".goat-stars label.is-filled").count(), 4);
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true); assert.deepEqual(errors, []); await page.close();
  }
});
