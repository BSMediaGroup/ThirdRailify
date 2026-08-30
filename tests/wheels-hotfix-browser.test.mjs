import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright-core";
import { canonicalStringify, createPortableWheel, serializePortableWheel, sha256Hex } from "../src/wheels/portable.mjs";

const ORIGIN = process.env.WHEELS_HOTFIX_ORIGIN || "http://127.0.0.1:4205";
const LOCAL = !process.env.WHEELS_HOTFIX_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS = fileURLToPath(new URL("../.artifacts/wheels-import-focus-hotfix/", import.meta.url));
const SLUG = process.env.WHEELS_HOTFIX_ORIGIN ? "third-railify-demo-draw" : "focus-fixture";
const writes = [];
const traces = [];

test("Wheels import repair and forms preserve focus and DOM identity for continuous real typing", async (t) => {
  await mkdir(ARTIFACTS, { recursive: true });
  let server;
  if (LOCAL) {
    server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4205"], { stdio: "ignore" });
    t.after(() => server.kill());
    await waitForPreview();
  }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  t.after(() => browser.close());

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await consent(context);
  const page = await context.newPage();
  const errors = monitor(page);
  await routes(page);

  await page.goto(`${ORIGIN}/wheels/new`, { waitUntil: "networkidle" });
  await typeContinuously(page, page.getByLabel("Wheel title"), "Competition Wheel August 2026", "new wheel title");
  await typeContinuously(page, page.getByLabel("Concise description"), "Wheel description typed continuously without losing focus.", "new wheel description");
  await typeContinuously(page, page.getByLabel("Quick-add participant"), "Participant Quick Add", "new wheel quick add");
  await typeContinuously(page, page.getByPlaceholder("Search participants"), "Search Wheel", "new wheel participant search");
  await page.locator(".bulk-add summary").click();
  await typeContinuously(page, page.locator(".bulk-add textarea"), "Alice\nBob", "new wheel bulk participants");
  await page.getByRole("button", { name: "Import wheel" }).click();
  await page.getByRole("button", { name: "Paste JSON" }).click();
  await typeContinuously(page, page.getByLabel("Canonical or supported participant JSON"), '{"entries":["Alice","Bob"]}', "pasted JSON");
  const transfer = page.getByRole("dialog", { name: "Import / Export" });
  await transfer.getByLabel("Choose file").setInputFiles({ name: "five-colour.wheel", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(wheelOfNames(1, 5))) });
  await transfer.getByText(/5 solid styles were generated/).waitFor();
  assert.equal(await transfer.getByLabel("Use normalized imported palette").isChecked(), true);
  await transfer.locator(".wheel-import-palette-choice").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${ARTIFACTS}/import-normalized-palette-1440x900.png`, fullPage: false });
  await transfer.getByLabel("Reset palette to Third Rail Gold").check();
  await transfer.locator(".wheel-import-palette-choice").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${ARTIFACTS}/import-reset-palette-choice-1440x900.png`, fullPage: false });
  const [twlV1, twlV2] = await portableMismatchFixtures();
  await transfer.getByLabel("Choose file").setInputFiles({ name: "legacy-v1.twl", mimeType: "application/vnd.thirdrailify.wheel+json", buffer: Buffer.from(twlV1) });
  await transfer.getByText(/5 solid styles were generated/).waitFor();
  assert.equal(await transfer.getByLabel("Use normalized imported palette").isChecked(), true);
  await transfer.getByLabel("Choose file").setInputFiles({ name: "mismatch-v2.twl", mimeType: "application/vnd.thirdrailify.wheel+json", buffer: Buffer.from(twlV2) });
  await transfer.getByText(/2 missing palette styles were repaired/).waitFor();
  assert.equal(await transfer.getByLabel("Use normalized imported palette").isChecked(), true);
  await transfer.getByLabel("Choose file").setInputFiles({ name: "five-colour.wheel", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(wheelOfNames(1, 5))) });
  await transfer.getByText(/5 solid styles were generated/).waitFor();
  await transfer.getByLabel("Use normalized imported palette").check();
  await transfer.getByRole("button", { name: "Use as new wheel" }).click();
  assert.equal(await page.getByLabel("Wheel title").inputValue(), "Imported Wheel 01");
  assert.equal(await page.getByText("Palette styles must align exactly with the palette.").count(), 0);
  await page.screenshot({ path: `${ARTIFACTS}/imported-normalized-wheel-editor-1440x900.png`, fullPage: true });

  await page.goto(`${ORIGIN}/wheels/${SLUG}/edit`, { waitUntil: "networkidle" });
  const editor = page.locator(".wheel-editor-dialog");
  await editor.waitFor();
  await typeContinuously(page, editor.getByLabel("Wheel title"), "Competition Wheel August 2026", "saved wheel title", true);
  await typeContinuously(page, editor.getByLabel("Description"), "This wheel description types continuously without refocus.", "saved wheel description", true);
  await editor.getByRole("tab", { name: "appearance" }).click();
  await editor.getByRole("button", { name: "Customize appearance" }).click();
  const appearance = page.getByRole("dialog", { name: /Tune the broadcast stage/ });
  await appearance.waitFor();
  await typeContinuously(page, appearance.getByLabel("Wheel accent hex colour"), "#A1B2C3", "appearance hex", true);
  assert.equal(await appearance.getByLabel("Wheel accent hex colour").inputValue(), "#A1B2C3");
  await appearance.getByRole("button", { name: "Reset all palette colours" }).click();
  await page.screenshot({ path: `${ARTIFACTS}/appearance-reset-palette-1440x900.png`, fullPage: false });
  await appearance.getByRole("button", { name: "Discard" }).click();

  await page.goto(`${ORIGIN}/wheels/${SLUG}?dialog=participants`, { waitUntil: "networkidle" });
  const participants = page.getByRole("dialog", { name: "Manage participants" });
  await participants.waitFor();
  await typeContinuously(page, participants.getByLabel("Quick-add participant"), "Participant Quick Add", "participant quick add");
  await typeContinuously(page, participants.getByPlaceholder("Search participants"), "Participant Search", "participant search");
  await participants.locator(".bulk-add summary").click();
  await typeContinuously(page, participants.locator(".bulk-add textarea"), "Charlie\nDelta", "participant bulk");
  await participants.getByPlaceholder("Search participants").fill("");
  await participants.getByRole("button", { name: /Style/ }).first().click();
  const style = page.getByRole("dialog", { name: "Segment style" });
  await typeContinuously(page, style.getByLabel("Base colour hex for Alice"), "#1A2B3C", "segment style hex", true);
  assert.equal(await style.getByLabel("Base colour hex for Alice").inputValue(), "#1A2B3C");
  await style.getByRole("button", { name: "Cancel" }).click();

  await page.goto(`${ORIGIN}/wheels/stages/new`, { waitUntil: "networkidle" });
  const stage = page.getByRole("dialog", { name: "Build a Stage" });
  await typeContinuously(page, stage.getByLabel("Stage title"), "Friday Night Prize Draw Stage", "stage title");
  await typeContinuously(page, stage.getByLabel("Description"), "This sentence must type continuously without losing focus.", "stage description");
  await typeContinuously(page, stage.getByPlaceholder("Search wheels"), "Search Wheel", "stage wheel lookup");
  await stage.getByLabel("Stage title").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${ARTIFACTS}/stage-editor-desktop-1440x900.png`, fullPage: false });
  await stage.getByRole("button", { name: "Import wheel" }).click();
  const stageImport = page.getByRole("dialog", { name: "Import Wheels or Stage" });
  const multi = await readFile(new URL("./fixtures/wheel-of-names-two-config-sanitized.wheel", import.meta.url));
  await stageImport.getByLabel(/Choose a portable Wheel or Stage file/).setInputFiles({ name: "multi.wheel", mimeType: "application/json", buffer: multi });
  await stageImport.getByText(/2 Wheels detected/).waitFor();
  assert.equal(await stageImport.getByText("Palette repaired", { exact: true }).count(), 2);
  await stageImport.locator(".wheel-import-palette-choice").first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${ARTIFACTS}/multi-wheel-normalization-1440x900.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${ORIGIN}/wheels/stages/new`, { waitUntil: "networkidle" });
  await typeContinuously(page, page.getByRole("dialog", { name: "Build a Stage" }).getByLabel("Stage title"), "Friday Night Prize Draw Stage", "mobile stage title");
  await assertNoHorizontalOverflow(page, "mobile stage");
  await page.screenshot({ path: `${ARTIFACTS}/stage-editor-mobile-390x844.png`, fullPage: false });

  for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${ORIGIN}/wheels/new`, { waitUntil: "networkidle" });
    await assertNoHorizontalOverflow(page, `wheel creator ${viewport.width}`);
    await page.goto(`${ORIGIN}/wheels/stages/new`, { waitUntil: "networkidle" });
    await assertNoHorizontalOverflow(page, `stage creator ${viewport.width}`);
  }

  const applicationErrors = errors.filter((error) => !isCloudflareAnalyticsIntegrityError(error));
  const platformErrors = errors.filter(isCloudflareAnalyticsIntegrityError);
  assert.deepEqual(applicationErrors, []);
  if (platformErrors.length) console.log(`# platform-only console diagnostics: ${platformErrors.length} Cloudflare Web Analytics SRI blocks`);
  assert.deepEqual(writes, []);
  assert.ok(traces.every((trace) => trace.steps.every((step) => step.active && step.sameNode)), JSON.stringify(traces));
  await writeFile(`${ARTIFACTS}/continuous-typing-trace.json`, `${JSON.stringify(traces, null, 2)}\n`);
  await context.close();
});

