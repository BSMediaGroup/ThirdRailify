import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";

const LIVE_ORIGIN = process.env.FRIENDS_BROWSER_ORIGIN || "";
const ORIGIN = LIVE_ORIGIN || "http://127.0.0.1:44225";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = process.env.FRIENDS_SCREENSHOT_DIR || path.join(tmpdir(), "thirdrailify-friends-browser");
const VIEWPORTS = [[1920, 1080], [1440, 900], [1365, 768], [1024, 768], [768, 1024], [390, 844]];
const TEST_VIEWPORTS = LIVE_ORIGIN ? VIEWPORTS.filter(([width]) => width === 1440 || width === 390) : VIEWPORTS;
const PREFIX = LIVE_ORIGIN ? "friends-stable" : "friends-local";

const PROFILES = [
  { name: "Daniel Clancy", nickname: "CUNT", location: "Sydney, Australia", flagPath: /\/assets\/flags\/au\.svg$/, flagLabel: "Australia", trigger: /Open Daniel Clancy profile/i, required: ["Most News Hangouts", "builds and runs the website", "Very capable. Very silly."], links: ["https://rumble.com/danielclancy", "https://youtube.com/@danielclancy", "https://x.com/danielclancy"] },
  { name: "Darnell Quiggley", nickname: "SQUIGGLE", location: "New Orleans, Louisiana", flagPath: /\/assets\/flags\/us\.svg$/, flagLabel: "United States", trigger: /Open Darnell Quiggley profile/i, required: ["Pop Culture Beat Downs", "ex-cop turned actor", "straight edge"], links: ["https://rumble.com/lightscameracitation", "https://x.com/darnellquiggly"] },
  { name: "Simple Davy", nickname: "BAWLZ", location: "Kansas City, Missouri", flagPath: /\/assets\/flags\/us\.svg$/, flagLabel: "United States", trigger: /Open Simple Davy profile/i, required: ["Most News Hangouts", "diabolical sense of humour", "tweets that feel less like messages and more like evidence"], links: ["https://rumble.com/user/SimpleDavy", "https://youtube.com/@OffLabelPod"] },
];

let browser;
let server;

before(async () => {
  await mkdir(RESULTS, { recursive: true });
  if (!LIVE_ORIGIN) {
    server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44225"], { stdio: "ignore" });
    await waitForServer();
  }
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});

after(async () => {
  await browser?.close();
  server?.kill();
});

test("Friends is a dedicated first-party route with no Wix shell", async () => {
  const app = await readFile("src/App.tsx", "utf8");
  const page = await readFile("src/pages/FriendsPage.tsx", "utf8");
  const shell = await readFile("src/pages/RouteShellPage.tsx", "utf8");
  assert.match(app, /path="\/friends" element={<FriendsPage\s*\/>}/);
  assert.doesNotMatch(app, /routeKey="friends"/);
  assert.doesNotMatch(shell, /\bfriends\s*:/i);
  assert.match(page, /daniel-tradition\.webp/);
  assert.match(page, /darnell1\.webp/);
  assert.match(page, /davy1\.webp/);
  assert.match(page, /rumble\.svg/);
  assert.match(page, /youtube\.svg/);
  assert.match(page, /twitter\.svg/);
  assert.match(page, /au\.svg/);
  assert.match(page, /us\.svg/);
  assert.doesNotMatch(page, /thirdrailify\.com\/friends|Migration-stage route|sourceHref/);
});

