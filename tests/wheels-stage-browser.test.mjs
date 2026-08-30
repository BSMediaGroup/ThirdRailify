import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_STAGE_ORIGIN || "http://127.0.0.1:4198";
const LOCAL = !process.env.WHEELS_STAGE_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS =
  process.env.WHEELS_STAGE_ARTIFACTS ||
  join(tmpdir(), "thirdrailify-wheels-stage-v1");

test("Stage overview and focus remain wide, circular, contained, and isolated across one to six Wheels", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  let server;
  if (LOCAL) {
    server = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "preview",
        "--host",
        "127.0.0.1",
        "--port",
        "4198",
      ],
      { stdio: "ignore" },
    );
    t.after(() => server.kill());
    await waitForPreview();
  }
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });
  t.after(() => browser.close());
  const matrix = [];
  for (const surface of [
    { count: 1, width: 1920, height: 1080 },
    { count: 3, width: 1920, height: 1080 },
    { count: 6, width: 1920, height: 1080 },
    { count: 6, width: 3440, height: 1440 },
    { count: 6, width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: surface.width, height: surface.height },
      reducedMotion: "no-preference",
    });
    await consent(context);
    const page = await context.newPage();
    const errors = [];
    page.on("console", (entry) => {
      if (entry.type() === "error") errors.push(entry.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await routes(page);
    await page.goto(`${ORIGIN}/wheels/stages/stage-${surface.count}`, {
      waitUntil: "networkidle",
    });
    await page.locator(".stage-wheel-tile").first().waitFor();
    const geometry = await page.evaluate(() => {
      const surfaceNode = document.querySelector(".stage-surface");
      const surface = surfaceNode.getBoundingClientRect();
      const tiles = [...document.querySelectorAll(".stage-wheel-tile")].map(
        (node) => node.getBoundingClientRect().toJSON(),
      );
      const wheels = [
        ...document.querySelectorAll(".stage-wheel-tile .wheel-stage"),
      ].map((node) => node.getBoundingClientRect().toJSON());
      return {
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        surface: surface.toJSON(),
        surfaceScrollHeight: surfaceNode.scrollHeight,
        surfaceClientHeight: surfaceNode.clientHeight,
        tiles,
        wheels,
      };
    });
    assert.equal(geometry.tiles.length, surface.count);
    assert.ok(
      geometry.overflow <= 1 &&
        geometry.surface.top < 100 &&
        geometry.surface.bottom <= surface.height + 1 &&
        (surface.width >= 520 ||
          geometry.surfaceScrollHeight > geometry.surfaceClientHeight),
      JSON.stringify({ surface, geometry }),
    );
    for (const tile of geometry.tiles)
      assert.ok(
        tile.left >= geometry.surface.left - 1 &&
          tile.right <= geometry.surface.right + 1 &&
          (surface.width < 520 ||
            (tile.top >= geometry.surface.top - 1 &&
              tile.bottom <= geometry.surface.bottom + 1)),
        JSON.stringify({ surface, tile, shell: geometry.surface }),
      );
    for (const wheel of geometry.wheels)
      assert.ok(
        Math.abs(wheel.width - wheel.height) <= 1 &&
          (surface.width >= 520 || wheel.width >= 250),
        JSON.stringify({ surface, wheel }),
      );
    for (let left = 0; left < geometry.tiles.length; left += 1)
      for (let right = left + 1; right < geometry.tiles.length; right += 1)
        assert.equal(
          overlap(geometry.tiles[left], geometry.tiles[right]),
          false,
          JSON.stringify({
            surface,
            left: geometry.tiles[left],
            right: geometry.tiles[right],
          }),
        );
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: join(
        ARTIFACTS,
        `stage-${surface.count}-${surface.width}x${surface.height}.png`,
      ),
      fullPage: false,
    });
    matrix.push({ ...surface, geometry });
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "no-preference",
  });
  await consent(context);
  const page = await context.newPage();
  await routes(page);
  await page.goto(`${ORIGIN}/wheels/stages/stage-6`);
  await page.getByRole("button", { name: "Focus Fixture Wheel 1" }).click();
  await page.locator(".stage-focused-wheel").waitFor();
  const focus = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    dpad: Boolean(document.querySelector(".stage-dpad")),
    wheel: document
      .querySelector(".stage-focused-wheel .wheel-stage")
      .getBoundingClientRect()
      .toJSON(),
    query: location.search,
  }));
  assert.ok(
    focus.overflow <= 1 &&
      focus.dpad &&
      Math.abs(focus.wheel.width - focus.wheel.height) <= 1,
  );
  assert.equal(focus.query, "?focus=1");
  await page.screenshot({ path: join(ARTIFACTS, "stage-focus-1920x1080.png") });
  await page
    .getByRole("button", { name: /Overview/ })
    .first()
    .click();
  await page.locator(".stage-overview").waitFor();
  await context.close();
  const settledContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await consent(settledContext);
  const settledPage = await settledContext.newPage();
  await routes(settledPage);
  await settledPage.goto(`${ORIGIN}/wheels/stages/stage-6?focus=1`, {
    waitUntil: "networkidle",
  });
  await settledPage.locator(".stage-focused-wheel").waitFor();
  await settledPage.screenshot({
    path: join(ARTIFACTS, "stage-focus-settled-1920x1080.png"),
  });
  await settledContext.close();
  const exportContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await consent(exportContext);
  const exportPage = await exportContext.newPage();
  await routes(exportPage);
  await exportPage.goto(`${ORIGIN}/wheels/stages/stage-1/edit`, {
    waitUntil: "networkidle",
  });
  await exportPage
    .getByRole("dialog", { name: "Edit Fixture 1-Wheel Stage" })
    .waitFor();
  const downloadReady = exportPage.waitForEvent("download");
  await exportPage.getByRole("button", { name: "Download .tws" }).click();
  const download = await downloadReady;
  assert.match(download.suggestedFilename(), /\.tws$/i);
  await exportContext.close();
  const importFixture = {
    name: "Wheel-June-3.wheel",
    mimeType: "application/json",
    buffer: await readFile(
      new URL(
        "./fixtures/wheel-of-names-two-config-sanitized.wheel",
        import.meta.url,
      ),
    ),
  };
  const editorContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await consent(editorContext);
  const editorPage = await editorContext.newPage();
  const mutations = [];
  editorPage.on("request", (request) => {
    if (
      ["POST", "PUT", "DELETE"].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith("/api/wheels")
    )
      mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
  });
  await routes(editorPage);
  await editorPage.goto(`${ORIGIN}/wheels/stages/stage-1/edit`, {
    waitUntil: "networkidle",
  });
  await editorPage
    .getByRole("dialog", { name: "Edit Fixture 1-Wheel Stage" })
    .waitFor();
  await editorPage.getByRole("button", { name: "Import wheel" }).click();
  const importDialog = editorPage.getByRole("dialog", {
    name: "Import Wheels or Stage",
  });
  await importDialog.waitFor();
  assert.equal(await importDialog.locator(".stage-import-drop").count(), 1);
  await importDialog.locator('input[type="file"]').setInputFiles(importFixture);
  const manifest = importDialog.getByLabel("Pending Wheel import preview");
  await manifest.waitFor();
  assert.equal(await importDialog.locator(".stage-import-drop").count(), 0);
  assert.equal(await manifest.locator(".stage-import-wheel-icon").count(), 2);
  await manifest.getByText("Wheel-aug29", { exact: true }).waitFor();
  await manifest
    .getByText("Wheel-June 3 — Wheel 02", { exact: true })
    .waitFor();
  await importDialog
    .getByText("Preview created zero records.", { exact: false })
    .waitFor();
  const includeButton = manifest.locator("article").first().getByRole("button");
  await includeButton.click();
  await importDialog.getByText("1 / 2 selected", { exact: true }).waitFor();
  await includeButton.click();
  await importDialog.getByText("2 / 2 selected", { exact: true }).waitFor();
  await editorPage.bringToFront();
  await editorPage.waitForTimeout(250);
  assert.deepEqual(mutations, []);
  await editorPage.screenshot({
    path: join(ARTIFACTS, "stage-editor-multi-import-1440x1000.png"),
  });
  await editorContext.close();
  const mobileEditorContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await consent(mobileEditorContext);
  const mobileEditorPage = await mobileEditorContext.newPage();
  const mobileMutations = [];
  mobileEditorPage.on("request", (request) => {
    if (
      ["POST", "PUT", "DELETE"].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith("/api/wheels")
    )
      mobileMutations.push(
        `${request.method()} ${new URL(request.url()).pathname}`,
      );
  });
  await routes(mobileEditorPage);
  await mobileEditorPage.goto(`${ORIGIN}/wheels/stages/stage-1/edit`, {
    waitUntil: "networkidle",
  });
  await mobileEditorPage
    .getByRole("dialog", { name: "Edit Fixture 1-Wheel Stage" })
    .waitFor();
  await mobileEditorPage.getByRole("button", { name: "Import wheel" }).click();
  const mobileImportDialog = mobileEditorPage.getByRole("dialog", {
    name: "Import Wheels or Stage",
  });
  await mobileImportDialog
    .locator('input[type="file"]')
    .setInputFiles(importFixture);
  await mobileImportDialog.getByLabel("Pending Wheel import preview").waitFor();
  assert.equal(
    await mobileImportDialog.locator(".stage-import-wheel-icon").count(),
    2,
  );
  assert.ok(
    (await mobileEditorPage.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )) <= 1,
  );
  assert.deepEqual(mobileMutations, []);
  await mobileEditorPage.screenshot({
    path: join(ARTIFACTS, "stage-editor-multi-import-390x844.png"),
  });
  await mobileEditorContext.close();
  const wide = [];
  for (const surface of [
    { mode: "detail", width: 1920, height: 1080 },
    { mode: "detail", width: 1440, height: 900 },
    { mode: "present", width: 1920, height: 1080 },
    { mode: "present", width: 3440, height: 1440 },
  ]) {
    const wideContext = await browser.newContext({
      viewport: { width: surface.width, height: surface.height },
    });
    await consent(wideContext);
    const widePage = await wideContext.newPage();
    await routes(widePage);
    await widePage.goto(
      `${ORIGIN}/wheels/fixture-wheel-1${surface.mode === "present" ? "/present" : ""}`,
      { waitUntil: "networkidle" },
    );
    await widePage.locator(".wheel-stage canvas").first().waitFor();
    const geometry = await widePage.evaluate((mode) => {
      const shell = document
        .querySelector(
          mode === "present" ? ".wheel-presentation-layout" : ".wheel-scene",
        )
        .getBoundingClientRect();
      const wheel = document
        .querySelector(".wheel-stage")
        .getBoundingClientRect();
      return {
        shell: shell.toJSON(),
        wheel: wheel.toJSON(),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    }, surface.mode);
    assert.ok(
      geometry.overflow <= 1 &&
        Math.abs(geometry.wheel.width - geometry.wheel.height) <= 1,
    );
    if (surface.mode === "detail" && surface.width === 1920)
      assert.ok(
        geometry.shell.width > 1600 && geometry.shell.width <= 1721,
        JSON.stringify(geometry),
      );
    if (surface.mode === "present")
      assert.ok(geometry.shell.width <= 1921, JSON.stringify(geometry));
    await widePage.screenshot({
      path: join(
        ARTIFACTS,
        `${surface.mode}-${surface.width}x${surface.height}.png`,
      ),
    });
    wide.push({ ...surface, geometry });
    await wideContext.close();
  }
  await writeFile(
    join(ARTIFACTS, "stage-geometry.json"),
    JSON.stringify({ origin: ORIGIN, matrix, focus, wide }, null, 2),
  );
});

