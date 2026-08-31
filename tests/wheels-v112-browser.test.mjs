import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";
import { cloneDefaultWheelMechanics } from "../src/wheels/mechanics.mjs";

const ORIGIN = "http://127.0.0.1:4199";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = "X:\\GIT\\ThirdRailify\\.artifacts\\wheels-mechanics-v2-public";

test("Mechanics V2 six-Wheel Spin All shares one mechanics projection, revision, start, curve, and rigid renderer", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4199",
    ],
    { stdio: "ignore" },
  );
  t.after(() => server.kill());
  await wait();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });
  t.after(() => browser.close());
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 3440, height: 1440 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "no-preference",
    });
    await consent(context);
    const page = await context.newPage();
    const errors = [];
    const writes = [];
    let mechanicsRequests = 0;
    page.on("console", (entry) => {
      if (entry.type() === "error") errors.push(entry.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path === "/api/wheels/mechanics") mechanicsRequests += 1;
      if (
        path.startsWith("/api/wheels") &&
        !["GET", "HEAD"].includes(request.method())
      )
        writes.push(`${request.method()} ${path}`);
    });
    await page.route("**/api/**", respond);
    await page.goto(`${ORIGIN}/wheels/stages/stage-6`, {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "SPIN ALL", exact: true }).click();
    await page.locator('[data-stage-spin-phase="spinning_all"]').waitFor();
    await page.waitForTimeout(180);
    assert.equal(mechanicsRequests, 1);
    const active = await page
      .locator(".stage-wheel-tile .wheel-stage__face")
      .evaluateAll((canvases) =>
        canvases.map((canvas) => canvas.__wheelSpinV110),
      );
    assert.equal(active.length, 6);
    assert.deepEqual(
      new Set(active.map((item) => item.mechanicsRevision)),
      new Set([12]),
    );
    assert.deepEqual(
      new Set(active.map((item) => item.curveProfile)),
      new Set(["natural-hybrid"]),
    );
    assert.deepEqual(
      new Set(active.map((item) => item.mechanicsVersion)),
      new Set([2]),
    );
    assert.equal(new Set(active.map((item) => item.startAt)).size, 1);
    const rendererBefore = await page
      .locator(".stage-wheel-tile .wheel-stage__face")
      .evaluateAll((canvases) =>
        canvases.map((canvas) => ({
          width: canvas.width,
          height: canvas.height,
          builds: canvas.__wheelRendererV19.staticFaceRebuilds,
          pixels: canvas.__wheelRendererV19.pixels,
        })),
      );
    await page.screenshot({
      path: join(
        ARTIFACTS,
        `spin-all-natural-early-${viewport.width}x${viewport.height}.png`,
      ),
    });
    await page.waitForTimeout(1350);
    if (viewport.width === 1920)
      await page.screenshot({
        path: join(ARTIFACTS, "spin-all-natural-mid-1920x1080.png"),
      });
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-spin-substate="settled"]').length ===
        6,
    );
    const dialog = page.getByRole("dialog", { name: "WINNERS LOCKED." });
    await dialog.waitFor();
    if (viewport.width === 1920)
      await page.screenshot({
        path: join(ARTIFACTS, "spin-all-natural-settled-1920x1080.png"),
      });
    const settled = await page
      .locator(".stage-wheel-tile .wheel-stage__face")
      .evaluateAll((canvases) =>
        canvases.map((canvas) => ({
          spin: canvas.__wheelSpinV110,
          renderer: canvas.__wheelRendererV19,
        })),
      );
    assert.ok(
      settled.every(
        ({ spin }) =>
          spin.completed &&
          spin.frameCount > 10 &&
          Math.abs(spin.actualFinalFrameDelta - spin.expectedFinalFrameDelta) <
            0.001,
      ),
    );
    assert.deepEqual(
      settled.map(({ renderer }) => ({
        width: renderer.pixels,
        builds: renderer.staticFaceRebuilds,
      })),
      rendererBefore.map((item) => ({
        width: item.pixels,
        builds: item.builds,
      })),
    );
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
            document.documentElement.clientWidth <=
          1,
      ),
    );
    await context.close();
  }

  for (const surface of [
    ...[
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ].map((viewport) => ({ mode: "regular", viewport, duration: 10_000 })),
    ...[
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ].map((viewport) => ({ mode: "presentation", viewport, duration: 20_000 })),
  ]) {
    const context = await browser.newContext({ viewport: surface.viewport, reducedMotion: "no-preference" });
    await consent(context);
    const page = await context.newPage(); const errors = []; const writes = []; let mechanicsRequests = 0;
    page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); }); page.on("pageerror", (error) => errors.push(error.message)); page.on("request", (request) => { const path = new URL(request.url()).pathname; if (path === "/api/wheels/mechanics") mechanicsRequests += 1; if (path.startsWith("/api/wheels") && !["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${path}`); });
    await page.route("**/api/**", respond);
    const slug = surface.duration === 10_000 ? "natural-10" : "natural-20"; const suffix = surface.mode === "presentation" ? "/present" : "";
    await page.goto(`${ORIGIN}/wheels/${slug}${suffix}`, { waitUntil: "networkidle" }); const canvas = page.locator(".wheel-stage__face").first(); await canvas.waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1));
    if (surface.mode === "regular" && surface.viewport.width === 1440) {
      await page.screenshot({ path: join(ARTIFACTS, "21-public-regular-natural.png") }); const started = performance.now(); await page.getByRole("button", { name: "Start demo spin" }).click(); await page.waitForTimeout(900); await page.screenshot({ path: join(ARTIFACTS, "21-public-regular-natural-in-motion.png") }); await page.getByRole("dialog").waitFor({ timeout: 12_000 }); const metrics = await canvas.evaluate((node) => node.__wheelSpinV110); assert.ok(metrics.completed); assert.equal(metrics.durationMs, 10_000); assert.ok(Math.abs(metrics.settledAt - metrics.startAt - 10_000) < 50); assert.ok(performance.now() - started >= 9_950);
    }
    if (surface.mode === "presentation" && surface.viewport.width === 1280) {
      await page.screenshot({ path: join(ARTIFACTS, "22-presentation-natural.png") }); const started = performance.now(); await page.getByRole("button", { name: "Start demo spin" }).click(); await page.waitForTimeout(17_600); await page.screenshot({ path: join(ARTIFACTS, "22-presentation-natural-tail.png") }); await page.getByRole("dialog").waitFor({ timeout: 4_000 }); const metrics = await canvas.evaluate((node) => node.__wheelSpinV110); assert.ok(metrics.completed); assert.equal(metrics.durationMs, 20_000); assert.ok(Math.abs(metrics.settledAt - metrics.startAt - 20_000) < 50); assert.ok(performance.now() - started >= 19_950);
    }
    assert.ok(mechanicsRequests <= 1); assert.deepEqual(writes, []); assert.deepEqual(errors, []); await context.close();
  }
});

