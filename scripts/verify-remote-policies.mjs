import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const POLICY_ROUTES = ["/privacy", "/terms", "/refunds", "/policies"];
const VIEWPORTS = [[1440, 900], [390, 844]];
const PROHIBITED = ["Australian Consumer Law", "ACCC", "OAIC", "Australian Privacy Principles", "Privacy Act 1988", "ABN", "ACN"];
const origins = process.argv.slice(2).map((value) => new URL(value).origin);

assert.ok(origins.length > 0, "Pass at least one deployed origin.");
for (const origin of origins) assert.match(origin, /^https:\/\/[a-z0-9.-]+\.pages\.dev$/i, `Unexpected origin ${origin}`);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const evidence = [];
try {
  for (const origin of origins) {
    for (const [width, height] of VIEWPORTS) {
      for (const route of POLICY_ROUTES) {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        const errors = [];
        const requireConsoleClean = new URL(origin).hostname === "thirdrailify.pages.dev";
        page.on("console", (message) => { if (requireConsoleClean && message.type() === "error") errors.push(`console: ${message.text()}`); });
        page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
        page.on("response", (response) => {
          if (response.url().startsWith(origin) && response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
        });

        const response = await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        assert.equal(response?.status(), 200, `${origin}${route} returns 200`);
        await page.locator("h1").waitFor();
        assert.equal(await page.locator("h1").count(), 1, `${route} has one H1 at ${width}x${height}`);
        assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true, `${route} has no overflow at ${width}x${height}`);

        const copy = await page.locator("main").innerText();
        for (const phrase of PROHIBITED) assert.equal(copy.includes(phrase), false, `${route} omits ${phrase}`);
        if (["/terms", "/privacy"].includes(route)) {
          assert.ok(copy.includes("owned and operated by Shawn from London, Ontario, Canada"), `${route} identifies the confirmed owner and Ontario base`);
          assert.doesNotMatch(copy, /owned and operated by Shawn [A-Z][a-z]+/, `${route} does not publish a surname`);
        }

        const dock = page.locator(".privacy-dock");
        if (await dock.isVisible()) {
          const bounds = await dock.boundingBox();
          const h1Bounds = await page.locator("h1").boundingBox();
          assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= height + 1, `${route} consent dock stays in viewport`);
          assert.ok(bounds && h1Bounds && bounds.y >= h1Bounds.y + h1Bounds.height, `${route} consent dock does not cover the heading`);
          await dock.getByRole("button", { name: "Reject non-essential" }).click();
          await dock.waitFor({ state: "hidden" });
        }

        const footerLinks = await page.locator(".site-footer a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
        for (const href of ["/terms", "/privacy", "/refunds", "/accessibility"]) assert.ok(footerLinks.includes(href), `${route} footer includes ${href}`);

        if (route !== "/policies") {
          const tocLink = page.locator(".policy-toc a").first();
          assert.ok(await tocLink.count(), `${route} has a table of contents`);
          const href = await tocLink.getAttribute("href");
          await tocLink.click();
          await page.waitForURL(new RegExp(`${href?.replace("#", "#")}$`));
        }
        if (route === "/privacy") {
          await page.getByRole("button", { name: "Open Privacy choices" }).click();
          const dialog = page.getByRole("dialog", { name: "Privacy choices" });
          await dialog.waitFor();
          await dialog.getByRole("button", { name: "Close privacy choices" }).click();
        }

        const host = new URL(origin).hostname.split(".")[0];
        const screenshot = path.join(os.tmpdir(), `thirdrailify-${host}-${route.slice(1)}-${width}-PROOF.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        assert.deepEqual(errors, [], `${origin}${route} has no same-origin HTTP or page errors${requireConsoleClean ? ", and stable origin has no console errors" : ""}`);
        evidence.push({ origin, route, viewport: `${width}x${height}`, status: response?.status(), screenshot, consoleMode: requireConsoleClean ? "strict" : "immutable-auth-cors-exempt" });
        await context.close();
      }
    }
  }

  for (const origin of origins) {
    for (const apiPath of ["/api/commerce/catalogue", "/api/watch", "/api/goats/config"]) {
      const response = await fetch(`${origin}${apiPath}`, { headers: { Accept: "application/json" } });
      assert.equal(response.status, 200, `${origin}${apiPath} returns 200`);
      const body = await response.json();
      assert.equal(typeof body, "object", `${origin}${apiPath} returns JSON`);
      evidence.push({ origin, route: apiPath, status: response.status });
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    for (const route of ["/shop", "/watch", "/goats"]) {
      const response = await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      assert.equal(response?.status(), 200, `${origin}${route} returns 200`);
      await page.locator("h1").waitFor();
      assert.equal(await page.locator("h1").count(), 1, `${origin}${route} renders one H1`);
      assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true, `${origin}${route} has no overflow`);
      evidence.push({ origin, route, status: response?.status(), regression: true });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: true, checks: evidence.length, evidence }, null, 2));
