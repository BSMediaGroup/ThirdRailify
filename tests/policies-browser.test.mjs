import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:44196";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROUTES = ["/policies", "/terms", "/privacy", "/refunds", "/accessibility"];
const VIEWPORTS = [[1440, 900], [768, 1024], [390, 844]];

test("policy library and documents are complete, deep-linked, semantic, and responsive", async (t) => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44196"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of VIEWPORTS) {
    for (const route of ROUTES) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
      await mockShellApis(page);
      await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded" });
      await page.locator("h1").waitFor();

      assert.equal(await page.locator("h1").count(), 1, `${route} has one H1 at ${width}x${height}`);
      assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true, `${route} has no horizontal overflow at ${width}x${height}`);
      assert.deepEqual(errors, [], `${route} has no browser or page-origin HTTP errors at ${width}x${height}`);
      if (["/terms", "/privacy", "/refunds"].includes(route)) {
        const renderedCopy = await page.locator("main").innerText();
        for (const phrase of ["Australian Consumer Law", "ACCC", "OAIC", "Australian Privacy Principles", "Privacy Act 1988", "ABN", "ACN"]) {
          assert.equal(renderedCopy.includes(phrase), false, `${route} omits ${phrase} at ${width}x${height}`);
        }
        assert.doesNotMatch(renderedCopy, /owned and operated by Shawn [A-Z][a-z]+/, `${route} does not append a surname at ${width}x${height}`);
        assert.doesNotMatch(renderedCopy, /Third Railify (?:is|operates as) (?:a )?(?:corporation|partnership|sole proprietorship)/i, `${route} invents no entity type at ${width}x${height}`);
        assert.doesNotMatch(renderedCopy, /Canadian (?:business |registration )?(?:number|no\.)\s*[:#]?\s*\d/i, `${route} invents no registration number at ${width}x${height}`);
        assert.doesNotMatch(renderedCopy, /must be (?:at least )?(?:13|16|18|19)\b/i, `${route} invents no age threshold at ${width}x${height}`);
        assert.doesNotMatch(renderedCopy, /our (?:EU|UK) representative/i, `${route} invents no representative at ${width}x${height}`);
        if (route === "/terms" || route === "/privacy") assert.match(renderedCopy, /owned and operated by Shawn from London, Ontario, Canada/, `${route} keeps the owner-safe operator location at ${width}x${height}`);
        if (route === "/terms") {
          assert.match(renderedCopy, /CAD is the authoritative storefront currency/);
          assert.match(renderedCopy, /approximate conversion for convenience/);
          assert.match(renderedCopy, /Normal public checkout is currently disabled/);
        }
      }

      const footerPolicyLinks = page.locator(".site-footer .footer-grid > div:last-child > a");
      assert.deepEqual(await footerPolicyLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))), ["/terms", "/privacy", "/refunds", "/accessibility"], `${route} footer keeps the four-item policy stack at ${width}x${height}`);
      assert.equal(await page.locator('.site-footer a[href="/policies"]').count(), 0, `${route} footer omits the policy-library link at ${width}x${height}`);
      assert.equal(await page.locator(".footer-bottom .footer-privacy-button").count(), 1, `${route} keeps privacy choices outside the policy stack at ${width}x${height}`);
      const footerBorder = await page.locator(".site-footer").evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return { width: style.borderTopWidth, style: style.borderTopStyle, color: style.borderTopColor };
      });
      assert.deepEqual(footerBorder, { width: "1px", style: "solid", color: "rgba(245, 240, 229, 0.1)" }, `${route} footer owns the global top divider at ${width}x${height}`);

      const headerBottom = await page.locator(".site-header").evaluate((element) => element.getBoundingClientRect().bottom);
      const h1Top = await page.locator("h1").evaluate((element) => element.getBoundingClientRect().top);
      assert.ok(h1Top >= headerBottom, `${route} heading is not clipped behind the global header at ${width}x${height}`);

      if (route === "/policies") {
        assert.equal(await page.locator(".policy-card[href]").count(), 4, "the register exposes four current policy routes");
        assert.equal(await page.locator(".policy-card--future").count(), 1, "future membership policy space remains truthful and non-interactive");
        assert.equal(await page.locator(".policy-card--future a, .policy-card--future button").count(), 0, "future policy space has no fake route");
        assert.deepEqual(await page.locator(".policy-card[href]").evaluateAll((cards) => cards.map((card) => card.getAttribute("href"))), ["/terms", "/privacy", "/refunds", "/accessibility"]);
      } else {
        assert.equal(await page.locator('.policy-breadcrumb a[href="/policies"]').count(), 1, `${route} keeps policy-library discovery on the document page`);
        assert.equal(await page.locator('.policy-document__footer a[href="/policies"]').count(), 1, `${route} keeps the all-policies action at the end of the document`);
        const sections = page.locator(".policy-section");
        const tocLinks = page.locator(".policy-toc a");
        assert.ok(await sections.count() >= 6, `${route} contains substantive policy sections`);
        assert.equal(await tocLinks.count(), await sections.count(), `${route} table of contents covers every policy section`);
        assert.equal(await page.locator('.policy-switcher a[aria-current="page"]').count(), 1, `${route} marks the current document`);
        assert.ok(await page.locator(".policy-section__body > p").first().evaluate((element) => Number.parseFloat(globalThis.getComputedStyle(element).fontSize)) >= 15, `${route} body copy remains readable`);
        for (const wrap of await page.locator(".policy-table-wrap").all()) {
          assert.ok(await wrap.evaluate((element) => element.scrollWidth >= element.clientWidth), `${route} tables remain within a bounded responsive region`);
        }
      }
      if (process.env.POLICY_BROWSER_SCREENSHOTS === "1" && ["/privacy", "/terms", "/refunds"].includes(route) && [1440, 390].includes(width)) {
        await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-${route.slice(1)}-${width}-PROOF.png`), fullPage: true });
      }
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  await mockShellApis(page);
  await page.goto(`${ORIGIN}/privacy#retention`);
  const retention = page.locator("#retention");
  await retention.waitFor();
  assert.equal(await retention.getByRole("heading", { level: 2, name: "How long we keep information" }).count(), 1);
  await page.waitForFunction(() => { const element = globalThis.document.getElementById("retention"); const top = element?.getBoundingClientRect().top ?? -1; return top >= 0 && top < globalThis.innerHeight; });
  assert.equal(await page.locator('.policy-toc a[href="#retention"]').count(), 1, "retention has a stable deep link");
  await page.locator('.policy-toc a[href="#your-rights"]').click();
  await page.waitForURL(/#your-rights$/);
  assert.equal(await page.locator("#your-rights").getByRole("heading", { level: 2, name: "Access, correction, and privacy rights" }).count(), 1);
  await context.close();

  const privacyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const privacyPage = await privacyContext.newPage();
  await mockShellApis(privacyPage);
  await privacyPage.goto(`${ORIGIN}/privacy#cookies-local-storage`);
  await privacyPage.getByRole("button", { name: "Open Privacy choices" }).click();
  const privacyDialog = privacyPage.getByRole("dialog", { name: "Privacy choices" });
  await privacyDialog.waitFor();
  assert.equal(await privacyDialog.isVisible(), true, "Privacy page opens the working consent manager");
  await privacyDialog.getByRole("button", { name: "Close privacy choices" }).click();
  assert.equal(await privacyPage.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth), true, "Privacy tables and consent UI do not overflow mobile");
  await privacyContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  await mockShellApis(reducedPage);
  await reducedPage.goto(`${ORIGIN}/policies`);
  assert.equal(await reducedPage.locator(".policy-card__signal").first().evaluate((element) => globalThis.getComputedStyle(element, "::after").animationName), "none", "reduced motion disables the decorative policy orbit");
  const privacyCard = reducedPage.getByRole("link", { name: /Privacy Policy/ });
  await privacyCard.focus();
  assert.equal(await privacyCard.evaluate((element) => element === globalThis.document.activeElement), true, "policy cards are keyboard focusable");
  await reducedPage.keyboard.press("Enter");
  await reducedPage.waitForURL(`${ORIGIN}/privacy`);
  assert.equal(await reducedPage.getByRole("heading", { level: 1, name: "Privacy Policy" }).count(), 1);
  await reducedContext.close();
});

async function mockShellApis(page) {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (path === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-28", rates: { CAD: 1, USD: .75 } });
    if (path === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], updatedAt: null });
    if (path === "/api/catalogue/banner") return json(route, { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: false, messages: [], mode: "static", speed: "normal" }, live: { enabled: false }, updatedAt: "2026-08-28T00:00:00.000Z" });
    if (path === "/api/watch") return json(route, { available: true, schema: "thirdrailify-broadcast-v1", generatedAt: "2026-08-28T00:00:00.000Z", retrievedAt: "2026-08-28T00:00:01.000Z", ageSeconds: 1, freshness: "fresh", liveNow: [], primary: null, latest: null, latestByPlatform: { youtube: null, rumble: null }, upcoming: null, providerStatus: { youtube: { state: "offline", checkedAt: "2026-08-28T00:00:00.000Z" }, rumble: { state: "offline", checkedAt: "2026-08-28T00:00:00.000Z" } } });
    return json(route, { error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite policy test server did not start.");
}