async function typeContinuously(page, locator, text, label, replace = false) {
  await locator.waitFor();
  await locator.click();
  const key = `trace-${traces.length}`;
  await locator.evaluate((node, key) => { globalThis.__wheelHotfixNodes ||= {}; globalThis.__wheelHotfixNodes[key] = node; }, key);
  if (replace) {
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
  }
  const steps = [];
  for (const character of text) {
    await page.keyboard.type(character);
    steps.push(await locator.evaluate((node, { key, character }) => ({ character, active: document.activeElement === node, sameNode: globalThis.__wheelHotfixNodes[key] === node, value: node.value }), { key, character }));
  }
  assert.equal(await locator.inputValue(), text, label);
  traces.push({ label, expected: text, steps });
}

async function routes(page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/wheels") && !new Set(["GET", "HEAD"]).has(request.method())) writes.push(`${request.method()} ${path}`);
    if (path === "/api/auth/config") return json(route, { configured: true, emailSignupConfigured: false, turnstileSiteKey: null, oauthProviders: [], oauthProviderStates: [], publicOrigin: ORIGIN, adminOrigin: ORIGIN, environment: "test", cookieMode: "host-only" });
    if (path === "/api/auth/session") return json(route, { ok: true, authenticated: true, csrfToken: "hotfix-fixture", access: { isAdmin: false, isMasterAdmin: false }, account: { id: "creator", email: "creator@example.test", displayName: "Creator", avatarUrl: null, providers: ["email"], role: "user", adminLevel: "none", status: "active", emailVerified: true, createdAt: "2026-08-31T00:00:00Z", source: "test" } });
    if (path === "/api/wheels/access") return json(route, { ok: true, authenticated: true, canCreate: true, isMasterAdmin: false, maximumOwnedWheels: 20, ownedWheelCount: 1, maximumOwnedStages: 20, ownedStageCount: 0 });
    if (path === "/api/wheels/stages/lookup") return json(route, { ok: true, items: [{ slug: SLUG, title: "Focus Fixture", participantCount: 2, visibility: "public", capability: "Edit", palette: CONFIG.palette }], count: 1 });
    if (path === `/api/wheels/${SLUG}`) return json(route, wheelPayload());
    if (path.includes("/neighbours")) return json(route, { ok: true, previous: null, next: null });
    if (path === "/api/wheels") return json(route, { ok: true, items: [{ slug: SLUG, title: "Focus Fixture", description: "Baseline", participantCount: 2, weighted: false, themePreset: "third-rail-gold", palette: CONFIG.palette, demoEnabled: true, officialEnabled: false, latestOfficialAt: null }], count: 1 });
    if (path === "/api/wheels/stages") return json(route, { ok: true, items: [], count: 0 });
    return json(route, { ok: true, items: [], count: 0 });
  });
}