function overlap(a, b) {
  return (
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
  );
}
async function routes(page) {
  if (!LOCAL) {
    await page.route("**/wheels/stages/stage-*", async (route) => {
      if (route.request().resourceType() !== "document")
        return route.continue();
      const response = await fetch(`${ORIGIN}/index.html`);
      return route.fulfill({
        status: response.status,
        contentType: "text/html; charset=utf-8",
        body: await response.text(),
      });
    });
  }
  await page.route("**/api/**", (route) => respond(route));
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
      csrfToken: "stage-fixture",
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
        createdAt: "2026-08-30T00:00:00Z",
        source: "test",
      },
    });
  if (url.pathname === "/api/wheels/access")
    return json(route, {
      ok: true,
      authenticated: true,
      canCreate: true,
      maximumOwnedWheels: 20,
      ownedWheelCount: 6,
      maximumOwnedStages: 20,
      ownedStageCount: 1,
    });
  if (url.pathname === "/api/wheels/stages/lookup")
    return json(route, {
      ok: true,
      items: Array.from({ length: 6 }, (_, index) => ({
        slug: `fixture-wheel-${index + 1}`,
        title: `Fixture Wheel ${index + 1}`,
        participantCount: 8,
        visibility: "public",
        lifecycle: "active",
        availability: "owned",
        capability: "owner",
        palette: wheel(index).config.palette,
        updatedAt: "2026-08-30T00:00:00Z",
      })),
      count: 6,
    });
  const match = url.pathname.match(/^\/api\/wheels\/stages\/stage-([1-6])$/);
  if (match) return json(route, stagePayload(Number(match[1])));
  if (url.pathname === "/api/wheels/fixture-wheel-1")
    return json(route, {
      ok: true,
      wheel: wheel(0),
      access: {
        role: "editor",
        isMasterAdmin: false,
        canEdit: true,
        canSpinOfficially: false,
        editingLocked: false,
        officialSpinLocked: false,
        revision: 1,
      },
    });
  if (url.pathname === "/api/wheels")
    return json(route, {
      ok: true,
      items: [
        {
          slug: "fixture-wheel-1",
          title: "Fixture Wheel 1",
          description: "Stage fixture",
          participantCount: 8,
          weighted: false,
          themePreset: "custom",
          palette: ["#f3c928", "#b8182f", "#f3f0e5"],
          demoEnabled: true,
          officialEnabled: false,
          latestOfficialAt: null,
        },
      ],
      count: 1,
    });
  if (url.pathname === "/api/wheels/stages")
    return json(route, { ok: true, items: [], count: 0 });
  return json(route, { ok: true });
}
function stagePayload(count) {
  return {
    ok: true,
    stage: {
      slug: `stage-${count}`,
      title: `Fixture ${count}-Wheel Stage`,
      description: "Local visual acceptance fixture",
      visibility: "public",
      lifecycle: "active",
      revision: 1,
      updatedAt: "2026-08-30T00:00:00Z",
      wheels: Array.from({ length: count }, (_, position) => ({
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
function wheel(index) {
  const palette = [
    ["#f3c928", "#b8182f", "#f3f0e5"],
    ["#0d6f73", "#f3c928", "#171712"],
    ["#6d3a93", "#f3c928", "#b8182f"],
  ][index % 3];
  return {
    slug: `fixture-wheel-${index + 1}`,
    title: `Fixture Wheel ${index + 1}`,
    description: "Stage fixture",
    lifecycle: "active",
    visibility: "public",
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
      labelContrast: "auto",
      spinDurationMs: 3000,
      tickingSoundEnabled: false,
      spinSoundPreset: "silent",
      winnerSoundEnabled: false,
      winnerSoundPreset: "silent",
      celebrationEnabled: true,
      confettiEnabled: true,
      fireworksEnabled: true,
      winnerLightingEnabled: true,
      celebrationIntensity: "normal",
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
      url: ORIGIN,
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
async function waitForPreview() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(ORIGIN)).ok) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Vite preview did not start.");
}
