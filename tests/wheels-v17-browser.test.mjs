import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright-core";
import { CELEBRATION_PROFILES } from "../src/wheels/celebrationProfiles.mjs";

const ORIGIN = "http://127.0.0.1:4197";
const SLUG = "v17-appearance-fixture";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("Wheels V1.7 custom appearance, fixed preview, fireworks and intensity profiles", async (t) => {
  const artifacts = fileURLToPath(
    new URL("../.artifacts/wheels-v17/", import.meta.url),
  );
  await mkdir(artifacts, { recursive: true });
  const server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      "4197",
    ],
    { stdio: "ignore" },
  );
  t.after(() => server.kill());
  await waitForPreview();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });
  t.after(() => browser.close());
  const desktop = await context(
    browser,
    { width: 1440, height: 900 },
    "no-preference",
  );
  const page = await desktop.newPage();
  const writes = [];
  const errors = monitor(page);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith("/api/wheels") &&
      !["GET", "HEAD"].includes(request.method())
    )
      writes.push(`${request.method()} ${url.pathname}`);
  });
  await routes(page);
  await openAppearance(page);
  const appearance = page.getByRole("dialog", {
    name: /Tune the broadcast stage/i,
  });
  const preview = appearance.locator(".appearance-preview");
  const controls = appearance.locator(".appearance-controls");
  assert.equal(
    await appearance
      .getByRole("region", { name: "Custom palette editor" })
      .count(),
    1,
  );
  await appearance.locator(".custom-palette-card .segment-style-action").first().click();
  let segmentStyle = page.getByRole("dialog", { name: "Segment style" });
  assert.equal(await segmentStyle.getByLabel("Base colour hex for Custom palette style 1").inputValue(), "#F3C928");
  await segmentStyle.getByLabel("Base colour hex for Custom palette style 1").fill("#112233");
  await segmentStyle.getByRole("radio", { name: "pattern", exact: true }).check();
  await segmentStyle.getByLabel("Pattern for Custom palette style 1").selectOption("dots");
  await segmentStyle.getByLabel("Pattern colour hex for Custom palette style 1").fill("#ABCDEF");
  await segmentStyle.getByRole("button", { name: "Apply style" }).click();
  await appearance.locator(".custom-palette-card .segment-style-action").nth(1).click();
  segmentStyle = page.getByRole("dialog", { name: "Segment style" });
  await segmentStyle.getByLabel("Base colour hex for Custom palette style 2").fill("#445566");
  await segmentStyle.getByRole("button", { name: "Apply style" }).click();
  await appearance.getByLabel("Move custom palette color 2 left").click();
  await appearance.getByLabel("Custom palette accent hex").fill("#ABCDEF");
  assert.equal(
    await preview
      .locator(".wheel-stage")
      .evaluate((node) =>
        getComputedStyle(node).getPropertyValue("--pointer").trim(),
      ),
    "#ABCDEF",
  );
  await page.screenshot({
    path: `${artifacts}/custom-palette-editor-1440.png`,
    fullPage: false,
  });
  await appearance
    .getByRole("button", { name: "Apply custom palette" })
    .click();
  const entrantPreviews = appearance.locator(".entrant-colours .segment-style-preview");
  assert.equal(await entrantPreviews.nth(0).evaluate((node) => getComputedStyle(node).getPropertyValue("--segment-base").trim()), "#445566");
  assert.equal(await entrantPreviews.nth(1).evaluate((node) => getComputedStyle(node).getPropertyValue("--segment-base").trim()), "#112233");
  assert.equal(await entrantPreviews.nth(1).evaluate((node) => node.classList.contains("is-pattern")), true);
  await appearance.locator(".entrant-colours article .segment-style-action").first().click();
  segmentStyle = page.getByRole("dialog", { name: "Segment style" });
  await segmentStyle.getByRole("radio", { name: "solid", exact: true }).check();
  await segmentStyle.getByLabel("Base colour hex for Entrant 1").fill("#FFFFFF");
  await segmentStyle.getByRole("button", { name: "Apply style" }).click();
  assert.equal(await entrantPreviews.nth(0).evaluate((node) => getComputedStyle(node).getPropertyValue("--segment-base").trim()), "#FFFFFF");
  await appearance
    .locator(".entrant-colours article")
    .first()
    .getByRole("button", { name: "Reset" })
    .click();
  assert.equal(await entrantPreviews.nth(0).evaluate((node) => getComputedStyle(node).getPropertyValue("--segment-base").trim()), "#445566");
  await page.screenshot({
    path: `${artifacts}/custom-palette-applied-1440.png`,
    fullPage: false,
  });
  const fixed = await page.evaluate(() => {
    const preview = document.querySelector(".appearance-preview");
    const controls = document.querySelector(".appearance-controls");
    const body = document.querySelector(".appearance-dialog__body");
    const dialog = document.querySelector(".appearance-dialog");
    const header = dialog
      .querySelector(":scope>header")
      .getBoundingClientRect();
    const tabs = dialog
      .querySelector(".appearance-dialog__tabs")
      .getBoundingClientRect();
    const footer = dialog
      .querySelector(":scope>footer")
      .getBoundingClientRect();
    const before = preview.getBoundingClientRect();
    controls.scrollTop = controls.scrollHeight;
    const after = preview.getBoundingClientRect();
    return {
      before: { top: before.top, bottom: before.bottom },
      after: { top: after.top, bottom: after.bottom },
      controlsTop: controls.scrollTop,
      previewTop: preview.scrollTop,
      bodyTop: body.scrollTop,
      dialogTop: dialog.scrollTop,
      fixedChromeVisible:
        header.top >= 0 &&
        tabs.top >= header.bottom - 1 &&
        footer.bottom <= innerHeight + 1,
      bodyOverflowY: getComputedStyle(body).overflowY,
      controlsOverflowY: getComputedStyle(controls).overflowY,
      previewScrollbarHidden:
        getComputedStyle(preview).scrollbarWidth === "none",
      horizontal: {
        dialog:
          document.querySelector(".appearance-dialog").scrollWidth -
          document.querySelector(".appearance-dialog").clientWidth,
        body: body.scrollWidth - body.clientWidth,
        controls: controls.scrollWidth - controls.clientWidth,
      },
    };
  });
  assert.ok(fixed.controlsTop > 250, JSON.stringify(fixed));
  assert.ok(
    Math.abs(fixed.before.top - fixed.after.top) < 1 &&
      Math.abs(fixed.before.bottom - fixed.after.bottom) < 1,
    JSON.stringify(fixed),
  );
  assert.equal(fixed.previewTop, 0);
  assert.equal(fixed.bodyTop, 0);
  assert.equal(fixed.dialogTop, 0);
  assert.equal(fixed.fixedChromeVisible, true, JSON.stringify(fixed));
  assert.equal(fixed.bodyOverflowY, "clip");
  assert.match(fixed.controlsOverflowY, /auto|scroll/);
  assert.equal(fixed.previewScrollbarHidden, true);
  assert.deepEqual(fixed.horizontal, { dialog: 0, body: 0, controls: 0 });
  await page.screenshot({
    path: `${artifacts}/fixed-preview-scrolled-1440.png`,
    fullPage: false,
  });
  await appearance.getByRole("tab", { name: "centre" }).click();
  assert.equal(await controls.evaluate((node) => node.scrollTop), 0);
  const centre = preview.locator(".wheel-stage__hub.is-custom img");
  assert.equal(
    await centre.evaluate((node) => getComputedStyle(node).objectFit),
    "cover",
  );
  assert.equal(
    await centre.evaluate(
      (node) => getComputedStyle(node.parentElement).paddingTop,
    ),
    "0px",
  );
  await page.screenshot({
    path: `${artifacts}/centre-image-cover-1440.png`,
    fullPage: false,
  });
  await appearance.getByRole("tab", { name: "celebration" }).click();
  await appearance.getByText("Fireworks", { exact: true }).waitFor();
  await page.screenshot({
    path: `${artifacts}/celebration-controls-fireworks-1440.png`,
    fullPage: false,
  });
  for (const intensity of ["subtle", "normal", "strong"]) {
    await appearance
      .getByLabel("Celebration intensity")
      .selectOption(intensity);
    await appearance
      .getByRole("button", { name: "Preview celebration" })
      .click();
    const result = page.getByRole("dialog", { name: /Entrant 1/i });
    await result.waitFor();
    const profile = CELEBRATION_PROFILES[intensity];
    assert.equal(
      await page.locator(".winner-confetti i").count(),
      profile.confettiCount,
    );
    assert.equal(
      Number(
        await page
          .locator(".winner-fireworks")
          .getAttribute("data-firework-bursts"),
      ),
      profile.fireworksBursts,
    );
    assert.equal(
      Number(
        await page.locator(".winner-lightshow").getAttribute("data-beam-count"),
      ),
      profile.beamCount,
    );
    await page.waitForTimeout(900);
    await page.screenshot({
      path: `${artifacts}/celebration-${intensity}-1440.png`,
      fullPage: false,
    });
    await page.getByRole("button", { name: "Close result" }).click();
    assert.equal(
      await page
        .locator(".winner-confetti,.winner-fireworks,.winner-lightshow")
        .count(),
      0,
    );
  }
  await appearance
    .getByRole("checkbox", { name: "Fireworks", exact: true })
    .uncheck();
  await appearance.getByRole("button", { name: "Preview celebration" }).click();
  assert.equal(await page.locator(".winner-fireworks").count(), 0);
  await page.getByRole("button", { name: "Close result" }).click();
  await appearance
    .getByRole("checkbox", { name: "Fireworks", exact: true })
    .check();
  assert.deepEqual(
    writes,
    [],
    "appearance and celebration previews perform no writes",
  );
  assert.deepEqual(errors, []);
  await desktop.close();

  const mobile = await context(
    browser,
    { width: 390, height: 844 },
    "no-preference",
  );
  const mobilePage = await mobile.newPage();
  const mobileErrors = monitor(mobilePage);
  await routes(mobilePage);
  await openAppearance(mobilePage);
  const mobileAppearance = mobilePage.getByRole("dialog", {
    name: /Tune the broadcast stage/i,
  });
  await mobileAppearance.getByRole("tab", { name: "celebration" }).click();
  await mobileAppearance
    .getByLabel("Celebration intensity")
    .selectOption("strong");
  const mobileGeometry = await mobilePage.evaluate(() => {
    const controls = document.querySelector(".appearance-controls");
    const preview = document.querySelector(".appearance-preview");
    const footer = document
      .querySelector(".appearance-dialog>footer")
      .getBoundingClientRect();
    controls.scrollTop = controls.scrollHeight;
    return {
      fits:
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
      bodyLocked: document.body.style.overflow === "hidden",
      controlsScrollable:
        controls.scrollHeight > controls.clientHeight && controls.scrollTop > 0,
      previewVisible: preview.getBoundingClientRect().height > 100,
      footerReachable: footer.top >= 0 && footer.bottom <= innerHeight + 1,
      previewScrollbarHidden:
        getComputedStyle(preview).scrollbarWidth === "none",
    };
  });
  assert.deepEqual(mobileGeometry, {
    fits: true,
    bodyLocked: true,
    controlsScrollable: true,
    previewVisible: true,
    footerReachable: true,
    previewScrollbarHidden: true,
  });
  await mobilePage.screenshot({
    path: `${artifacts}/mobile-appearance-390.png`,
    fullPage: false,
  });
  await mobileAppearance
    .getByRole("button", { name: "Preview celebration" })
    .click();
  assert.equal(
    await mobilePage.locator(".winner-confetti i").count(),
    CELEBRATION_PROFILES.strong.confettiCount,
  );
  await mobilePage.waitForTimeout(900);
  await mobilePage.screenshot({
    path: `${artifacts}/mobile-strong-fireworks-390.png`,
    fullPage: false,
  });
  await mobilePage.getByRole("button", { name: "Close result" }).click();
  assert.deepEqual(mobileErrors, []);
  await mobile.close();

  const reduced = await context(browser, { width: 390, height: 844 }, "reduce");
  const reducedPage = await reduced.newPage();
  await routes(reducedPage);
  await openAppearance(reducedPage);
  const reducedAppearance = reducedPage.getByRole("dialog", {
    name: /Tune the broadcast stage/i,
  });
  await reducedAppearance.getByRole("tab", { name: "celebration" }).click();
  await reducedAppearance
    .getByRole("button", { name: "Preview celebration" })
    .click();
  assert.equal(
    await reducedPage
      .locator(
        ".winner-confetti,.winner-fireworks,.winner-lightshow i,.winner-lightshow span",
      )
      .count(),
    0,
  );
  assert.equal(
    await reducedPage.locator(".winner-lightshow.is-static").count(),
    1,
  );
  await reducedPage.getByRole("button", { name: "Close result" }).click();
  await reduced.close();
});

