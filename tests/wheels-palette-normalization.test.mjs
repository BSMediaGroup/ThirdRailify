import assert from "node:assert/strict";
import test from "node:test";
import { normalizeImportedPalette } from "../src/wheels/paletteNormalization.mjs";
import { canonicalStringify, createPortableWheel, parseWheelImport, serializePortableWheel, sha256Hex, THIRD_RAIL_GOLD_CONFIG } from "../src/wheels/portable.mjs";
import { createPortableStage, parsePortableStage, serializePortableStage } from "../src/wheels/stagePortable.mjs";

const five = ["#110000", "#220000", "#330000", "#440000", "#550000"];
const solid = (color) => ({ mode: "solid", color });

test("import palette normalization repairs count drift without losing usable styles", () => {
  const legacy = normalizeImportedPalette(five, []);
  assert.deepEqual(legacy.paletteStyles, five.map(solid));
  assert.match(legacy.warnings[0].reason, /5 solid styles/);

  const missing = normalizeImportedPalette(five, five.slice(0, 3).map(solid));
  assert.equal(missing.paletteStyles.length, 5);
  assert.deepEqual(missing.paletteStyles.slice(0, 3), five.slice(0, 3).map(solid));
  assert.match(missing.warnings.find((item) => item.code === "missing-styles").reason, /2 missing/);

  const extra = normalizeImportedPalette(five.slice(0, 4), [...five, "#660000"].map(solid));
  assert.equal(extra.paletteStyles.length, 4);
  assert.match(extra.warnings.find((item) => item.code === "extra-styles").reason, /2 extra/);

  const matching = normalizeImportedPalette(five.slice(0, 4), five.slice(0, 4).map(solid));
  assert.deepEqual(matching.warnings, []);
});

test("richer style colours win and invalid patterns or images become visible solid fallbacks", () => {
  const normalized = normalizeImportedPalette(
    ["#111111", "#222222", "#333333", "#444444"],
    [
      { mode: "pattern", color: "#AABBCC", pattern: "zigzag", patternColor: "#FFFFFF" },
      { mode: "pattern", color: "#BB0000", pattern: "unsupported", patternColor: "#FFFFFF" },
      { mode: "pattern", color: "#CC0000", pattern: "dots" },
      { mode: "image", color: "#DD0000", imageAssetId: "https://outside.example/image.png" },
    ],
    { availableImageAssetIds: new Set() },
  );
  assert.equal(normalized.palette[0], "#AABBCC");
  assert.equal(normalized.paletteStyles[0].mode, "pattern");
  assert.deepEqual(normalized.paletteStyles.slice(1), [solid("#BB0000"), solid("#CC0000"), solid("#DD0000")]);
  assert.match(normalized.warnings.find((item) => item.code === "pattern-fallback").reason, /2 unsupported patterns/);
  assert.match(normalized.warnings.find((item) => item.code === "image-fallback").reason, /fallback colour/);
});

test("missing, one-colour, five-colour, oversized and patterned palettes remain bounded and canonical", () => {
  const absent = normalizeImportedPalette(null, null);
  assert.deepEqual(absent.palette, [...THIRD_RAIL_GOLD_CONFIG.palette]);
  assert.match(absent.warnings.find((item) => item.code === "default-palette").reason, /Third Rail Gold/);

  for (const palette of [["#123456"], five]) {
    const result = normalizeImportedPalette(palette, null, { maxPalette: 5 });
    assert.equal(result.palette.length, palette.length);
    assert.equal(result.paletteStyles.length, palette.length);
  }
  const oversized = normalizeImportedPalette([...five, "#660000"], null, { maxPalette: 5 });
  assert.equal(oversized.palette.length, 5);
  assert.match(oversized.warnings.find((item) => item.code === "extra-palette-colours").reason, /1 extra/);

  const pattern = { mode: "pattern", color: "#112233", pattern: "dots", patternColor: "#FFFFFF" };
  assert.deepEqual(normalizeImportedPalette(["#000000"], [pattern], { maxPalette: 5 }).paletteStyles, [pattern]);
});

