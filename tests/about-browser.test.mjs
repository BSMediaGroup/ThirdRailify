import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";

const LIVE_ORIGIN = process.env.ABOUT_BROWSER_ORIGIN || "";
const ORIGIN = LIVE_ORIGIN || "http://127.0.0.1:44220";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = process.env.ABOUT_SCREENSHOT_DIR || path.join(tmpdir(), "thirdrailify-about-browser");
const VIEWPORTS = [[1920, 1080], [1440, 900], [1365, 768], [1024, 768], [768, 1024], [390, 844]];
const TEST_VIEWPORTS = LIVE_ORIGIN ? VIEWPORTS.filter(([width]) => width === 1440 || width === 390) : VIEWPORTS;
const SCREENSHOT_PREFIX = LIVE_ORIGIN ? "about-stable" : "about-local";
let browser;
let server;

before(async () => {
  await mkdir(RESULTS, { recursive: true });
  if (!LIVE_ORIGIN) {
    server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44220"], { stdio: "ignore" });
    await waitForServer();
  }
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});

after(async () => {
  await browser?.close();
  server?.kill();
});

test("About uses a dedicated route while other major routes stay available", async () => {
  const appSource = await readFile("src/App.tsx", "utf8");
  const routeShellSource = await readFile("src/pages/RouteShellPage.tsx", "utf8");
  assert.match(appSource, /path="\/about" element={<AboutPage\s*\/>}/);
  assert.doesNotMatch(appSource, /routeKey="about"/);
  assert.doesNotMatch(routeShellSource, /A proper story belongs here|AboutSignalMap|about-signal-map|\| "about"/);

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  await mockApis(page);
  const routes = new Map([
    ["/friends", /The regulars\.\s+Chaos has a guest list\./i], ["/vip", /THE INNER RAIL\s+IS BEING BUILT\./i],
    ["/gift-cards", "Gift cards need a real handoff."],
  ]);
  for (const [route, heading] of routes) {
    await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1, name: heading }).waitFor();
  }
  await context.close();
});

test("About presents the supplied story, formats, hosts, internal paths, and no migration or contact filler", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  const errors = collectPageErrors(page);
  await mockApis(page);
  const response = await page.goto(`${ORIGIN}/about`, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200);
  await page.evaluate(() => document.fonts.ready);

  const main = page.locator("#main-content");
  const text = await main.innerText();
  assert.equal(await main.locator("h1").count(), 1);
  assert.match(text, /WE GRABBED\s+THE RAIL\s+ANYWAY\./i);
  assert.match(text, /Canadian/i);
  assert.match(text, /Shawn · Canadian \/ Gina · American \(Massachusetts\)/i);
  assert.doesNotMatch(text, /Shawn \+ Gina · Canada/i);
  assert.match(text, /most nights around 10 PM Eastern/i);
  for (const required of ["Shawn", "Gina", "Aboot Nothing", "Pop Culture Beat Down", "News Hangout", "Grab the rail", "Don’t let go"]) assert.match(text, new RegExp(required, "i"));
  for (const heading of [/A bad idea\s+that refused\s+to die/i, /Two people\.\s+One derailment/i, /What happens\s+on the rail/i, /Chat has\s+the wheel/i]) {
    assert.equal(await main.getByRole("heading", { level: 2, name: heading }).count(), 1);
  }

  const countryLabel = main.locator(".about-hero__country");
  const canadianFlag = countryLabel.locator("img");
  assert.equal(await canadianFlag.count(), 1);
  assert.equal(await canadianFlag.getAttribute("alt"), "", "the flag remains decorative beside the readable CA label");
  assert.ok(await canadianFlag.evaluate((image) => image.complete && image.naturalWidth > 0), "the Canadian flag SVG loads");
  assert.ok(await countryLabel.evaluate((label) => Math.abs(label.querySelector("img").getBoundingClientRect().height - Number.parseFloat(getComputedStyle(label).fontSize)) <= 1), "the Canadian flag matches the CA label height");

  const hrefs = await main.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  for (const href of ["/watch", "/shawn", "/gina", "/community", "/goats", "/friends"]) assert.ok(hrefs.includes(href), `${href} is linked from the About story`);
  assert.ok(hrefs.includes("#origin"));
  assert.equal(hrefs.some((href) => /^https?:/i.test(href || "")), false, "About contains no external platform directory");
  assert.equal(await main.locator('a[href^="mailto:"]').count(), 0, "About does not duplicate footer contact addresses");
  assert.equal(await main.locator('[data-chat-message], .testimonial, [class*="testimonial"]').count(), 0);
  for (const [host, href] of [["shawn", "/shawn"], ["gina", "/gina"]]) {
    const card = main.locator(`a.host-panel--${host}[href="${href}"]`);
    assert.equal(await card.count(), 1, `${host}'s complete About card is the route link`);
    assert.equal(await card.locator("img").count(), 1, `${host}'s portrait is inside the route link`);
  }
  assert.doesNotMatch(text, /A proper story belongs here|Migration-stage route|current About page|generic Wix FAQ|Show history pending|Media and contact context pending|Review current About page|Back home|thirdrailify\.com\/about|@[a-z0-9_]+|\b(?:viewers|subscribers|testimonials?)\b/i);
  assert.deepEqual(errors, []);
  await context.close();
});