async function openAppearance(page) {
  await page.goto(`${ORIGIN}/wheels/${SLUG}/edit`);
  const editor = page.getByRole("dialog", {
    name: /Edit V1.7 Appearance Fixture/i,
  });
  await editor.waitFor();
  await editor.getByRole("tab", { name: "appearance" }).click();
  await editor.getByRole("button", { name: "Customize appearance" }).click();
  await page
    .getByRole("dialog", { name: /Tune the broadcast stage/i })
    .waitFor();
}
async function context(browser, viewport, reducedMotion) {
  const value = await browser.newContext({ viewport, reducedMotion });
  const now = Date.now();
  await value.addCookies([
    {
      name: "thirdrailify_consent",
      value: encodeURIComponent(
        JSON.stringify({
          version: 1,
          timestamp: new Date(now).toISOString(),
          expiry: new Date(now + 2_592_000_000).toISOString(),
          categories: { preferences: false, externalMedia: false },
        }),
      ),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  return value;
}
function monitor(page) {
  const errors = [];
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(entry.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
async function routes(page) {
  await page.route("**/wheel-media/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#112233"/><circle cx="800" cy="450" r="180" fill="#F3C928"/></svg>',
    }),
  );
  await page.route("**/api/**", respond);
}
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
      csrfToken: "v17-fixture",
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
        createdAt: "2026-08-30T00:00:00.000Z",
        source: "test",
      },
    });
  if (url.pathname === "/api/wheels/access")
    return json(route, {
      ok: true,
      authenticated: true,
      canCreate: true,
      isMasterAdmin: false,
      maximumOwnedWheels: 20,
    });
  if (url.pathname === "/api/wheels")
    return json(route, { ok: true, items: [], count: 0 });
  if (url.pathname === `/api/wheels/${SLUG}`) return json(route, payload());
  return json(route, { ok: true });
}
function payload() {
  const entries = Array.from({ length: 7 }, (_, index) => ({
    id: `entry-${index}`,
    label: `Entrant ${index + 1}`,
    order: index,
    weight: 1,
    colour: null,
    state: "active",
  }));
  return {
    ok: true,
    wheel: {
      slug: SLUG,
      title: "V1.7 Appearance Fixture",
      description: "Local non-mutating acceptance fixture",
      lifecycle: "active",
      visibility: "public",
      participantCount: entries.length,
      weighted: false,
      entries,
      config: {
        themePreset: "third-rail-gold",
        palette: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"],
        pointerAccent: "#F3C928",
        centreTreatment: "bolt",
        backgroundIntensity: "high",
        labelContrast: "light",
        spinDurationMs: 2000,
        tickingSoundEnabled: false,
        winnerSoundEnabled: false,
        celebrationEnabled: true,
        confettiEnabled: true,
        fireworksEnabled: true,
        winnerLightingEnabled: true,
        celebrationIntensity: "normal",
        backgroundEnabled: true,
        backgroundFocalX: 50,
        backgroundFocalY: 50,
        backgroundImageOpacity: 72,
        backgroundOverlayIntensity: 58,
        winnerMessageTemplate: "Signal locked: {winner}",
        publicHistoryVisible: true,
      },
      media: {
        background: null,
        centre: {
          id: "centre-v17",
          purpose: "centre",
          url: `${ORIGIN}/wheel-media/centre.svg`,
          contentType: "image/svg+xml",
          byteSize: 180,
          width: 1600,
          height: 900,
          sha256: "fixture",
          createdAt: "2026-08-30T00:00:00.000Z",
        },
      },
      demoEnabled: true,
      officialEnabled: false,
      latestOfficialResult: null,
      recentOfficialResults: [],
      revision: 7,
    },
    access: {
      role: "editor",
      isMasterAdmin: false,
      canEdit: true,
      canSpinOfficially: false,
      editingLocked: false,
      officialSpinLocked: false,
      revision: 7,
    },
  };
}
function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}
async function waitForPreview() {
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
