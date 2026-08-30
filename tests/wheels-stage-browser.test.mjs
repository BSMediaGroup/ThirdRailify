import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { chromium } from "playwright-core";
import { entryAtPointer, spinPlan } from "../src/wheels/engine.mjs";

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
  const directoryContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await consent(directoryContext);
  const directoryPage = await directoryContext.newPage();
  await routes(directoryPage);
  await directoryPage.goto(`${ORIGIN}/wheels`, { waitUntil: "networkidle" });
  await directoryPage.locator(".wheel-card").first().waitFor();
  const cards = await directoryPage.locator(".wheel-card").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON()));
  assert.equal(cards.length, 2); assert.ok(Math.abs(cards[0].width - cards[1].width) <= 1); assert.ok(Math.abs(cards[0].height - cards[1].height) <= 1);
  assert.equal(await directoryPage.locator(".wheel-card--featured").count(), 0); assert.equal(await directoryPage.locator(".wheel-card--stage .stage-card__emblem>i").count(), 3);
  await directoryPage.screenshot({ path: join(ARTIFACTS, "directory-unified-cards-1440x900.png"), fullPage: true });
  await directoryContext.close();
  const matrix = [];
  for (const surface of [
    { count: 1, width: 1920, height: 1080 },
    { count: 2, width: 1920, height: 1080 },
    { count: 3, width: 1920, height: 1080 },
    { count: 4, width: 1920, height: 1080 },
    { count: 5, width: 1920, height: 1080 },
    { count: 6, width: 1920, height: 1080 },
    { count: 6, width: 2560, height: 1440 },
    { count: 6, width: 3440, height: 1440 },
    { count: 6, width: 1440, height: 900 },
    { count: 6, width: 1365, height: 768 },
    { count: 6, width: 768, height: 1024 },
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
    if (surface.width === 1920) {
      const renderedRows = [...new Set(geometry.tiles.map((tile) => Math.round(tile.top)))].map((top) => geometry.tiles.filter((tile) => Math.abs(tile.top - top) <= 1).length);
      assert.deepEqual(renderedRows, [[1], [2], [3], [2, 2], [3, 2], [3, 3]][surface.count - 1]);
    }
    assert.equal(await page.locator('[aria-label^="Wheel owner and access details"]').count(), surface.count);
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
          (surface.width >= 520 || wheel.width >= 230 && wheel.width <= geometry.surface.width * .72),
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
    if (surface.count === 6 && surface.width === 1920) {
      await page.locator('[aria-label^="Wheel owner and access details"]').first().click();
      const ownerPanel = page.getByRole("dialog", { name: /ownership and permissions/ });
      await ownerPanel.waitFor(); await ownerPanel.getByText("Fixture Owner", { exact: true }).waitFor();
      assert.equal(await ownerPanel.locator(".wheel-owner__avatar img").count(), 1);
      await page.screenshot({ path: join(ARTIFACTS, "stage-owner-details-1920x1080.png") });
      await ownerPanel.getByRole("button", { name: "Close ownership details" }).click();
    }
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
    { mode: "detail", width: 390, height: 844 },
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
    const ownerTrigger = widePage.getByRole("button", { name: /Wheel owner and access details/ });
    await ownerTrigger.waitFor();
    if (surface.width === 1920) {
      await ownerTrigger.click();
      const ownerPanel = widePage.getByRole("dialog", { name: /ownership and permissions/ });
      await ownerPanel.waitFor(); await ownerPanel.getByText("Fixture Owner", { exact: true }).waitFor();
      if (surface.mode === "detail") await widePage.screenshot({ path: join(ARTIFACTS, "wheel-owner-details-1920x1080.png") });
      await ownerPanel.getByRole("button", { name: "Close ownership details" }).click();
    }
    const geometry = await widePage.evaluate((mode) => {
      const shell = document
        .querySelector(
          mode === "present" ? ".wheel-presentation-layout" : ".wheel-scene",
        )
        .getBoundingClientRect();
      const wheel = document
        .querySelector(".wheel-stage")
        .getBoundingClientRect();
      const actionGroup = document.querySelector(
        ".wheel-control-heading__actions",
      );
      const actions = actionGroup
        ? {
            group: actionGroup.getBoundingClientRect().toJSON(),
            items: [...actionGroup.children].map((node) =>
              node.getBoundingClientRect().toJSON(),
            ),
          }
        : null;
      return {
        shell: shell.toJSON(),
        wheel: wheel.toJSON(),
        actions,
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
    if (surface.mode === "detail") {
      assert.equal(geometry.actions.items.length, 4, JSON.stringify(geometry));
      assert.ok(
        geometry.actions.group.width <=
          (surface.width > 620 ? 249 : surface.width - 27),
        JSON.stringify(geometry),
      );
      assert.equal(
        new Set(geometry.actions.items.map((item) => Math.round(item.left))).size,
        2,
        JSON.stringify(geometry),
      );
      assert.equal(
        new Set(geometry.actions.items.map((item) => Math.round(item.top))).size,
        2,
        JSON.stringify(geometry),
      );
      assert.ok(
        geometry.actions.items.every(
          (item) => Math.abs(item.width - geometry.actions.items[0].width) <= 1,
        ),
        JSON.stringify(geometry),
      );
    }
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

test("V1.10 natural landings and Stage Spin All coordinate, settle, celebrate, and restore focus", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  let server;
  if (LOCAL) {
    server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4198"], { stdio: "ignore" });
    t.after(() => server.kill());
    await waitForPreview();
  }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  const landingContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await consent(landingContext);
  const landingPage = await landingContext.newPage();
  await routes(landingPage);
  await landingPage.goto(`${ORIGIN}/wheels/fixture-wheel-1`, { waitUntil: "networkidle" });
  const fixture = wheel(0);
  const winner = fixture.entries[2];
  const landingProof = [];
  for (const fraction of [.02, .25, .51, .75, .98]) {
    const plan = spinPlan(fixture.entries, winner.id, 3000, 0, { landingFraction: fraction, turnRandom: .4 });
    assert.equal(entryAtPointer(fixture.entries, plan.finalRotation)?.id, winner.id);
    await landingPage.evaluate(({ landingValue }) => {
      const cryptoObject = window.crypto;
      window.__wheelV110OriginalRandomValues ||= cryptoObject.getRandomValues.bind(cryptoObject);
      const values = [2, landingValue, Math.floor(.4 * 0x100000000)];
      Object.defineProperty(cryptoObject, "getRandomValues", { configurable: true, value(array) { if (array instanceof Uint32Array && values.length) { array[0] = values.shift(); return array; } return window.__wheelV110OriginalRandomValues(array); } });
    }, { landingValue: Math.floor(fraction * 0x100000000) });
    await landingPage.getByRole("button", { name: "Start demo spin" }).click();
    const winnerDialog = landingPage.getByRole("dialog");
    await winnerDialog.waitFor();
    if (fraction === .51)
      await winnerDialog.screenshot({ path: join(ARTIFACTS, "natural-single-winner-dialog.png") });
    await winnerDialog.getByRole("button", { name: "Close result" }).click();
    await winnerDialog.waitFor({ state: "detached" });
    await landingPage.locator(".pointer-target-hud strong").getByText(winner.label, { exact: true }).waitFor();
    await landingPage.locator(".wheel-visual-wrap").scrollIntoViewIfNeeded();
    const name = `natural-same-winner-${String(Math.round(fraction * 100)).padStart(2, "0")}.png`;
    await landingPage.locator(".wheel-control-layout").screenshot({ path: join(ARTIFACTS, name) });
    const metrics = await landingPage.locator(".wheel-stage canvas").evaluate((canvas) => canvas.__wheelSpinV110);
    assert.equal(metrics.completed, true);
    assert.ok(Math.abs(metrics.actualFinalFrameDelta - metrics.expectedFinalFrameDelta) < .001);
    landingProof.push({ fraction, winnerId: winner.id, rotation: metrics.finalRotation, artifact: name });
  }
  await landingContext.close();

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await consent(context);
  const page = await context.newPage();
  const errors = [];
  const practiceSpinAllRequests = [];
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.url().includes("/spin-all")) practiceSpinAllRequests.push(request.url()); });
  await routes(page);
  await page.goto(`${ORIGIN}/wheels/stages/stage-6`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Fullscreen/ }).click();
  await page.waitForFunction(() => document.fullscreenElement?.classList.contains("wheel-stage-page"));
  await page.getByRole("button", { name: "SPIN ALL", exact: true }).click();
  await page.locator('[data-stage-spin-phase="spinning_all"]').waitFor();
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(ARTIFACTS, "spin-all-6-early-1920x1080.png") });
  await page.waitForTimeout(1050);
  await page.screenshot({ path: join(ARTIFACTS, "spin-all-6-mid-1920x1080.png") });
  await page.waitForFunction(() => document.querySelectorAll('[data-spin-substate="settled"]').length > 0 && document.querySelectorAll('[data-spin-substate="spinning"]').length > 0);
  await page.screenshot({ path: join(ARTIFACTS, "spin-all-6-partial-settlement-1920x1080.png") });
  await page.waitForFunction(() => document.querySelectorAll('[data-spin-substate="settled"]').length === 6);
  await page.screenshot({ path: join(ARTIFACTS, "spin-all-6-all-settled-before-modal-1920x1080.png") });
  const dialog = page.getByRole("dialog", { name: "WINNERS LOCKED." });
  await dialog.waitFor();
  assert.equal(await dialog.locator(".stage-results-grid article").count(), 6);
  assert.equal(await page.locator(".winner-dialog").count(), 1, "Spin All opens one combined dialog");
  assert.equal(await dialog.getByText("PRACTICE · NOT RECORDED", { exact: true }).count(), 6);
  const portalAndEffects = await page.evaluate(() => {
    const root = document.querySelector(".wheel-stage-page");
    const modal = document.querySelector(".stage-results-backdrop");
    return {
      portalInsideRoot: Boolean(root && modal && root.contains(modal)),
      fullscreenContainsModal: Boolean(document.fullscreenElement?.contains(modal)),
      confetti: Boolean(modal?.querySelector(".winner-confetti")),
      fireworks: Boolean(modal?.querySelector("canvas")),
      lighting: Boolean(modal?.querySelector(".winner-lightshow")),
    };
  });
  assert.deepEqual(portalAndEffects, { portalInsideRoot: true, fullscreenContainsModal: true, confetti: true, fireworks: true, lighting: true });
  const metrics = await page.locator(".stage-wheel-tile canvas").evaluateAll((canvases) => canvases.map((canvas) => canvas.__wheelSpinV110));
  assert.equal(metrics.length, 6);
  assert.ok(Math.max(...metrics.map((item) => item.firstFrameAt)) - Math.min(...metrics.map((item) => item.firstFrameAt)) <= 32, JSON.stringify(metrics));
  assert.deepEqual(metrics.map((item) => item.durationMs), [2000, 2500, 3000, 3500, 4000, 4500]);
  assert.ok(metrics.every((item) => item.completed && item.frameCount > 10 && Math.abs(item.actualFinalFrameDelta - item.expectedFinalFrameDelta) < .001), JSON.stringify(metrics));
  assert.deepEqual(practiceSpinAllRequests, [], "Practice Spin All performs no server mutation");
  assert.ok(await dialog.getByText("Shared Winner", { exact: true }).count() >= 2, "duplicate labels remain separate Wheel results");
  await page.screenshot({ path: join(ARTIFACTS, "spin-all-6-combined-fullscreen-1920x1080.png") });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".stage-results-dialog"));
  await page.waitForFunction(() => document.activeElement?.classList.contains("stage-spin-all-trigger"));
  assert.deepEqual(errors, []);
  await context.close();

  const durationContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await consent(durationContext);
  const durationPage = await durationContext.newPage();
  await routes(durationPage);
  await durationPage.goto(`${ORIGIN}/wheels/stages/stage-3`, { waitUntil: "networkidle" });
  await durationPage.getByRole("button", { name: "SPIN ALL", exact: true }).click();
  await durationPage.waitForFunction(() => document.querySelectorAll('[data-spin-substate="settled"]').length === 1);
  assert.equal(await durationPage.locator('[data-spin-substate="spinning"]').count(), 2);
  await durationPage.waitForFunction(() => document.querySelectorAll('[data-spin-substate="settled"]').length === 2);
  assert.equal(await durationPage.locator('[data-spin-substate="spinning"]').count(), 1);
  await durationPage.waitForFunction(() => document.querySelectorAll('[data-spin-substate="settled"]').length === 3);
  await durationPage.getByRole("dialog", { name: "WINNERS LOCKED." }).waitFor();
  const durationMetrics = await durationPage.locator(".stage-wheel-tile canvas").evaluateAll((canvases) => canvases.map((canvas) => canvas.__wheelSpinV110));
  assert.deepEqual(durationMetrics.map((item) => item.durationMs), [3000, 5000, 7000]);
  assert.ok(durationMetrics[0].settledAt < durationMetrics[1].settledAt && durationMetrics[1].settledAt < durationMetrics[2].settledAt);
  await durationContext.close();

  for (const resultSurface of [
    { count: 1, width: 2560, height: 1440 },
    { count: 2, width: 1365, height: 768 },
    { count: 6, width: 768, height: 1024 },
  ]) {
    const resultContext = await browser.newContext({ viewport: { width: resultSurface.width, height: resultSurface.height }, reducedMotion: "reduce" });
    await consent(resultContext);
    const resultPage = await resultContext.newPage();
    await routes(resultPage);
    await resultPage.goto(`${ORIGIN}/wheels/stages/stage-${resultSurface.count}`, { waitUntil: "networkidle" });
    await resultPage.getByRole("button", { name: "SPIN ALL", exact: true }).click();
    const resultDialog = resultPage.getByRole("dialog", { name: "WINNERS LOCKED." });
    await resultDialog.waitFor();
    assert.equal(await resultDialog.locator(".stage-results-grid article").count(), resultSurface.count);
    assert.ok(await resultPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1));
    await resultPage.screenshot({ path: join(ARTIFACTS, `spin-all-${resultSurface.count}-combined-${resultSurface.width}x${resultSurface.height}.png`) });
    await resultContext.close();
  }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await consent(mobileContext);
  const mobilePage = await mobileContext.newPage();
  await routes(mobilePage);
  await mobilePage.goto(`${ORIGIN}/wheels/stages/stage-6`, { waitUntil: "networkidle" });
  await mobilePage.getByRole("button", { name: "SPIN ALL", exact: true }).click();
  const mobileDialog = mobilePage.getByRole("dialog", { name: "WINNERS LOCKED." });
  await mobileDialog.waitFor();
  assert.equal(await mobileDialog.locator(".stage-results-grid article").count(), 6);
  assert.equal(await mobilePage.locator(".winner-confetti, .stage-results-backdrop canvas, .winner-lightshow i, .winner-lightshow span").count(), 0, "reduced motion removes travelling effects");
  assert.ok(await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1));
  await mobilePage.screenshot({ path: join(ARTIFACTS, "spin-all-6-combined-mobile-390x844.png") });
  await mobileDialog.getByRole("button", { name: "Close Stage results" }).click();
  await mobileContext.close();

  const officialRequests = [];
  const officialContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await consent(officialContext);
  const officialPage = await officialContext.newPage();
  officialPage.on("request", (request) => { if (request.url().includes("/spin-all")) officialRequests.push(request.postDataJSON()); });
  await routes(officialPage, { official: true });
  await officialPage.goto(`${ORIGIN}/wheels/stages/stage-6`, { waitUntil: "networkidle" });
  await officialPage.getByRole("button", { name: "OFFICIAL ALL", exact: true }).click();
  await officialPage.getByRole("button", { name: "SPIN ALL", exact: true }).click();
  const officialDialog = officialPage.getByRole("dialog", { name: "WINNERS LOCKED." });
  await officialDialog.waitFor();
  assert.equal(officialRequests.length, 1);
  assert.equal(await officialDialog.getByText("OFFICIAL · RECORDED", { exact: true }).count(), 6);
  await officialPage.screenshot({ path: join(ARTIFACTS, "spin-all-6-combined-official-1440x900.png") });
  await officialContext.close();

  await writeFile(join(ARTIFACTS, "wheels-v110-acceptance.json"), JSON.stringify({ origin: ORIGIN, landingProof, metrics, durationMetrics, portalAndEffects }, null, 2));
});

