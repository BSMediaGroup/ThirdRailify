import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";

const LIVE_ORIGIN = process.env.HOST_BROWSER_ORIGIN || "";
const ORIGIN = LIVE_ORIGIN || "http://127.0.0.1:44222";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = process.env.HOST_SCREENSHOT_DIR || path.join(tmpdir(), "thirdrailify-hosts-browser");
const VIEWPORTS = [[1920, 1080], [1440, 900], [1365, 768], [1024, 768], [768, 1024], [390, 844]];
const TEST_VIEWPORTS = LIVE_ORIGIN ? VIEWPORTS.filter(([width]) => width === 1440 || width === 390) : VIEWPORTS;
const SCREENSHOT_PREFIX = LIVE_ORIGIN ? "hosts-stable" : "hosts-local";
const HOSTS = {
  shawn: {
    heading: /Shawn\.\s+Every tab is open\./i,
    required: ["Third Railify host", "@ThirdRailify", "Canadian", "News", "Crime", "Pop culture", "ADHD", "most nights around 10 PM Eastern", "The detour"],
    identity: /CA\s+Canadian · unfiltered/i,
    flagPath: /\/assets\/flags\/ca\.svg$/,
    topicAnimation: ".host-topic-instrument__probe",
    partnerHref: "/gina",
    partnerName: /Meet Gina/i,
  },
  gina: {
    heading: /Gina\.\s+The rabbit hole has company\./i,
    required: ["Third Railify co-host", "@JustGina", "American", "Massachusetts", "Mysteries", "conspiracies", "Culture", "Sass + humour", "Just Gina", "most nights around 10 PM Eastern"],
    identity: /US\s+American · Massachusetts/i,
    flagPath: /\/assets\/flags\/us\.svg$/,
    topicAnimation: ".host-topic-instrument__probe",
    partnerHref: "/shawn",
    partnerName: /Meet Shawn/i,
  },
};

let browser;
let server;

before(async () => {
  await mkdir(RESULTS, { recursive: true });
  if (!LIVE_ORIGIN) {
    server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44222"], { stdio: "ignore" });
    await waitForServer();
  }
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});

after(async () => {
  await browser?.close();
  server?.kill();
});