test("Wheel of Names colours always synthesize aligned solid styles", async () => {
  const document = { title: "Five colour source", wheelConfigs: [{ title: "Five", entries: [{ text: "A" }, { text: "B", weight: 4 }], colorSettings: five.map((color) => ({ enabled: true, color })) }] };
  const parsed = await parseWheelImport(JSON.stringify(document));
  const proposal = parsed.proposals[0];
  assert.deepEqual(proposal.config.palette, five);
  assert.deepEqual(proposal.config.paletteStyles, five.map(solid));
  assert.equal(proposal.entries[1].weight, 4);
  assert.match(proposal.messages.find((item) => item.target === "canonical palette").reason, /5 solid styles/);

  const oneColourDocument = { title: "One colour source", wheelConfigs: [{ title: "One", entries: [{ text: "A" }], colorSettings: [{ enabled: true, color: "#123456" }] }] };
  const oneColour = (await parseWheelImport(JSON.stringify(oneColourDocument))).proposals[0];
  assert.deepEqual(oneColour.config.palette, ["#123456"]);
  assert.deepEqual(oneColour.config.paletteStyles, [solid("#123456")]);
});

test("TWL V1 and V2 recover palette mismatch before canonical save validation", async () => {
  const source = { title: "Portable repair", description: "", config: { ...THIRD_RAIL_GOLD_CONFIG, palette: [...five], paletteStyles: five.map(solid) }, entries: [{ id: crypto.randomUUID(), label: "A", order: 0, weight: 1, colour: null, style: null, state: "active" }] };
  const canonical = await createPortableWheel(source);

  const v1 = structuredClone(canonical);
  v1.formatVersion = 1;
  delete v1.integrity;
  delete v1.wheel.settings.paletteStyles;
  const legacy = (await parseWheelImport(JSON.stringify(v1))).proposals[0];
  assert.equal(legacy.config.palette.length, legacy.config.paletteStyles.length);

  const v2 = structuredClone(canonical);
  v2.wheel.settings.paletteStyles = [solid("#A10000"), solid("#A20000"), solid("#A30000")];
  v2.integrity.wheelPayload = await sha256Hex(canonicalStringify(v2.wheel));
  const repaired = (await parseWheelImport(serializePortableWheel(v2))).proposals[0];
  assert.equal(repaired.config.palette.length, 5);
  assert.equal(repaired.config.paletteStyles.length, 5);
  assert.deepEqual(repaired.config.palette.slice(0, 3), ["#A10000", "#A20000", "#A30000"]);
  assert.match(repaired.messages.find((item) => /missing palette style/.test(item.reason)).reason, /2 missing/);
});

test("normalized Wheel and Stage portable round trips retain canonical palettes", async () => {
  const imported = (await parseWheelImport(JSON.stringify({ title: "Round trip", wheelConfigs: [{ title: "Round trip", entries: [{ text: "A" }, { text: "B" }], colorSettings: five.map((color) => ({ enabled: true, color })) }] }))).proposals[0];
  const wheel = { title: imported.title, description: imported.description, config: imported.config, entries: imported.entries };
  const wheelRoundTrip = (await parseWheelImport(serializePortableWheel(await createPortableWheel(wheel)))).proposals[0];
  assert.deepEqual(wheelRoundTrip.config.palette, five);
  assert.deepEqual(wheelRoundTrip.config.paletteStyles, five.map(solid));

  const stageText = serializePortableStage(await createPortableStage({ title: "Normalized Stage", wheels: [{ wheel }, { wheel: { ...wheel, title: "Round trip 2" } }] }));
  const stageRoundTrip = await parsePortableStage(stageText, { defaultConfig: THIRD_RAIL_GOLD_CONFIG });
  assert.equal(stageRoundTrip.proposals.length, 2);
  for (const item of stageRoundTrip.proposals) {
    assert.deepEqual(item.proposal.config.palette, five);
    assert.deepEqual(item.proposal.config.paletteStyles, five.map(solid));
  }
});