test("About remains composed, animated, complete, and overflow-free at every required viewport", async () => {
  for (const [width, height] of TEST_VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
    await addConsent(context);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    await mockApis(page);
    await page.goto(`${ORIGIN}/about`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    if (LIVE_ORIGIN) await page.waitForTimeout(1_800);

    const initialLayout = await heroLayout(page);
    await page.waitForTimeout(900);
    const settledLayout = await heroLayout(page);
    assert.ok(Math.abs(initialLayout.copyTop - settledLayout.copyTop) <= 1, `hero copy does not shift at ${width}px`);
    assert.ok(Math.abs(initialLayout.networkTop - settledLayout.networkTop) <= 1, `hero network does not shift at ${width}px`);
    assert.equal(settledLayout.overflow, false, `no horizontal overflow at ${width}x${height}: ${JSON.stringify(settledLayout.offenders)}`);
    assert.ok(settledLayout.h1Left >= -1 && settledLayout.h1Right <= width + 1, `headline fits at ${width}px`);
    assert.ok(settledLayout.h1Top >= settledLayout.headerBottom, `headline clears the shared header at ${width}px`);
    await page.locator(".about-hero.is-active").waitFor({ timeout: 8_000 });
    assert.equal(await page.locator(".about-hero .sparkling-sky__star").count(), 168, `About carries the complete Friends-density starfield at ${width}px`);
    assert.equal(await page.locator(".about-hero .sparkling-sky").getAttribute("data-star-layout"), "seeded-clustered", `About uses the irregular clustered sky at ${width}px`);
    const starScatter = await measureStarScatter(page.locator(".about-hero .sparkling-sky"));
    assert.ok(starScatter.emptyCells >= 1 && starScatter.denseCell >= 12 && starScatter.variance >= 12 && starScatter.closePairs >= 40, `About has natural gaps and constellations instead of uniform bands at ${width}px: ${JSON.stringify(starScatter)}`);
    assert.ok(starScatter.uniqueX >= 160 && starScatter.uniqueY >= 160, `About star coordinates do not repeat as rows or columns at ${width}px: ${JSON.stringify(starScatter)}`);
    assert.notEqual(await page.locator(".about-hero .sparkling-sky__star").first().evaluate((element) => getComputedStyle(element).animationName), "none", `About stars twinkle at ${width}px`);
    assert.equal(await page.locator(".about-hero .sparkling-sky__meteors i").count(), 3, `About carries all three Friends-style shooting stars at ${width}px`);
    assert.equal(await page.locator(".about-hero .sparkling-sky__meteors i").first().evaluate((element) => getComputedStyle(element).animationName), "sparkling-sky-meteor", `About shooting stars animate at ${width}px`);
    await page.locator(".about-network").scrollIntoViewIfNeeded();
    await page.locator(".about-network.is-active").waitFor({ timeout: 8_000 });
    const animatedNetworkTop = await page.locator(".about-network").evaluate((element) => element.getBoundingClientRect().top);
    await page.waitForTimeout(500);
    assert.ok(Math.abs(animatedNetworkTop - await page.locator(".about-network").evaluate((element) => element.getBoundingClientRect().top)) <= 1, `hero animation does not shift its visual at ${width}px`);
    assert.notEqual(await page.locator(".about-network__pulse").first().evaluate((element) => getComputedStyle(element).animationName), "none");
    const networkGeometry = await page.locator(".about-network").evaluate((network) => {
      const box = network.getBoundingClientRect();
      const centre = (selector) => { const node = network.querySelector(selector)?.getBoundingClientRect(); return node ? { x: node.left + node.width / 2 - box.left, y: node.top + node.height / 2 - box.top } : null; };
      return { width: box.width, height: box.height, core: centre(".about-network__core"), news: centre(".about-network__node--news"), culture: centre(".about-network__node--culture"), chaos: centre(".about-network__node--chaos"), chat: centre(".about-network__node--chat") };
    });
    assert.ok(networkGeometry.core && Math.abs(networkGeometry.core.x - networkGeometry.width / 2) <= 1 && Math.abs(networkGeometry.core.y - networkGeometry.height / 2) <= 1, `network core is geometrically centered at ${width}px: ${JSON.stringify(networkGeometry)}`);
    assert.ok(networkGeometry.news && networkGeometry.culture && networkGeometry.chaos && networkGeometry.chat, "all four network nodes expose geometry");
    assert.ok(Math.abs(networkGeometry.news.x + networkGeometry.culture.x - networkGeometry.width) <= 2 && Math.abs(networkGeometry.chat.x + networkGeometry.chaos.x - networkGeometry.width) <= 2, `network nodes are horizontally symmetric at ${width}px`);
    assert.ok(Math.abs(networkGeometry.news.y + networkGeometry.chat.y - networkGeometry.height) <= 2 && Math.abs(networkGeometry.culture.y + networkGeometry.chaos.y - networkGeometry.height) <= 2, `network nodes are vertically symmetric at ${width}px`);

    await page.locator(".about-hosts").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll(".host-panel img")].every((image) => image.complete), null, { timeout: 15_000 });
    await page.locator(".about-formats").scrollIntoViewIfNeeded();
    await page.locator(".about-formats.is-active").waitFor({ timeout: 8_000 });
    assert.equal(await page.locator(".format-card").count(), 4);
    assert.equal(await page.locator(".format-bracket__tree-live").count(), 3);
    assert.notEqual(await page.locator(".format-bracket__champion").evaluate((element) => getComputedStyle(element).animationName), "none");
    assert.notEqual(await page.locator(".format-impact__rings").evaluate((element) => getComputedStyle(element).animationName), "none");
    assert.notEqual(await page.locator(".format-news-track__packet").evaluate((element) => getComputedStyle(element).animationName), "none");
    const diagramGeometry = await page.evaluate(() => {
      const bracket = document.querySelector(".format-bracket__diagram");
      const entrant = document.querySelector(".format-bracket__entrants rect").getBoundingClientRect();
      const route = document.querySelector(".format-bracket__routes path");
      const routeStart = new DOMPoint(route.getPointAtLength(0).x, route.getPointAtLength(0).y).matrixTransform(route.getScreenCTM());
      const championRing = document.querySelector(".format-bracket__champion circle").getBoundingClientRect();
      const championText = document.querySelector(".format-bracket__champion text").getBoundingClientRect();
      const impact = document.querySelector(".format-impact__diagram").getBoundingClientRect();
      const impactCore = document.querySelector(".format-impact__core rect").getBoundingClientRect();
      return {
        entrantJoinX: entrant.right,
        entrantJoinY: entrant.top + entrant.height / 2,
        routeStart: { x: routeStart.x, y: routeStart.y },
        championDelta: Math.abs((championRing.left + championRing.width / 2) - (championText.left + championText.width / 2)),
        impactDelta: Math.abs((impact.left + impact.width / 2) - (impactCore.left + impactCore.width / 2)),
        bracketOverflow: bracket.getBoundingClientRect().left < document.querySelector(".format-bracket").getBoundingClientRect().left - 1,
      };
    });
    assert.ok(Math.abs(diagramGeometry.entrantJoinX - diagramGeometry.routeStart.x) <= 1.5 && Math.abs(diagramGeometry.entrantJoinY - diagramGeometry.routeStart.y) <= 1.5, `bracket entrant and route share one coordinate system at ${width}px: ${JSON.stringify(diagramGeometry)}`);
    assert.ok(diagramGeometry.championDelta <= 1.5, `bracket champion glyph is centered at ${width}px: ${JSON.stringify(diagramGeometry)}`);
    assert.ok(diagramGeometry.impactDelta <= 1.5, `beatdown typography and linework share the same center at ${width}px: ${JSON.stringify(diagramGeometry)}`);
    assert.equal(diagramGeometry.bracketOverflow, false, `bracket diagram remains inside its instrument at ${width}px`);
    await page.locator(".about-community").scrollIntoViewIfNeeded();
    await page.locator(".about-community.is-active").waitFor({ timeout: 8_000 });
    assert.notEqual(await page.locator(".community-circuit__scope i").first().evaluate((element) => getComputedStyle(element).animationName), "none");
    assert.equal(await page.locator(".community-circuit__paths .community-circuit__path").count(), 4);
    assert.notEqual(await page.locator(".community-circuit__packet").first().evaluate((element) => getComputedStyle(element).animationName), "none");
    await page.locator(".about-manifesto").scrollIntoViewIfNeeded();
    await page.locator(".about-manifesto.is-active").waitFor({ timeout: 8_000 });
    assert.equal(await page.locator(".about-manifesto .editorial-signal--about.editorial-signal--closing").count(), 1);
    assert.notEqual(await page.locator(".about-manifesto .editorial-signal__aperture i").first().evaluate((element) => getComputedStyle(element).animationName), "none");

    const brokenImages = await page.locator("main img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src")));
    assert.deepEqual(brokenImages, []);
    assert.equal(await page.locator(".host-panel").count(), 2);
    assert.ok(await page.locator(".format-card__copy p").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize) >= 14));
    if (width === 390) {
      assert.ok(await page.locator('.about-manifesto a[href="/watch"]').evaluate((element) => element.getBoundingClientRect().height >= 44));
      assert.ok(await page.locator('.about-manifesto a[href="/friends"]').evaluate((element) => element.getBoundingClientRect().height >= 44));
    }
    if (process.env.ABOUT_SCREENSHOTS === "1" && (width === 1440 || width === 390)) {
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
      await page.waitForFunction(() => window.scrollY === 0);
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(RESULTS, `${SCREENSHOT_PREFIX}-${width}-hero.png`) });
      await page.screenshot({ path: path.join(RESULTS, `${SCREENSHOT_PREFIX}-${width}x${height}.png`), fullPage: true });
      if (width === 390 || width === 1440) {
        for (const [selector, name] of [[".about-hosts", "hosts"], [".about-formats", "formats"], [".about-community", "community"], [".about-manifesto", "manifesto"]]) {
          await page.locator(selector).screenshot({ path: path.join(RESULTS, `${SCREENSHOT_PREFIX}-${width}-${name}.png`) });
        }
        await page.locator(".about-origin").screenshot({ path: path.join(RESULTS, `${SCREENSHOT_PREFIX}-${width}-origin.png`) });
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test("reduced motion keeps the complete About story while disabling nonessential movement", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  await mockApis(page);
  await page.goto(`${ORIGIN}/about`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".about-hero").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".about-network").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".about-formats").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".about-community").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".about-manifesto").getAttribute("data-motion"), "static");
  for (const selector of [".about-hero .sparkling-sky__star", ".about-network__pulse", ".format-bracket__champion", ".format-news-track__packet", ".community-circuit__scope i", ".community-circuit__packet", ".about-manifesto .editorial-signal__aperture i"]) {
    assert.equal(await page.locator(selector).first().evaluate((element) => getComputedStyle(element).animationName), "none", `${selector} is static in reduced motion`);
  }
  assert.equal(await page.getByRole("heading", { level: 2, name: /Grab the rail\.\s+Don’t let go\./i }).count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await context.close();
});