test("Shawn and Gina use dedicated host routes with no remaining shell branches", async () => {
  const appSource = await readFile("src/App.tsx", "utf8");
  const hostSource = await readFile("src/pages/HostPage.tsx", "utf8");
  const routeShellSource = await readFile("src/pages/RouteShellPage.tsx", "utf8");
  const cssSource = await readFile("src/styles/global.css", "utf8");

  assert.match(appSource, /path="\/shawn" element={<HostPage hostKey="shawn"\s*\/>}/);
  assert.match(appSource, /path="\/gina" element={<HostPage hostKey="gina"\s*\/>}/);
  assert.doesNotMatch(appSource, /routeKey="(?:shawn|gina)"/);
  assert.doesNotMatch(routeShellSource, /(?:type RouteKey[^;]*(?:shawn|gina)|\b(?:shawn|gina):\s*\{|route-hero--gina|assets\/people)/i);
  assert.doesNotMatch(cssSource, /\.route-hero--gina|\.route-card\s*>\s*img/);
  assert.match(hostSource, /host-story--\$\{profile\.key\}/);
});

test("both host stories preserve verified facts, internal paths, and editorial boundaries", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  await mockApis(page);

  for (const [host, profile] of Object.entries(HOSTS)) {
    const errors = collectPageErrors(page);
    const response = await page.goto(`${ORIGIN}/${host}`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const main = page.locator("#main-content");
    const text = await main.innerText();
    assert.equal(await main.locator("h1").count(), 1, `${host} has one H1`);
    assert.equal(await main.getByRole("heading", { level: 1, name: profile.heading }).count(), 1);
    for (const required of profile.required) assert.match(text, new RegExp(escapeRegExp(required), "i"), `${host} contains ${required}`);
    assert.match(await main.locator(".host-profile-hero__facts > span").nth(1).innerText(), profile.identity, `${host} has the correct national identity and location`);
    const countryLabel = main.locator(".host-profile-hero__country");
    const countryFlag = countryLabel.locator("img");
    assert.equal(await countryFlag.count(), 1, `${host} has one country flag`);
    assert.equal(await countryFlag.getAttribute("alt"), "", `${host} flag remains decorative beside the readable country code`);
    assert.match(new URL(await countryFlag.getAttribute("src"), ORIGIN).pathname, profile.flagPath, `${host} uses the correct country SVG`);
    assert.ok(await countryFlag.evaluate((image) => image.complete && image.naturalWidth > 0), `${host} country flag SVG loads`);
    assert.ok(await countryLabel.evaluate((label) => Math.abs(label.querySelector("img").getBoundingClientRect().height - Number.parseFloat(getComputedStyle(label).fontSize)) <= 1), `${host} country flag matches its country-code height`);
    if (host === "gina") assert.doesNotMatch(text, /\bCanadian\b/i, "Gina is not described as Canadian");
    for (const heading of [/What enters\s+the conversation\./i, host === "shawn" ? /No live wire runs solo\./i : /The other chair talks back\./i]) {
      assert.equal(await main.getByRole("heading", { level: 2, name: heading }).count(), 1, `${host} contains its story landmark`);
    }
    const hrefs = await main.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    for (const href of ["/watch", "/about", "/community", profile.partnerHref]) assert.ok(hrefs.includes(href), `${host} links ${href}`);
    assert.equal(await main.getByRole("link", { name: profile.partnerName }).count(), 1);
    assert.equal(hrefs.some((href) => /^https?:/i.test(href || "")), false, `${host} contains no external platform directory`);
    assert.equal(await main.locator('a[href^="mailto:"]').count(), 0, `${host} does not duplicate contact`);
    assert.equal(await main.locator('[data-chat-message], .testimonial, [class*="testimonial"]').count(), 0);
    assert.doesNotMatch(text, /Migration-stage route|current (?:Shawn|Gina) page|Back home|complete host archive|intermittently unreadable|thirdrailify\.com\/(?:shawn|gina)|\b(?:viewers|subscribers|testimonials?)\b/i);
    assert.deepEqual(errors, [], `${host} page-origin console is clean`);
  }
  await context.close();
});

test("both host stories stay composed, animated, and overflow-free at every required viewport", async () => {
  for (const [host, profile] of Object.entries(HOSTS)) {
    for (const [width, height] of TEST_VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
      await addConsent(context);
      const page = await context.newPage();
      const errors = collectPageErrors(page);
      await mockApis(page);
      await page.goto(`${ORIGIN}/${host}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      if (LIVE_ORIGIN) await page.waitForTimeout(1_800);

      await page.locator(".host-portrait-stage.is-active").waitFor({ timeout: 8_000 });
      await page.locator(".host-profile-hero.is-active").waitFor({ timeout: 8_000 });
      assert.equal(await page.locator(`.editorial-signal--${host}.editorial-signal--hero`).count(), 1, `${host} has its own hero signal field`);
      assert.notEqual(await page.locator(".host-profile-hero .editorial-signal__trace-live").evaluate((element) => getComputedStyle(element).animationName), "none", `${host} hero trace animates while visible`);
      const initialLayout = await heroLayout(page);
      await page.waitForTimeout(900);
      const settledLayout = await heroLayout(page);
      assert.ok(Math.abs(initialLayout.copyTop - settledLayout.copyTop) <= 1, `${host} hero copy does not shift at ${width}px`);
      assert.ok(Math.abs(initialLayout.stageTop - settledLayout.stageTop) <= 1, `${host} portrait stage does not shift at ${width}px`);
      assert.equal(settledLayout.overflow, false, `${host} has no horizontal overflow at ${width}x${height}: ${JSON.stringify(settledLayout.offenders)}`);
      assert.ok(settledLayout.h1Left >= -1 && settledLayout.h1Right <= width + 1, `${host} headline fits at ${width}px`);
      assert.ok(settledLayout.h1Top >= settledLayout.headerBottom, `${host} headline clears the shared header at ${width}px`);
      assert.ok(settledLayout.stageWidth > Math.min(280, width * .6), `${host} hero visual stays legible at ${width}px`);
      assert.ok(settledLayout.coreCenterX < settledLayout.stageLeft + settledLayout.stageWidth * .25, `${host} zap stays in the portrait's left corner at ${width}px`);
      assert.ok(settledLayout.coreCenterY < settledLayout.stageTop + settledLayout.stageHeight * .25, `${host} zap stays above the face area at ${width}px`);
      assert.notEqual(await page.locator(".host-portrait-stage__scope i").first().evaluate((element) => getComputedStyle(element).animationName), "none");

      await page.locator(".host-topics").scrollIntoViewIfNeeded();
      await page.locator(".host-topics.is-active").waitFor({ timeout: 8_000 });
      assert.equal(await page.locator(".host-topic-card").count(), 4);
      assert.equal(await page.locator(".host-topic-instrument > svg").count(), 4, `${host} renders four scalable diagram canvases`);
      assert.equal(await page.locator(".host-topic-instrument__chrome").count(), 4, `${host} renders four aligned instrument readouts`);
      assert.equal(await page.locator(".host-topic-instrument > svg").evaluateAll((elements) => elements.every((element) => Boolean(element.getAttribute("viewBox")))), true, `${host} diagrams retain responsive viewBoxes`);
      assert.notEqual(await page.locator(".host-topic-instrument .topic-trace").first().evaluate((element) => getComputedStyle(element).animationName), "none", `${host} diagram traces draw only after the topic section enters view`);
      assert.notEqual(await page.locator(profile.topicAnimation).first().evaluate((element) => getComputedStyle(element).animationName), "none", `${host} topic motion activates`);
      assert.equal(await page.locator(".host-topic-instrument").evaluateAll((elements) => elements.every((element) => {
        const box = element.getBoundingClientRect();
        const svg = element.querySelector(":scope > svg").getBoundingClientRect();
        return Math.abs(svg.left - box.left) <= 1 && Math.abs(svg.right - box.right) <= 1 && Math.abs(svg.top - box.top) <= 1 && Math.abs(svg.bottom - box.bottom) <= 1;
      })), true, `${host} keeps all four diagrams registered to their card canvases`);
      await page.locator(".host-partnership").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll(".host-partnership img")].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 15_000 });
      await page.locator(".host-closing").scrollIntoViewIfNeeded();
      await page.locator(".host-closing.is-active").waitFor({ timeout: 8_000 });
      assert.notEqual(await page.locator(".host-closing .editorial-signal__trace-live").evaluate((element) => getComputedStyle(element).animationName), "none", `${host} closing signal field animates while visible`);
      assert.notEqual(await page.locator(".host-closing .editorial-signal__aperture i").first().evaluate((element) => getComputedStyle(element).animationName), "none", `${host} closing aperture animates while visible`);
      const brokenImages = await page.locator("main img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src")));
      assert.deepEqual(brokenImages, []);
      assert.ok(await page.locator(".host-topic-card__copy p").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize) >= 14));
      if (width === 390) assert.ok(await page.locator('.host-closing a[href="/watch"]').evaluate((element) => element.getBoundingClientRect().height >= 44));

      if (process.env.HOST_SCREENSHOTS === "1" && (width === 1440 || width === 390)) {
        await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
        await page.waitForFunction(() => window.scrollY === 0);
        await page.waitForTimeout(100);
        await page.screenshot({ path: path.join(RESULTS, `${SCREENSHOT_PREFIX}-${host}-${width}-hero.png`) });
        await page.screenshot({ path: path.join(RESULTS, `${SCREENSHOT_PREFIX}-${host}-${width}x${height}.png`), fullPage: true });
        if (width === 390) {
          await page.addStyleTag({ content: ".skip-link{display:none!important}.site-header{position:relative!important}" });
          for (const [selector, name] of [[".host-voice", "voice"], [".host-topics", "topics"], [".host-partnership", "partnership"], [".host-closing", "closing"]]) {
            await page.locator(selector).screenshot({ path: path.join(RESULTS, `${SCREENSHOT_PREFIX}-${host}-${width}-${name}.png`) });
          }
        }
      }
      assert.deepEqual(errors, [], `${host} page-origin console remains clean at ${width}px`);
      await context.close();
    }
  }
});