async function respond(route) {
  const url = new URL(route.request().url());
  if (url.pathname === "/api/auth/config")
    return json(route, {
      configured: true,
      emailSignupConfigured: false,
      turnstileSiteKey: null,
      oauthProviders: [],
      oauthProviderStates: [],
      publicOrigin: ORIGIN,
      adminOrigin: ORIGIN,
      environment: "test",
      cookieMode: "host-only",
    });
  if (url.pathname === "/api/auth/session")
    return json(route, {
      ok: true,
      authenticated: true,
      csrfToken: "v112-stage",
      access: { isAdmin: false, isMasterAdmin: false },
      account: {
        id: "creator",
        email: "creator@example.test",
        displayName: "Creator",
        avatarUrl: null,
        providers: ["email"],
        role: "user",
        adminLevel: "none",
        status: "active",
        emailVerified: true,
        createdAt: "2026-08-31T00:00:00Z",
        source: "test",
      },
    });
  if (url.pathname === "/api/wheels/mechanics")
    return json(route, { ok: true, revision: 12, mechanics: mechanics() });
  if (url.pathname === "/api/wheels/stages/stage-6")
    return json(route, stage());
  if (url.pathname === "/api/wheels") return json(route, { ok: true, items: [wheelSummary("natural-10"), wheelSummary("natural-20")], count: 2 });
  if (url.pathname === "/api/wheels/access") return json(route, { ok: true, authenticated: true, canCreate: true, isMasterAdmin: false, maximumOwnedWheels: 20 });
  if (url.pathname === "/api/wheels/natural-10") return json(route, wheelDetail("natural-10", 10_000));
  if (url.pathname === "/api/wheels/natural-20") return json(route, wheelDetail("natural-20", 20_000));
  return json(route, { ok: true });
}
function mechanics() {
  return cloneDefaultWheelMechanics();
}
function stage() {
  return {
    ok: true,
    stage: {
      slug: "stage-6",
      title: "Broadcast Mechanics Six",
      description: "Synthetic V1.12 acceptance",
      visibility: "public",
      lifecycle: "active",
      revision: 1,
      updatedAt: "2026-08-31T00:00:00Z",
      wheels: Array.from({ length: 6 }, (_, position) => ({
        position,
        unavailable: false,
        wheel: wheel(position),
        access: {
          role: "editor",
          isMasterAdmin: false,
          canEdit: true,
          canSpinOfficially: false,
          editingLocked: false,
          officialSpinLocked: false,
          revision: 1,
        },
      })),
    },
    access: { isOwner: true, isMasterAdmin: false, canEdit: true, revision: 1 },
  };
}
function wheelSummary(slug) { return { slug, title: `Natural Hybrid ${slug.endsWith("10") ? "10" : "20"}`, description: "Mechanics V2 exact-duration fixture", participantCount: 8, weighted: false, themePreset: "custom", palette: ["#f3c928", "#b8182f", "#6d3a93"], demoEnabled: true, officialEnabled: false, latestOfficialAt: null }; }
function wheelDetail(slug, duration) { const value = wheel(0); value.slug = slug; value.title = `Natural Hybrid ${duration / 1000} second`; value.config.spinDurationMs = duration; return { ok: true, wheel: value, access: { role: "editor", isMasterAdmin: false, canEdit: true, canSpinOfficially: false, editingLocked: false, officialSpinLocked: false, revision: 1 } }; }
function wheel(index) {
  const palette = [
    ["#f3c928", "#b8182f", "#f3f0e5"],
    ["#0d6f73", "#f3c928", "#171712"],
    ["#6d3a93", "#f3c928", "#b8182f"],
  ][index % 3];
  return {
    slug: `broadcast-wheel-${index + 1}`,
    title: `Broadcast Wheel ${index + 1}`,
    description: "V1.12 fixture",
    lifecycle: "active",
    visibility: "public",
    owner: { displayName: "Fixture Owner", avatarUrl: null },
    createdAt: "2026-08-31T00:00:00Z",
    updatedAt: "2026-08-31T00:00:00Z",
    participantCount: 8,
    weighted: false,
    entries: Array.from({ length: 8 }, (_, order) => ({
      id: `00000000-0000-4000-8${String(index).padStart(3, "0")}-${String(order + 1).padStart(12, "0")}`,
      label: `Entry ${order + 1}`,
      order,
      weight: 1,
      colour: null,
      style: null,
      state: "active",
    })),
    config: {
      themePreset: "custom",
      palette,
      paletteStyles: palette.map((color) => ({ mode: "solid", color })),
      pointerAccent: palette[0],
      centreTreatment: "bolt",
      backgroundIntensity: "medium",
      labelContrast: "light",
      spinDurationMs: 2200 + index * 300,
      tickingSoundEnabled: false,
      spinSoundPreset: "silent",
      winnerSoundEnabled: false,
      winnerSoundPreset: "silent",
      celebrationEnabled: false,
      confettiEnabled: false,
      fireworksEnabled: false,
      winnerLightingEnabled: false,
      celebrationIntensity: "subtle",
      backgroundEnabled: false,
      backgroundFocalX: 50,
      backgroundFocalY: 50,
      backgroundImageOpacity: 70,
      backgroundOverlayIntensity: 60,
      winnerMessageTemplate: "Signal locked: {winner}",
      publicHistoryVisible: true,
    },
    media: { background: null, centre: null, segmentFills: [] },
    demoEnabled: true,
    officialEnabled: false,
    latestOfficialResult: null,
    recentOfficialResults: [],
    revision: 1,
  };
}
async function consent(context) {
  const now = Date.now();
  await context.addCookies([
    {
      name: "thirdrailify_consent",
      value: encodeURIComponent(
        JSON.stringify({
          version: 1,
          timestamp: new Date(now).toISOString(),
          expiry: new Date(now + 2592000000).toISOString(),
          categories: { preferences: false, externalMedia: false },
        }),
      ),
      domain: "127.0.0.1",
      path: "/",
      expires: Math.floor((now + 2592000000) / 1000),
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}
async function wait() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(ORIGIN)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Public preview did not start.");
}
