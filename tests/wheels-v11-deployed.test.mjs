import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.WHEELS_DEPLOY_ORIGIN;
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

test("deployed Wheels V1.1 stage, audio, navigation, and VIP surfaces are operational", { skip: !ORIGIN }, async (t) => {
  const artifacts = fileURLToPath(new URL("../.artifacts/wheels-v11-deployed/", import.meta.url));
  await mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await context.addInitScript(() => {
    window.__wheelAudio = { contexts: 0, closes: Number(sessionStorage.getItem("wheel-audio-closes") || 0), frequencies: [] };
    class Node { connect(node) { return node; } }
    class Oscillator extends Node { constructor() { super(); this.frequency = { value: 0 }; this.type = "sine"; } start() { window.__wheelAudio.frequencies.push(this.frequency.value); } stop() {} }
    class Gain extends Node { constructor() { super(); this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; } }
    window.AudioContext = class { constructor() { window.__wheelAudio.contexts += 1; this.currentTime = 0; this.state = "running"; this.destination = new Node(); } createOscillator() { return new Oscillator(); } createGain() { return new Gain(); } resume() { this.state = "running"; return Promise.resolve(); } close() { this.state = "closed"; window.__wheelAudio.closes += 1; sessionStorage.setItem("wheel-audio-closes", String(window.__wheelAudio.closes)); return Promise.resolve(); } };
  });
  const page = await context.newPage(); const errors = [];
  page.on("console", (entry) => { if (entry.type() === "error") errors.push(entry.text()); }); page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${ORIGIN}/wheels/third-railify-demo-draw`, { waitUntil: "networkidle" }); await dismissConsent(page);
  await page.getByRole("heading", { level: 1, name: "Third Railify Demo Draw" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Start demo spin" }).textContent().then((text) => text.includes("SPIN WHEEL")), true);
  await page.screenshot({ path: `${artifacts}/wheel-idle-1440.png`, fullPage: true });
  await page.getByRole("button", { name: "Start demo spin" }).click(); await page.locator(".wheel-stage.is-spinning").waitFor();
  assert.equal(await page.evaluate(() => window.__wheelAudio.contexts), 1); await page.screenshot({ path: `${artifacts}/wheel-spinning-1440.png` });
  await page.getByRole("dialog").waitFor({ timeout: 15_000 });
  assert.ok(await page.locator(".winner-confetti i").count() >= 34); assert.equal(await page.locator(".winner-lightshow").count(), 1);
  const frequencies = await page.evaluate(() => window.__wheelAudio.frequencies); for (const note of [392, 523.25, 659.25, 783.99]) assert.ok(frequencies.includes(note));
  await page.screenshot({ path: `${artifacts}/winner-1440.png` }); await page.getByRole("button", { name: "Close result" }).click();
  await page.getByRole("link", { name: "Present" }).click(); await page.locator(".wheel-control-page--presentation").waitFor(); await page.screenshot({ path: `${artifacts}/presentation-1440.png` });
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle" }); assert.equal(await page.getByRole("button", { name: "Toggle Community links" }).count(), 0); await page.getByRole("link", { name: "Community", exact: true }).hover(); await page.getByRole("link", { name: "GOATS in the Wild", exact: true }).waitFor(); await page.screenshot({ path: `${artifacts}/community-dropdown-no-chevron-1440.png` });
  await page.goto(`${ORIGIN}/vip`, { waitUntil: "networkidle" }); await page.getByRole("heading", { level: 1, name: /THE INNER RAIL IS BEING BUILT/i }).waitFor(); assert.equal(await page.getByRole("button", { name: /buy|purchase|subscribe/i }).count(), 0); await page.setViewportSize({ width: 390, height: 844 }); await page.reload({ waitUntil: "networkidle" }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true); await page.screenshot({ path: `${artifacts}/vip-mobile-390.png`, fullPage: true });
  assert.ok(await page.evaluate(() => window.__wheelAudio.closes) >= 1); assert.deepEqual(errors, []);
});

async function dismissConsent(page) { const button = page.getByRole("button", { name: /Reject non-essential/i }); if (await button.count()) await button.click(); }
