import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:44221";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = path.join(tmpdir(), "thirdrailify-community-typography");
let browser;
let server;

before(async () => {
  await mkdir(RESULTS, { recursive: true });
  server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "44221"], { stdio: "ignore" });
  await waitForServer();
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});

after(async () => {
  await browser?.close();
  server?.kill();
});

test("the full Community Discord directory keeps all content text readable without overflow", async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
    const page = await context.newPage();
    await mockApis(page);
    await page.goto(`${ORIGIN}/community`, { waitUntil: "domcontentloaded" });
    await page.locator('.discord-widget--full[data-state="ready"]').waitFor();

    const typography = await page.locator(".discord-widget--full").evaluate((widget) => {
      const size = (selector) => Number.parseFloat(getComputedStyle(widget.querySelector(selector)).fontSize);
      return {
        brandLabel: size(".discord-widget__brand small"),
        connection: size(".discord-widget__connection"),
        overviewLabel: size(".discord-widget__overview span"),
        panelHeading: size(".discord-widget__panel-heading"),
        channelTitle: size(".discord-widget__channel-title"),
        channelDescription: size(".discord-widget__channel-description"),
        channelMeta: size(".discord-widget__channel-meta"),
        channelAction: size(".discord-widget__channels a"),
        memberName: size(".discord-widget__members strong"),
        memberStatus: size(".discord-widget__members small"),
        control: size(".discord-widget__channel-toggle"),
        footerCopy: size(".discord-widget__footer span"),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    for (const label of ["brandLabel", "connection", "overviewLabel", "panelHeading", "channelMeta", "memberStatus", "control"]) {
      assert.ok(typography[label] >= 11, `${label} remains readable at ${viewport.width}px: ${JSON.stringify(typography)}`);
    }
    assert.ok(typography.channelTitle >= 16, `channel title remains readable at ${viewport.width}px`);
    assert.ok(typography.channelDescription >= 13, `channel description remains readable at ${viewport.width}px`);
    assert.ok(typography.channelAction >= 11, `channel action remains readable at ${viewport.width}px`);
    assert.ok(typography.memberName >= 16, `member name remains readable at ${viewport.width}px`);
    assert.ok(typography.footerCopy >= 13, `footer copy remains readable at ${viewport.width}px`);
    assert.equal(typography.overflow, false, `readable Community typography does not cause horizontal overflow at ${viewport.width}px`);
    await page.locator(".discord-widget--full").screenshot({ path: path.join(RESULTS, `community-widget-${viewport.width}.png`) });
    await context.close();
  }
});

test("the Community hero runs its dedicated signal network responsively and respects reduced motion", async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
    await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date().toISOString(), expiry: new Date(Date.now() + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN, sameSite: "Lax" }]);
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await mockApis(page);
    await page.goto(`${ORIGIN}/community`, { waitUntil: "domcontentloaded" });
    await page.locator('.community-hero[data-motion="active"]').waitFor();

    const state = await page.locator(".community-hero").evaluate((hero) => {
      const copy = hero.querySelector(".community-hero__copy").getBoundingClientRect();
      const art = hero.querySelector(".community-hero__art").getBoundingClientRect();
      const animation = (selector) => getComputedStyle(hero.querySelector(selector)).animationName;
      return {
        routes: hero.querySelectorAll(".community-hero-signal__route").length,
        nodes: hero.querySelectorAll(".community-hero-signal__node-ring").length,
        particles: hero.querySelectorAll(".community-hero-signal__particles i").length,
        gridAnimation: animation(".community-hero-signal__mesh"),
        routeAnimation: animation(".community-hero-signal__route"),
        coreAnimation: animation(".community-hero-signal__core > div"),
        imageAnimation: animation(".community-hero__art > img"),
        radarPlayState: getComputedStyle(hero.querySelector(".community-hero__radar"), "::before").animationPlayState,
        separated: innerWidth > 900 ? copy.right <= art.left : copy.bottom <= art.top,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    assert.deepEqual([state.routes, state.nodes, state.particles], [3, 4, 12]);
    for (const key of ["gridAnimation", "routeAnimation", "coreAnimation", "imageAnimation"]) assert.notEqual(state[key], "none", `${key} runs at ${viewport.width}px`);
    assert.equal(state.radarPlayState, "running", `radar sweep runs at ${viewport.width}px`);
    assert.equal(state.separated, true, `hero copy and artwork stay separated at ${viewport.width}px`);
    assert.equal(state.overflow, false, `animated hero does not cause horizontal overflow at ${viewport.width}px`);
    assert.deepEqual(errors, [], `Community hero stays console-clean at ${viewport.width}px`);
    await page.locator(".community-hero").screenshot({ path: path.join(RESULTS, `community-hero-${viewport.width}.png`) });
    await context.close();
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reducedContext.newPage();
  await mockApis(reducedPage);
  await reducedPage.goto(`${ORIGIN}/community`, { waitUntil: "domcontentloaded" });
  await reducedPage.locator('.community-hero[data-motion="static"]').waitFor();
  const reduced = await reducedPage.locator(".community-hero").evaluate((hero) => ({
    route: getComputedStyle(hero.querySelector(".community-hero-signal__route")).animationName,
    image: getComputedStyle(hero.querySelector(".community-hero__art > img")).animationName,
    radar: getComputedStyle(hero.querySelector(".community-hero__radar"), "::before").animationName,
  }));
  assert.deepEqual(reduced, { route: "none", image: "none", radar: "none" });
  await reducedContext.close();
});

async function mockApis(page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/community/discord") return json(route, communityFixture());
    if (pathname === "/api/auth/config") return json(route, { configured: false, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/analytics") return json(route, { ok: true, accepted: true });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, normal: { enabled: false, messages: [] }, live: { enabled: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-09-01", rates: { CAD: 1 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, collections: [], products: [] });
    return json(route, { ok: false, error: "not_found" }, 404);
  });
}

function communityFixture() {
  const channels = Array.from({ length: 7 }, (_, index) => ({
    key: `channel-${index}`,
    name: index ? `community-channel-${index + 1}` : "announcements",
    type: index === 1 ? "forum" : "text",
    topic: "Readable public channel details, schedules, links, and community context should not require squinting.",
    categoryName: "Text channels",
    position: index,
    url: `https://discord.com/channels/1114717958573396008/${100 + index}`,
  }));
  return {
    available: true,
    schema: "thirdrailify-discord-community-v1",
    freshness: "fresh",
    generatedAt: new Date().toISOString(),
    ageSeconds: 20,
    guild: { id: "1114717958573396008", name: "Getting Railed Behind The Scenes", inviteUrl: "https://discord.com/invite/Bd8hU5aFxA" },
    counts: { onlineMembers: 47 },
    channels,
    voiceSpaces: ["Third Railiverse", "Pork Hunts Inc.", "Open Mic"].map((name, index) => ({ key: `voice-${index}`, name, type: "voice", topic: null, categoryName: "Voice", position: index, url: `https://discord.com/channels/1114717958573396008/${200 + index}` })),
    members: Array.from({ length: 13 }, (_, index) => ({ key: `member-${String(index).padStart(24, "0")}`, displayName: `Community Member ${index + 1}`, username: `member${index + 1}`, nickname: null, avatarUrl: null, status: "online", joinedAt: "2026-01-01T00:00:00.000Z", bot: false })),
  };
}

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite Community typography browser test server did not start.");
}