function overlap(a, b) {
  return (
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
  );
}
async function routes(page, options = {}) {
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
  await page.route("**/api/**", (route) => respond(route, options));
}
async function respond(route, options = {}) {
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
  const batchMatch = url.pathname.match(/^\/api\/wheels\/stages\/stage-([1-6])\/spin-all$/);
  if (batchMatch && options.official) {
    const count = Number(batchMatch[1]);
    return json(route, { ok: true, mode: "official", idempotent: false, results: Array.from({ length: count }, (_, position) => { const selected = wheel(position, stageDuration(count, position), true); const entry = selected.entries[position % selected.entries.length]; return { position, wheelSlug: selected.slug, wheelTitle: selected.title, spin: { id: `10000000-0000-4000-8000-${String(position + 1).padStart(12, "0")}`, winningEntryId: entry.id, winningLabel: entry.label, winningWeight: entry.weight, wheelRevision: 1, snapshotHash: `snapshot-${position}`, createdAt: "2026-08-31T00:00:00Z", animationPlan: { version: "spin-plan-v1", landingFraction: [.02, .17, .51, .84, .98, .36][position], turnRandom: [.11, .23, .35, .47, .59, .71][position] } } }; }) });
  }
  const match = url.pathname.match(/^\/api\/wheels\/stages\/stage-([1-6])$/);
  if (match) return json(route, stagePayload(Number(match[1]), options));
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
    return json(route, { ok: true, items: [{ type: "stage", slug: "stage-2", title: "Fixture Two-Wheel Stage", description: "A compact Stage listing fixture", wheelCount: 2, visibility: "public", wheels: [wheelSummary(0, 0), wheelSummary(1, 1)], updatedAt: "2026-08-31T00:00:00Z" }], count: 1 });
  return json(route, { ok: true });
}
function stagePayload(count, options = {}) {
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
        wheel: wheel(position, stageDuration(count, position), options.official),
        access: {
          role: "editor",
          isMasterAdmin: false,
          canEdit: true,
          canSpinOfficially: Boolean(options.official),
          editingLocked: false,
          officialSpinLocked: false,
          revision: 1,
        },
      })),
    },
    access: { isOwner: true, isMasterAdmin: false, canEdit: true, revision: 1 },
  };
}
function stageDuration(count, position) {
  if (count === 3) return [3000, 5000, 7000][position];
  if (count === 6) return 2000 + position * 500;
  return 3000;
}
function wheel(index, duration = 3000, official = false) {
  const palette = [
    ["#f3c928", "#b8182f", "#f3f0e5"],
    ["#0d6f73", "#f3c928", "#171712"],
    ["#6d3a93", "#f3c928", "#b8182f"],
  ][index % 3];
  return {
    slug: `fixture-wheel-${index + 1}`,
    title: index === 5 ? "Fixture Wheel 6 With A Deliberately Long Broadcast Title" : `Fixture Wheel ${index + 1}`,
    description: "Stage fixture",
    lifecycle: "active",
    visibility: "public",
    owner: { displayName: "Fixture Owner", avatarUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23f3c928'/%3E%3C/svg%3E" },
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    participantCount: 8,
    weighted: false,
    entries: Array.from({ length: 8 }, (_, order) => ({
      id: `00000000-0000-4000-8${String(index).padStart(3, "0")}-${String(order + 1).padStart(12, "0")}`,
      label: index === 3 || index === 4
        ? "Shared Winner"
        : index === 5
          ? `A Deliberately Long Winner Label Number ${order + 1} For Broadcast`
          : `Entry ${order + 1}`,
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
      spinDurationMs: duration,
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
    officialEnabled: official,
    latestOfficialResult: null,
    recentOfficialResults: [],
    revision: 1,
  };
}
function wheelSummary(index, position) { const item = wheel(index); return { slug: item.slug, title: item.title, description: item.description, participantCount: item.participantCount, weighted: item.weighted, themePreset: item.config.themePreset, palette: item.config.palette, demoEnabled: item.demoEnabled, officialEnabled: item.officialEnabled, latestOfficialAt: null, updatedAt: item.updatedAt, position }; }
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