test("reduced motion keeps both host stories complete while disabling nonessential movement", async () => {
  for (const [host, profile] of Object.entries(HOSTS)) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await addConsent(context);
    const page = await context.newPage();
    await mockApis(page);
    await page.goto(`${ORIGIN}/${host}`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator(".host-portrait-stage").getAttribute("data-motion"), "static");
    assert.equal(await page.locator(".host-profile-hero").getAttribute("data-motion"), "static");
    assert.equal(await page.locator(".host-topics").getAttribute("data-motion"), "static");
    assert.equal(await page.locator(".host-closing").getAttribute("data-motion"), "static");
    for (const selector of [".host-portrait-stage__scope i", profile.topicAnimation, ".host-closing .editorial-signal__aperture i"]) {
      assert.equal(await page.locator(selector).first().evaluate((element) => getComputedStyle(element).animationName), "none", `${host} ${selector} is static`);
    }
    assert.equal(await page.locator(".host-profile-hero .editorial-signal__trace-live").evaluate((element) => getComputedStyle(element).animationName), "none");
    assert.equal(await page.locator(".host-topic-card").count(), 4);
    assert.equal(await page.getByRole("heading", { level: 1, name: profile.heading }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await context.close();
  }
});

test("stable representative Public routes keep their headings, width, and page-origin console clean", { skip: !LIVE_ORIGIN }, async () => {
  const routes = new Map([["/about", /We grabbed\s+the rail\s+anyway\./i], ["/watch", /(?:Stay on the signal|The rail is live)\./i], ["/shop", /Wear the lore\./i], ["/goats", /GOATS in the wild/i], ["/friends", /The regulars\.\s+Chaos has a guest list\./i], ["/shawn", HOSTS.shawn.heading], ["/gina", HOSTS.gina.heading]]);
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
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/analytics") return route.fulfill({ status: 204 });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-29T00:00:00.000Z", collections: [], products: [] });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

async function heroLayout(page) {
  return page.evaluate(() => {
    const copy = document.querySelector(".host-profile-hero__copy").getBoundingClientRect();
    const stage = document.querySelector(".host-portrait-stage").getBoundingClientRect();
    const core = document.querySelector(".host-portrait-stage__core").getBoundingClientRect();
    const h1 = document.querySelector(".host-profile-hero h1").getBoundingClientRect();
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      copyTop: copy.top,
      stageTop: stage.top,
      stageLeft: stage.left,
      stageWidth: stage.width,
      stageHeight: stage.height,
      coreCenterX: core.left + core.width / 2,
      coreCenterY: core.top + core.height / 2,
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

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite host browser test server did not start.");
}
