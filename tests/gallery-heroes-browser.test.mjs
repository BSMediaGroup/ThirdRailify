import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = "http://127.0.0.1:4199";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = fileURLToPath(new URL("../.artifacts/gallery-hero-polish/", import.meta.url));

test("Wheels and Polls gallery heroes share premium motion, feature diagrams, responsive containment, and reduced-motion stills", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4199"], { stdio: "ignore" });
  t.after(() => server.kill());
  await waitForPreview();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    for (const route of ["wheels", "polls"]) {
      const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
      await addConsent(context);
      const page = await context.newPage();
      const errors = [];
      page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/**", respond);
      await page.goto(`${ORIGIN}/${route}`, { waitUntil: "networkidle" });
      const hero = page.locator(`.${route === "wheels" ? "wheels" : "polls"}-hero`);
      await hero.waitFor();
      await page.waitForFunction(() => document.querySelector(".gallery-hero")?.getAttribute("data-motion") === "active");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${route} ${viewport.width} has no horizontal overflow`);
      assert.equal(await hero.locator(".gallery-hero__atmosphere").count(), 1);
      assert.equal(await hero.locator(":scope > :is(.wheels-trust-rail,.polls-trust-rail) > span").count(), 3);
      assert.equal((await hero.locator("h1").innerText()).replace(/\s+/g, " ").trim(), route === "wheels" ? "SPIN THE RAIL." : "READ THE ROOM.");
      const eyebrow = await hero.locator(".eyebrow").first().boundingBox();
      assert.ok(eyebrow && eyebrow.width > 0 && eyebrow.height > 0, `${route} ${viewport.width} keeps the hero eyebrow visible`);
      const geometry = await hero.evaluate((node) => {
        const copy = node.querySelector(".wheels-hero__copy,.polls-hero__copy").getBoundingClientRect();
        const visual = node.querySelector(".hero-wheel,.poll-signal-diagram").getBoundingClientRect();
        const bounds = node.getBoundingClientRect();
        const overlapX = Math.max(0, Math.min(copy.right, visual.right) - Math.max(copy.left, visual.left));
        const overlapY = Math.max(0, Math.min(copy.bottom, visual.bottom) - Math.max(copy.top, visual.top));
        return { copy: copy.toJSON(), visual: visual.toJSON(), bounds: bounds.toJSON(), overlap: overlapX * overlapY };
      });
      assert.ok(geometry.visual.width > (viewport.width < 500 ? 280 : 360), JSON.stringify({ route, viewport, geometry }));
      assert.ok(geometry.visual.left >= -2 && geometry.visual.right <= viewport.width + 2, JSON.stringify({ route, viewport, geometry }));
      if (viewport.width > 820) assert.ok(geometry.overlap < 2, JSON.stringify({ route, viewport, geometry }));
      if (route === "wheels") {
        assert.equal(await hero.locator(".hero-wheel__telemetry").count(), 2);
        assert.equal(await hero.locator(".hero-wheel__bezel").count(), 1);
        assert.equal(await hero.locator(".hero-wheel__ring").evaluate((node) => getComputedStyle(node).animationName), "gallery-wheel-rotate");
      } else {
        assert.equal(await hero.locator(".poll-signal-console__options > span").count(), 4);
        assert.equal(await hero.locator(".poll-signal-source").count(), 2);
        assert.equal(await hero.locator(".poll-signal-diagram__links .is-live").evaluate((node) => getComputedStyle(node).animationName), "poll-link-flow");
      }
      assert.equal(await hero.locator(".gallery-hero__grid-field").evaluate((node) => getComputedStyle(node).animationName), "gallery-grid-drift");
      assert.deepEqual(errors, []);
      await hero.screenshot({ path: `${ARTIFACTS}/${route}-${viewport.width}x${viewport.height}.png` });
      await context.close();
    }
  }

  for (const route of ["wheels", "polls"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await addConsent(context);
    const page = await context.newPage();
    await page.route("**/api/**", respond);
    await page.goto(`${ORIGIN}/${route}`, { waitUntil: "networkidle" });
    const hero = page.locator(".gallery-hero");
    assert.equal(await hero.getAttribute("data-motion"), "static");
    const animationNames = await hero.locator(route === "wheels" ? ".hero-wheel__ring,.hero-wheel__inner-orbit,.gallery-hero__grid-field" : ".poll-signal-diagram__links .is-live,.poll-signal-result,.gallery-hero__grid-field").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName));
    assert.ok(animationNames.every((name) => name === "none"), JSON.stringify({ route, animationNames }));
    if (route === "wheels") {
      const markerAngles = await hero.locator(".hero-wheel__ring").evaluate((ring) => {
        const bounds = ring.getBoundingClientRect();
        const centre = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
        return [...ring.querySelectorAll(":scope > i")].map((marker) => {
          const markerBounds = marker.getBoundingClientRect();
          const dx = markerBounds.left + markerBounds.width / 2 - centre.x;
          const dy = markerBounds.top + markerBounds.height / 2 - centre.y;
          return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        });
      });
      const segmentCentres = [356.2, 34, 79, 125.8, 172.6, 217.6, 260.8, 311.2];
      markerAngles.forEach((angle, index) => {
        const delta = Math.abs(((angle - segmentCentres[index] + 540) % 360) - 180);
        assert.ok(delta < .35, JSON.stringify({ markerAngles, segmentCentres, index, delta }));
      });
    }
    await hero.screenshot({ path: `${ARTIFACTS}/${route}-reduced-motion-1440x900.png` });
    await context.close();
  }
});

async function respond(route) {
  const url = new URL(route.request().url());
  if (url.pathname === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
  if (url.pathname === "/api/auth/session") return json(route, { ok: true, authenticated: true, csrfToken: "gallery-hero-csrf", access: { isAdmin: false, isMasterAdmin: false }, account: { id: "creator", email: "creator@example.test", displayName: "Approved Creator", avatarUrl: null, providers: ["email"], role: "user", adminLevel: "none", status: "active", emailVerified: true, createdAt: "2026-09-01T00:00:00Z", source: "test" } });
  if (url.pathname === "/api/wheels/access") return json(route, { ok: true, authenticated: true, canCreate: true, isMasterAdmin: false, maximumOwnedWheels: 20 });
  if (url.pathname === "/api/wheels") return json(route, { ok: true, items: [], count: 0 });
  if (url.pathname === "/api/wheels/stages") return json(route, { ok: true, items: [], count: 0 });
  if (url.pathname === "/api/polls/access") return json(route, { ok: true, authenticated: true, canCreate: true, canManageAll: false });
  if (url.pathname === "/api/polls") return json(route, { ok: true, items: [], count: 0, refreshedAt: new Date().toISOString() });
  return json(route, { ok: true });
}

function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function addConsent(context) { const now = Date.now(); await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 86_400_000).toISOString(), categories: { preferences: false, externalMedia: false } })), domain: "127.0.0.1", path: "/", expires: Math.floor((now + 86_400_000) / 1000), httpOnly: false, secure: false, sameSite: "Lax" }]); }
async function waitForPreview() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Public preview did not start"); }
