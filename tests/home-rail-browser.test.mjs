import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.HOME_RAIL_ORIGIN || "http://127.0.0.1:4201";
const LIVE = Boolean(process.env.HOME_RAIL_ORIGIN);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("managed homepage rail is gapless, responsive, and uses the triple-zap divider", async (t) => {
  if (!LIVE) {
    const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4201"], { stdio: "ignore" });
    t.after(() => server.kill());
    await waitForServer();
  }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    if (!LIVE) await mockApis(page);
    await page.goto(ORIGIN, { waitUntil: "domcontentloaded" });
    const ticker = page.getByRole("complementary", { name: "Homepage topics" });
    await ticker.waitFor();
    assert.equal(await ticker.getAttribute("class"), `hero-ticker hero-ticker--marquee is-${LIVE ? "normal is-linear" : "fast is-ease-in-out"}`);
    assert.equal(await ticker.locator(".hero-ticker__segment").count(), 2);
    assert.equal(await ticker.locator(".hero-ticker__segment").first().locator(".hero-ticker__zap").count(), 4);
    assert.equal(await ticker.locator(".hero-ticker__segment").first().locator(".hero-ticker__zap svg").count(), 0);
    const zapStyle = await ticker.locator(".hero-ticker__zap").first().evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, mask: getComputedStyle(element).maskImage || getComputedStyle(element).webkitMaskImage }));
    assert.equal(zapStyle.background, "rgb(255, 209, 47)"); assert.match(zapStyle.mask, /trzap-0|2454%202460/);

    const geometry = await ticker.evaluate(async (element) => {
      const track = element.querySelector(".hero-ticker__track");
      const segments = [...element.querySelectorAll(".hero-ticker__segment")];
      const animation = track.getAnimations()[0];
      animation.pause();
      const duration = Number(getComputedStyle(track).animationDuration.replace("s", "")) * 1000;
      const snapshots = [];
      for (const ratio of [0, .2, .5, .8, .999]) {
        animation.currentTime = duration * ratio;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const viewport = element.getBoundingClientRect();
        const intervals = segments.map((segment) => segment.getBoundingClientRect()).sort((a, b) => a.left - b.left);
        let coveredThrough = viewport.left;
        let gap = false;
        for (const interval of intervals) {
          if (interval.right <= viewport.left || interval.left >= viewport.right) continue;
          if (interval.left > coveredThrough + 1) gap = true;
          coveredThrough = Math.max(coveredThrough, interval.right);
        }
        snapshots.push({ gap: gap || coveredThrough < viewport.right - 1, coveredThrough, right: viewport.right });
      }
      const widths = segments.map((segment) => segment.getBoundingClientRect().width);
      return { duration, widths, trackWidth: track.getBoundingClientRect().width, snapshots };
    });
    assert.equal(geometry.duration, LIVE ? 28_000 : 18_000);
    assert.ok(Math.abs(geometry.widths[0] - geometry.widths[1]) < 1, "duplicate segments must have identical widths");
    assert.ok(Math.abs(geometry.trackWidth - geometry.widths[0] * 2) < 1, "track must be exactly two identical segments");
    assert.equal(geometry.snapshots.some((snapshot) => snapshot.gap), false, `rail must cover the full ${width}px viewport throughout its loop`);
    assert.equal(await page.locator("html").evaluate((root) => root.scrollWidth <= root.clientWidth), true, `no horizontal overflow at ${width}x${height}`);
    assert.deepEqual(errors, []);
    if (process.env.HOME_RAIL_SCREENSHOTS === "1") await page.screenshot({ path: path.join(process.env.TEMP || ".", `thirdrailify-home-rail-${width}.png`), fullPage: false });
    await context.close();
  }
});

async function mockApis(page) {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (pathname === "/api/auth/session") return json(route, { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } });
    if (pathname === "/api/watch") return json(route, { available: false, liveNow: [], primary: null, latest: null, upcoming: null });
    if (pathname === "/api/currency-rates") return json(route, { ok: true, base: "CAD", date: "2026-08-29", rates: { CAD: 1, USD: .73 } });
    if (pathname === "/api/commerce/catalogue") return json(route, { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, products: [], updatedAt: null });
    if (pathname === "/api/catalogue/banner") return json(route, { ok: true, schema: "thirdrailify-banner-v1", normal: { enabled: false, messages: [], mode: "static", speed: "normal" }, live: { enabled: false, label: "LIVE NOW", showTitle: true, supportingText: null, ctaLabel: "WATCH NOW", ctaPath: "/watch/live", animation: "static", intensity: "subtle" }, homeRail: { enabled: true, items: ["THIRD RAILIFY", "NEWS HANGOUT", "ABOOT NOTHING", "POP CULTURE BEAT DOWN"], mode: "marquee", speed: "fast", easing: "ease-in-out", glyph: "zap" }, updatedAt: "2026-08-29T00:00:00.000Z" });
    if (pathname === "/api/community/discord") return json(route, { available: true, schema: "thirdrailify-discord-community-v1", freshness: "fresh", generatedAt: "2026-08-29T00:00:00.000Z", ageSeconds: 0, guild: { id: "1114717958573396008", name: "Third Railify", inviteUrl: "https://discord.com/invite/Bd8hU5aFxA" }, counts: { onlineMembers: 0 }, channels: [], voiceSpaces: [], members: [] });
    return json(route, { error: "not_found" }, 404);
  });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Vite homepage rail test server did not start."); }