test("profile cards expose no social links until their accessible dialogs open", async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  const errors = collectPageErrors(page);
  await mockApis(page);
  const response = await page.goto(`${ORIGIN}/friends`, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200);
  await page.evaluate(() => document.fonts.ready);
  const main = page.locator("#main-content");
  assert.equal(await main.locator("h1").count(), 1);
  assert.equal(await main.getByRole("heading", { level: 1, name: /The regulars\.\s+Chaos has a guest list\./i }).count(), 1);
  assert.equal(await main.locator(".friend-card").count(), 3);
  const cardMicroType = await main.locator(".friend-card").first().evaluate((card) => ({ meta: Number.parseFloat(getComputedStyle(card.querySelector(".friend-card__meta")).fontSize), eyebrow: Number.parseFloat(getComputedStyle(card.querySelector(".friend-card__identity small")).fontSize), location: Number.parseFloat(getComputedStyle(card.querySelector(".friend-card__location")).fontSize) }));
  assert.ok(Math.abs(cardMicroType.meta - 6.6) <= .1, "card metadata is enlarged by no more than ten percent");
  assert.ok(Math.abs(cardMicroType.eyebrow - 8.8) <= .1, "card name eyebrows are enlarged by no more than ten percent");
  assert.ok(Math.abs(cardMicroType.location - 10) <= .1, "card location tags match the current readable microtype token");
  assert.equal(await main.locator('.friend-card a[href^="http"]').count(), 0, "summary cards contain no social links");
  assert.equal(await main.locator('.friend-dialog a[href^="http"]').count(), 0, "social links are absent until a dialog opens");

  const hoverRatios = [];
  for (const key of ["daniel", "darnell", "davy"]) {
    const card = main.locator(`.friend-card--${key}`);
    const image = card.locator(".friend-card__visual img");
    const baseScale = await image.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a);
    await card.hover();
    const hoverScale = await image.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a);
    assert.ok(hoverScale > baseScale, `${key} portrait zooms in on hover`);
    hoverRatios.push(hoverScale / baseScale);
    await page.mouse.move(1, 1);
  }
  assert.ok(Math.max(...hoverRatios) - Math.min(...hoverRatios) <= .001, `all portrait hover zoom ratios match: ${hoverRatios.join(", ")}`);

  for (const profile of PROFILES) {
    const trigger = main.getByRole("button", { name: profile.trigger });
    await assertLocation(trigger.locator(".friend-card__location"), profile, `${profile.name} card`);
    await trigger.focus();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: new RegExp(`${escapeRegExp(profile.name)}.*${escapeRegExp(profile.nickname)}`, "i") });
    await dialog.waitFor();
    const text = await dialog.innerText();
    for (const phrase of profile.required) assert.match(text, new RegExp(escapeRegExp(phrase), "i"), `${profile.name} dialog contains ${phrase}`);
    await assertLocation(dialog.locator(".friend-dialog__location"), profile, `${profile.name} dialog`);
    assert.ok(Math.abs(await dialog.locator(".friend-dialog__location").evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)) - 14) <= .1, `${profile.name} dialog location matches the current readable dialog token`);
    const links = await dialog.locator('a[href^="http"]').evaluateAll((nodes) => nodes.map((node) => ({ href: node.href, target: node.target, rel: node.rel })));
    assert.deepEqual(links.map((link) => link.href), profile.links);
    assert.ok(links.every((link) => link.target === "_blank" && link.rel.includes("noopener") && link.rel.includes("noreferrer")));
    const platformIcons = await dialog.locator('.friend-dialog__links a > img').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("src") || ""));
    assert.equal(platformIcons.length, profile.links.length, `${profile.name} shows one platform icon per external link`);
    assert.ok(platformIcons.every((src) => src.startsWith("data:image/svg+xml") || /\/(?:rumble|youtube|twitter)(?:-[^/]+)?\.svg$/i.test(new URL(src, ORIGIN).pathname)), `${profile.name} uses the first-party platform SVG set`);
    const portraitFill = await dialog.evaluate((node) => {
      const panel = node.querySelector(".friend-dialog__portrait").getBoundingClientRect();
      const image = node.querySelector(".friend-dialog__portrait img").getBoundingClientRect();
      return { widthRatio: image.width / panel.width, heightRatio: image.height / panel.height, left: image.left, panelLeft: panel.left };
    });
    assert.ok(portraitFill.widthRatio >= 1.1 && portraitFill.heightRatio >= 1.05, `${profile.name} portrait fills its dialog canvas`);
    assert.ok(portraitFill.left <= portraitFill.panelLeft, `${profile.name} portrait reaches the left edge of its dialog canvas`);
    assert.match(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") || ""), new RegExp(`Close ${escapeRegExp(profile.name)} profile`, "i"));
    await page.keyboard.press("Shift+Tab");
    assert.equal(await dialog.locator("a").last().evaluate((node) => node === document.activeElement), true, "reverse tab wraps to the final link");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.equal(await trigger.evaluate((node) => node === document.activeElement), true, `${profile.name} trigger regains focus`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test("Friends stays composed, animated, and overflow-free at all supported viewports", async () => {
  for (const [width, height] of TEST_VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
    await addConsent(context);
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    await mockApis(page);
    await page.goto(`${ORIGIN}/friends`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    if (LIVE_ORIGIN) await page.waitForTimeout(1_500);
    await page.locator(".friends-signal").scrollIntoViewIfNeeded();
    await page.locator(".friends-signal.is-active").waitFor({ timeout: 8_000 });
    await page.locator(".friends-hero.is-active").waitFor({ timeout: 8_000 });
    const stars = page.locator(".friends-hero__star");
    assert.equal(await stars.count(), 168, `the expanded hero starfield is complete at ${width}px`);
    const starGeometry = await stars.evaluateAll((nodes) => nodes.map((node) => { const style = getComputedStyle(node); const cross = node.classList.contains("friends-hero__star--cross"); return { cross, y: Number.parseFloat(node.style.getPropertyValue("--star-y")), width: Number.parseFloat(style.width), height: Number.parseFloat(style.height), radius: style.borderRadius, crossArm: getComputedStyle(node, "::before").backgroundImage }; }));
    const dotStars = starGeometry.filter((star) => !star.cross);
    const crossStars = starGeometry.filter((star) => star.cross);
    const upperStars = starGeometry.filter((star) => star.y < 42);
    const lowerStars = starGeometry.filter((star) => star.y > 68);
    assert.equal(dotStars.length, 132, `the hero keeps a dense dot field at ${width}px`);
    assert.equal(crossStars.length, 36, `the hero includes the full cruciform star set at ${width}px`);
    assert.ok(dotStars.every((star) => star.width >= 1 && star.width <= 2.5 && star.height >= 1 && star.height <= 2.5 && star.radius !== "0px"), `dot stars stay finely scaled at ${width}px`);
    assert.ok(crossStars.every((star) => star.width >= 8 && star.width <= 14 && star.height >= 8 && star.height <= 14 && star.crossArm !== "none"), `cruciform stars retain both luminous arms at ${width}px`);
    assert.ok(upperStars.length >= lowerStars.length * 3, `the night sky is substantially denser at the top at ${width}px: ${upperStars.length}/${lowerStars.length}`);
    assert.notEqual(await stars.first().evaluate((node) => getComputedStyle(node).animationName), "none", `hero starlight twinkles at ${width}px`);
    assert.equal(await page.locator(".friends-hero__meteors i").count(), 3);
    assert.notEqual(await page.locator(".friends-hero__meteors i").first().evaluate((node) => getComputedStyle(node).animationName), "none", `meteor accents animate at ${width}px`);
    assert.notEqual(await page.locator(".friends-signal__aura").evaluate((node) => getComputedStyle(node).animationName), "none", `signal aura breathes at ${width}px`);
    assert.notEqual(await page.locator(".friends-signal__scope i").first().evaluate((node) => getComputedStyle(node).animationName), "none");
    const heroPortraitFill = await page.locator(".friends-signal").evaluate((stage) => {
      const stageRect = stage.getBoundingClientRect();
      return [...stage.querySelectorAll(".friends-signal__portrait img")].map((image) => {
        const rect = image.getBoundingClientRect();
        return { widthRatio: rect.width / stageRect.width, heightRatio: rect.height / stageRect.height };
      });
    });
    assert.ok(heroPortraitFill.every((fill) => fill.widthRatio >= .43 && fill.heightRatio >= .9), `hero portraits fill the signal canvas at ${width}px`);
    const portraitFloorGaps = await page.locator(".friends-signal").evaluate((stage) => {
      const stageBottom = stage.getBoundingClientRect().bottom;
      return [...stage.querySelectorAll(".friends-signal__portrait")].map((portrait) => stageBottom - portrait.getBoundingClientRect().bottom);
    });
    assert.ok(portraitFloorGaps.every((gap) => gap <= 2), `hero portraits stay pinned to the signal floor at ${width}px`);
    const danielPlacement = await page.locator(".friends-signal").evaluate((stage) => {
      const stageRect = stage.getBoundingClientRect();
      const portrait = stage.querySelector(".friends-signal__portrait--daniel").getBoundingClientRect();
      return { widthRatio: portrait.width / stageRect.width, centerRatio: (portrait.left + portrait.width / 2 - stageRect.left) / stageRect.width };
    });
    assert.ok(danielPlacement.widthRatio >= .62, `Daniel stays large in the hero foreground at ${width}px`);
    assert.ok(danielPlacement.centerRatio >= .43 && danielPlacement.centerRatio <= .47, `Daniel stays distinctly left-of-centre in the hero foreground at ${width}px`);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 0); });
    await page.waitForFunction(() => window.scrollY === 0);
    const initial = await layout(page);
    await page.waitForTimeout(700);
    const settled = await layout(page);
    assert.ok(Math.abs(initial.copyTop - settled.copyTop) <= 1, `hero copy stays fixed at ${width}px`);
    assert.ok(Math.abs(initial.signalTop - settled.signalTop) <= 1, `signal stage stays fixed at ${width}px`);
    assert.equal(settled.overflow, false, `no horizontal overflow at ${width}x${height}: ${JSON.stringify(settled.offenders)}`);
    assert.ok(settled.h1Left >= -1 && settled.h1Right <= width + 1, `H1 fits at ${width}px`);
    assert.ok(settled.h1Top >= settled.headerBottom, `H1 clears the header at ${width}px`);
    await page.locator(".friends-roster").scrollIntoViewIfNeeded();
    await page.locator(".friends-roster.is-active").waitFor({ timeout: 8_000 });
    assert.notEqual(await page.locator(".friend-card__scan i").first().evaluate((node) => getComputedStyle(node).animationName), "none");
    await page.waitForFunction(() => [...document.querySelectorAll("main img")].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 15_000 });
    assert.equal(await page.locator(".friend-card").count(), 3);
    assert.ok(await page.locator(".friend-card").first().evaluate((node) => node.getBoundingClientRect().width > 280));
    const cardPortraits = await page.locator(".friend-card").evaluateAll((cards) => cards.map((card) => {
      const canvas = card.querySelector(".friend-card__visual").getBoundingClientRect();
      const image = card.querySelector(".friend-card__visual img");
      const imageRect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      return {
        key: [...card.classList].find((name) => name.startsWith("friend-card--")) || "",
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        leftGap: imageRect.left - canvas.left,
        rightGap: canvas.right - imageRect.right,
        topGap: imageRect.top - canvas.top,
        topGapRatio: (imageRect.top - canvas.top) / canvas.height,
        centerRatio: (imageRect.left + imageRect.width / 2 - canvas.left) / canvas.width,
      };
    }));
    for (const portrait of cardPortraits) {
      assert.equal(portrait.objectFit, "cover", `${portrait.key} uses fill geometry at ${width}px`);
      assert.match(portrait.objectPosition, /(?:50%|center)\s+(?:0%|0px|top)/, `${portrait.key} preserves the portrait top at ${width}px`);
      assert.ok(portrait.leftGap <= 0 && portrait.rightGap <= 0, `${portrait.key} reaches both canvas sides at ${width}px: ${JSON.stringify(portrait)}`);
      if (portrait.key === "friend-card--daniel") assert.ok(portrait.topGapRatio <= -.05 && portrait.topGapRatio >= -.2, `${portrait.key} retains its intentional high crop at ${width}px`);
      else assert.ok(Math.abs(portrait.topGap) <= 1, `${portrait.key} starts at the canvas top at ${width}px`);
    }
    const danielCardPortrait = cardPortraits.find((portrait) => portrait.key === "friend-card--daniel");
    assert.ok(danielCardPortrait && danielCardPortrait.centerRatio <= .46, `Daniel stays left-shifted inside his card at ${width}px`);
    await page.locator(".friends-close").scrollIntoViewIfNeeded();
    await page.locator(".friends-close.is-active").waitFor({ timeout: 8_000 });
    assert.equal(await page.locator(".friends-close .editorial-signal--friends").count(), 1, `Friends closing uses the community signal variant at ${width}px`);
    assert.notEqual(await page.locator(".friends-close .editorial-signal__trace-live").evaluate((node) => getComputedStyle(node).animationName), "none", `Friends closing network moves while visible at ${width}px`);

    if (process.env.FRIENDS_SCREENSHOTS === "1" && (width === 1920 || width === 1440 || width === 390)) {
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
      await page.waitForFunction(() => window.scrollY === 0);
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(RESULTS, `${PREFIX}-${width}-hero.png`) });
      await page.screenshot({ path: path.join(RESULTS, `${PREFIX}-${width}x${height}.png`), fullPage: true });
      if (width === 390) await page.addStyleTag({ content: ".skip-link{display:none!important}.site-header{position:relative!important}" });
      for (const profile of PROFILES) {
        await page.getByRole("button", { name: profile.trigger }).click();
        await page.waitForTimeout(250);
        await page.getByRole("dialog").screenshot({ path: path.join(RESULTS, `${PREFIX}-${width}-${profile.name.split(" ")[0].toLowerCase()}-dialog.png`) });
        await page.keyboard.press("Escape");
      }
      if (width === 390) {
        await page.locator(".friends-signal").screenshot({ path: path.join(RESULTS, `${PREFIX}-${width}-signal.png`) });
        await page.locator(".friends-roster").screenshot({ path: path.join(RESULTS, `${PREFIX}-${width}-roster.png`) });
        await page.locator(".friends-close").screenshot({ path: path.join(RESULTS, `${PREFIX}-${width}-close.png`) });
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test("reduced motion keeps the full Friends experience static and operable", async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await addConsent(context);
  const page = await context.newPage();
  await mockApis(page);
  await page.goto(`${ORIGIN}/friends`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator(".friends-signal").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".friends-hero").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".friends-roster").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".friends-close").getAttribute("data-motion"), "static");
  assert.equal(await page.locator(".friends-close .editorial-signal__trace-live").evaluate((node) => getComputedStyle(node).animationName), "none");
  for (const selector of [".friends-hero__starfield", ".friends-hero__star", ".friends-hero__meteors i", ".friends-signal__aura", ".friends-signal__grid", ".friends-signal__scope i", ".friend-card__scan i"]) assert.equal(await page.locator(selector).first().evaluate((node) => getComputedStyle(node).animationName), "none");
  assert.equal(await page.locator(".friend-card").count(), 3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  await page.getByRole("button", { name: /Open Simple Davy profile/i }).click();
  assert.equal(await page.getByRole("dialog").count(), 1);
  assert.equal(await page.getByRole("dialog").evaluate((node) => node.scrollWidth > node.clientWidth), false);
  await context.close();
});