const CONFIG = { themePreset: "third-rail-gold", palette: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"], paletteStyles: ["#F3C928", "#B8182F", "#F3F0E5", "#20201A"].map((color) => ({ mode: "solid", color })), pointerAccent: "#F3C928", centreTreatment: "bolt", backgroundIntensity: "high", labelContrast: "light", spinDurationMs: 6500, tickingSoundEnabled: true, spinSoundPreset: "classic-tick", winnerSoundEnabled: true, winnerSoundPreset: "gold-rise", celebrationEnabled: true, confettiEnabled: true, fireworksEnabled: true, winnerLightingEnabled: true, celebrationIntensity: "normal", backgroundEnabled: true, backgroundFocalX: 50, backgroundFocalY: 50, backgroundImageOpacity: 72, backgroundOverlayIntensity: 58, winnerMessageTemplate: "Signal locked: {winner}", publicHistoryVisible: true };
function wheelPayload() { const entries = ["Alice", "Bob"].map((label, order) => ({ id: `00000000-0000-4000-8000-00000000000${order + 1}`, label, order, weight: 1, colour: null, style: null, state: "active" })); return { ok: true, wheel: { slug: SLUG, title: "Focus Fixture", description: "Baseline", lifecycle: "active", visibility: "public", participantCount: 2, weighted: false, entries, config: structuredClone(CONFIG), media: { background: null, centre: null, segmentFills: [] }, demoEnabled: true, officialEnabled: false, latestOfficialResult: null, recentOfficialResults: [], revision: 1 }, access: { role: "editor", isMasterAdmin: false, canEdit: true, canSpinOfficially: false, editingLocked: false, officialSpinLocked: false, revision: 1 } }; }
function wheelOfNames(count, colours) { return { title: "Imported", wheelConfigs: Array.from({ length: count }, (_, index) => ({ title: `Imported Wheel ${String(index + 1).padStart(2, "0")}`, entries: [{ text: "Alice" }, { text: "Bob", weight: 2 }], colorSettings: Array.from({ length: colours }, (_, colour) => ({ enabled: true, color: `#${String(colour + 1).repeat(6)}` })) })) }; }
async function portableMismatchFixtures() { const entries = [{ id: crypto.randomUUID(), label: "Alice", order: 0, weight: 1, colour: null, style: null, state: "active" }]; const config = { ...structuredClone(CONFIG), themePreset: "custom", palette: ["#110000", "#220000", "#330000", "#440000", "#550000"], paletteStyles: ["#110000", "#220000", "#330000", "#440000", "#550000"].map((color) => ({ mode: "solid", color })) }; const canonical = await createPortableWheel({ title: "Portable mismatch", description: "Preview only", config, entries }); const v1 = structuredClone(canonical); v1.formatVersion = 1; delete v1.integrity; delete v1.wheel.settings.paletteStyles; const v2 = structuredClone(canonical); v2.wheel.settings.paletteStyles = v2.wheel.settings.paletteStyles.slice(0, 3); v2.integrity.wheelPayload = await sha256Hex(canonicalStringify(v2.wheel)); return [serializePortableWheel(v1), serializePortableWheel(v2)]; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
function monitor(page) { const errors = []; page.on("console", (entry) => { if (entry.type() === "error") { const location = entry.location().url; errors.push(`${entry.text()}${location ? ` @ ${location}` : ""}`); } }); page.on("pageerror", (error) => errors.push(error.message)); return errors; }
function isCloudflareAnalyticsIntegrityError(error) { return error.includes("Failed to find a valid digest in the 'integrity' attribute") && error.includes("https://static.cloudflareinsights.com/beacon.min.js/"); }
async function assertNoHorizontalOverflow(page, label) { const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert.ok(overflow <= 1, `${label} overflow ${overflow}`); }
async function consent(context) { const now = Date.now(); await context.addCookies([{ name: "thirdrailify_consent", value: encodeURIComponent(JSON.stringify({ version: 1, timestamp: new Date(now).toISOString(), expiry: new Date(now + 2_592_000_000).toISOString(), categories: { preferences: false, externalMedia: false } })), url: ORIGIN }]); }
async function waitForPreview() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* preview starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Hotfix preview did not start."); }