test("About and Home make each complete host card, including its portrait, the route link", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  await mockApis(page);
  for (const [route, cardClass] of [["/about", "host-panel"], ["/", "host-card"]]) {
    await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded" });
    for (const host of ["shawn", "gina"]) {
      const card = page.locator(`a.${cardClass}--${host}[href="/${host}"]`);
      assert.equal(await card.count(), 1, `${host}'s ${route} card is one semantic link`);
      assert.equal(await card.locator("img").count(), 1, `${host}'s ${route} portrait is clickable`);
      assert.ok(await card.evaluate((element) => element.getBoundingClientRect().height >= 300), `${host}'s ${route} link covers the full card`);
    }
  }
  await page.locator('a.host-card--shawn[href="/shawn"] img').click();
  await page.waitForURL(`${ORIGIN}/shawn`);
  await context.close();
});

test("stable representative Public routes keep their headings, width, and page-origin console clean", { skip: !LIVE_ORIGIN }, async () => {
  const routes = new Map([["/", /News\.\s+Culture\.\s+Chaos\./i], ["/watch", /(?:Stay on the signal|The rail is live)\./i], ["/shop", /Wear the lore\./i], ["/goats", /GOATS in the wild/i], ["/shawn", /Shawn\.\s+Every tab is open\./i], ["/gina", /Gina\.\s+The rabbit hole has company\./i]]);
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
    await addConsent(context);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    for (const [route, heading] of routes) {
      const response = await page.goto(`${ORIGIN}${route}`, { waitUntil: "domcontentloaded" });
      assert.equal(response?.status(), 200, `${route} returns HTTP 200 at ${width}px`);
      await page.getByRole("heading", { level: 1, name: heading }).waitFor({ timeout: 15_000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${route} has no horizontal overflow at ${width}px`);
    }
    assert.deepEqual(errors, [], `representative page-origin console remains clean at ${width}px`);
    await context.close();
  }
});

function collectPageErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === ORIGIN && response.status() >= 400) errors.push(`${response.status()} ${url.pathname}`);
  });
  return errors;
}

async function addConsent(context) {
  await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
}

async function mockApis(page) {
  if (LIVE_ORIGIN) return;
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/analytics") return json(route, { ok: true, accepted: true });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-29T00:00:00.000Z", collections: [], products: [] });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }

async function heroLayout(page) {
  return page.evaluate(() => {
    const copy = document.querySelector(".about-hero__copy").getBoundingClientRect();
    const network = document.querySelector(".about-network").getBoundingClientRect();
    const h1 = document.querySelector(".about-hero h1").getBoundingClientRect();
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      copyTop: copy.top,
      networkTop: network.top,
      h1Left: h1.left,
      h1Right: h1.right,
      h1Top: h1.top,
      headerBottom: header.bottom,
      overflow: document.documentElement.scrollWidth > viewportWidth,
      offenders: [...document.querySelectorAll("#main-content *")].map((element) => {
        const rect = element.getBoundingClientRect();
        return { selector: element.className || element.tagName, left: Math.round(rect.left), right: Math.round(rect.right) };
      }).filter((entry) => entry.left < -1 || entry.right > viewportWidth + 1).slice(0, 8),
    };
  });
}

async function measureStarScatter(sky) {
  return sky.evaluate((element) => {
    const stars = [...element.querySelectorAll(".sparkling-sky__star")].map((star) => ({
      x: Number.parseFloat(star.style.getPropertyValue("--sky-x")),
      y: Number.parseFloat(star.style.getPropertyValue("--sky-y")),
    }));
    const cells = Array(32).fill(0);
    for (const star of stars) cells[Math.min(3, Math.floor(star.y / 25)) * 8 + Math.min(7, Math.floor(star.x / 12.5))] += 1;
    let closePairs = 0;
    for (let first = 0; first < stars.length; first += 1) {
      for (let second = first + 1; second < stars.length; second += 1) {
        if (Math.hypot(stars[first].x - stars[second].x, stars[first].y - stars[second].y) < 2.2) closePairs += 1;
      }
    }
    const mean = stars.length / cells.length;
    return {
      emptyCells: cells.filter((count) => count === 0).length,
      denseCell: Math.max(...cells),
      variance: cells.reduce((total, count) => total + (count - mean) ** 2, 0) / cells.length,
      closePairs,
      uniqueX: new Set(stars.map((star) => star.x)).size,
      uniqueY: new Set(stars.map((star) => star.y)).size,
    };
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite About browser test server did not start.");
}