function collectPageErrors(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { const url = new URL(response.url()); if (url.origin === ORIGIN && response.status() >= 400) errors.push(`${response.status()} ${url.pathname}`); });
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

async function assertLocation(locator, profile, label) {
  assert.equal(await locator.count(), 1, `${label} has one location tag`);
  assert.equal((await locator.innerText()).trim(), profile.location.toUpperCase(), `${label} shows the supplied location`);
  const flag = locator.locator("img");
  assert.equal(await flag.getAttribute("alt"), "", `${label} flag remains decorative`);
  const flagSource = await flag.getAttribute("src");
  if (flagSource.startsWith("data:image/svg+xml")) assert.match(decodeURIComponent(flagSource), new RegExp(`aria-label=['"]${escapeRegExp(profile.flagLabel)}['"]`), `${label} embeds the correct flag SVG`);
  else assert.match(new URL(flagSource, ORIGIN).pathname, profile.flagPath, `${label} uses the correct flag SVG`);
  assert.ok(await flag.evaluate((image) => image.complete && image.naturalWidth > 0), `${label} flag loads`);
  assert.ok(await locator.evaluate((node) => Math.abs(node.querySelector("img").getBoundingClientRect().height - Number.parseFloat(getComputedStyle(node).fontSize)) <= 1), `${label} flag matches the location text height`);
}

async function layout(page) {
  return page.evaluate(() => {
    const copy = document.querySelector(".friends-hero__copy").getBoundingClientRect();
    const signal = document.querySelector(".friends-signal").getBoundingClientRect();
    const h1 = document.querySelector(".friends-hero h1").getBoundingClientRect();
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      copyTop: copy.top, signalTop: signal.top, h1Left: h1.left, h1Right: h1.right, h1Top: h1.top, headerBottom: header.bottom,
      overflow: document.documentElement.scrollWidth > viewportWidth,
      offenders: [...document.querySelectorAll("#main-content *")].map((node) => { const rect = node.getBoundingClientRect(); return { selector: node.className || node.tagName, left: Math.round(rect.left), right: Math.round(rect.right) }; }).filter((entry) => entry.left < -1 || entry.right > viewportWidth + 1).slice(0, 8),
    };
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite Friends browser test server did not start.");
}
