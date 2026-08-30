import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyPaletteStylesToEntries, normalizePaletteStyles, normalizeSegmentStyle, pointerAccentShades, resolvedEntryStyle, SEGMENT_PATTERN_IDS } from "../src/wheels/segmentStyles.mjs";
import { coverImageGeometry, patternDefinition, THIRD_RAIL_BOLT_POINTS } from "../src/wheels/segmentPatternGeometry.mjs";
import { SPIN_SOUND_PROFILES, WINNER_SOUND_PROFILES } from "../src/wheels/soundPresets.mjs";

test("every V1.8 pattern is deterministic, vector-bound, clipped, and colour-aware", () => {
  assert.equal(SEGMENT_PATTERN_IDS.length, 9);
  for (const id of SEGMENT_PATTERN_IDS) { const first = patternDefinition(id, 640); const second = patternDefinition(id, 640); assert.deepEqual(first, second); assert.equal(first.clipToSegment, true); assert.equal(first.highDprVector, true); assert.equal(first.usesBaseColour, true); assert.equal(first.usesPatternColour, true); assert.ok(first.tile >= 14); }
  assert.throws(() => patternDefinition("remote-pattern", 640), /unknown/i); assert.equal(patternDefinition("third-rail-bolts", 640).boltSource, "assets/icons/trzap-0.svg"); assert.equal(THIRD_RAIL_BOLT_POINTS.length, 10);
});

test("segment styles preserve legacy solids and cycle/reset complete styles", () => {
  assert.deepEqual(normalizeSegmentStyle("#b8182f"), { mode: "solid", color: "#B8182F" });
  const styles = normalizePaletteStyles([{ mode: "pattern", color: "#FF0000", pattern: "zigzag", patternColor: "#FF8EA0" }, { mode: "solid", color: "#FFFFFF" }], ["#FF0000", "#FFFFFF"]);
  const entries = [{ id: "b", order: 1 }, { id: "a", order: 0 }, { id: "c", order: 2 }]; const applied = applyPaletteStylesToEntries(entries, styles);
  assert.equal(applied.find((entry) => entry.id === "a").style.pattern, "zigzag"); assert.equal(applied.find((entry) => entry.id === "c").style.patternColor, "#FF8EA0");
  assert.deepEqual(resolvedEntryStyle({ order: 1, colour: null, style: null }, { palette: ["#FF0000", "#FFFFFF"], paletteStyles: styles }), styles[1]);
  assert.throws(() => normalizeSegmentStyle({ mode: "pattern", color: "#000000", pattern: "url(x)", patternColor: "#FFFFFF" }), /supported/i);
});

test("pointer shades stay accent-tonal without a white body", () => {
  for (const accent of ["#F3C928", "#B8182F", "#16845A", "#6D3A93"]) { const shades = pointerAccentShades(accent); assert.equal(shades.base, accent); assert.notEqual(shades.light, "#FFFFFF"); assert.notEqual(shades.glow, "#FFFFFF"); }
});

test("generated spin and winner presets have distinct bounded audio profiles", () => {
  const spins = Object.values(SPIN_SOUND_PROFILES).filter(Boolean); const winners = Object.values(WINNER_SOUND_PROFILES).filter(Boolean); assert.ok(spins.length >= 5); assert.ok(winners.length >= 6);
  assert.equal(new Set(spins.map((profile) => JSON.stringify(profile))).size, spins.length); assert.equal(new Set(winners.map((profile) => JSON.stringify(profile))).size, winners.length); assert.equal(SPIN_SOUND_PROFILES.silent, null); assert.equal(WINNER_SOUND_PROFILES.silent, null);
});

test("Canvas image fills use radial cover and the GIF ticker is bounded and cleaned", async () => {
  const [patterns, canvas] = await Promise.all([readFile(new URL("../src/wheels/segmentPatterns.ts", import.meta.url), "utf8"), readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8")]);
  for (const span of [.08, Math.PI / 2, 2.7]) { const geometry = coverImageGeometry(80, 120, 300, span); assert.ok(geometry.height >= 300); assert.ok(geometry.width >= geometry.tangent); assert.ok(Math.abs(geometry.width / geometry.height - 2 / 3) < 1e-12); assert.equal(geometry.imageRotation, Math.PI / 2); }
  assert.match(patterns, /coverImageGeometry/); assert.match(canvas, /context\.clip/); assert.match(canvas, /setInterval[\s\S]*75/); assert.match(canvas, /document\.visibilityState === "visible"/); assert.match(canvas, /clearInterval\(ticker\)/); assert.match(canvas, /cache\.clear\(\)/);
});
