import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPaletteToEntries,
  movePaletteColour,
  normalizeCustomPalette,
  paletteColourForEntry,
} from "../src/wheels/appearance.mjs";
import {
  CELEBRATION_PROFILES,
  effectCounts,
} from "../src/wheels/celebrationProfiles.mjs";
import {
  THIRD_RAIL_GOLD_CONFIG,
  createPortableWheel,
  parseWheelImport,
  serializePortableWheel,
} from "../src/wheels/portable.mjs";

const entries = Array.from({ length: 7 }, (_, index) => ({
  id: `entry-${index}`,
  label: `Entrant ${index + 1}`,
  order: index,
  weight: 1,
  colour: index === 1 ? "#ABCDEF" : null,
  state: "active",
}));

test("custom palettes enforce 1-5 strict hex colours and an independent accent", () => {
  assert.deepEqual(normalizeCustomPalette(["#112233"], "#abcdef"), {
    colors: ["#112233"],
    accent: "#ABCDEF",
  });
  assert.equal(
    normalizeCustomPalette(
      ["#112233", "#445566", "#778899", "#AABBCC", "#DDEEFF"],
      "#010203",
    ).colors.length,
    5,
  );
  assert.throws(() => normalizeCustomPalette([], "#112233"), /one and five/i);
  assert.throws(
    () => normalizeCustomPalette(Array(6).fill("#112233"), "#112233"),
    /one and five/i,
  );
  for (const invalid of [
    "red",
    "#123",
    "#11223344",
    "var(--gold)",
    "linear-gradient(red, blue)",
    "<script>",
  ])
    assert.throws(
      () => normalizeCustomPalette([invalid], "#112233"),
      /six-digit hex/i,
    );
  assert.throws(
    () => normalizeCustomPalette(["#112233"], "transparent"),
    /six-digit hex/i,
  );
});

test("palette cycling follows authoritative entrant order and reapply overwrites manual colours", () => {
  const palette = ["#112233", "#445566", "#778899"];
  const applied = applyPaletteToEntries([...entries].reverse(), palette);
  assert.deepEqual(
    [...applied].sort((a, b) => a.order - b.order).map((entry) => entry.colour),
    [
      "#112233",
      "#445566",
      "#778899",
      "#112233",
      "#445566",
      "#778899",
      "#112233",
    ],
  );
  const manual = applied.map((entry) =>
    entry.id === "entry-2" ? { ...entry, colour: "#FFFFFF" } : entry,
  );
  assert.equal(
    manual.find((entry) => entry.id === "entry-2").colour,
    "#FFFFFF",
  );
  assert.equal(paletteColourForEntry(manual, "entry-2", palette), "#778899");
  assert.equal(
    applyPaletteToEntries(manual, ["#AA0000", "#00AA00"]).find(
      (entry) => entry.id === "entry-2",
    ).colour,
    "#AA0000",
  );
  assert.deepEqual(movePaletteColour(palette, 1, -1), [
    "#445566",
    "#112233",
    "#778899",
  ]);
  assert.deepEqual(movePaletteColour(palette, 2, 1), palette);
});

test("custom config survives canonical V1 portability and legacy files default fireworks on", async () => {
  const config = {
    ...THIRD_RAIL_GOLD_CONFIG,
    themePreset: "custom",
    palette: ["#112233"],
    pointerAccent: "#ABCDEF",
    fireworksEnabled: false,
  };
  const document = await createPortableWheel({
    title: "Custom portable",
    description: "",
    config,
    entries,
  });
  const parsed = await parseWheelImport(serializePortableWheel(document));
  assert.equal(document.formatVersion, 1);
  assert.equal(parsed.proposals[0].config.themePreset, "custom");
  assert.deepEqual(parsed.proposals[0].config.palette, ["#112233"]);
  assert.equal(parsed.proposals[0].config.pointerAccent, "#ABCDEF");
  assert.equal(parsed.proposals[0].config.fireworksEnabled, false);
  const legacy = structuredClone(document);
  delete legacy.wheel.settings.fireworksEnabled;
  delete legacy.integrity;
  const old = await parseWheelImport(JSON.stringify(legacy));
  assert.equal(old.proposals[0].config.fireworksEnabled, true);
});

test("celebration profiles scale every visual dimension and toggles fail closed", () => {
  const { subtle, normal, strong } = CELEBRATION_PROFILES;
  for (const field of [
    "confettiCount",
    "confettiDuration",
    "fireworksBursts",
    "sparksPerBurst",
    "fireworksDuration",
    "lightingStrength",
    "rimStrength",
    "beamCount",
    "voltageCount",
    "bloomOpacity",
    "stageEnergy",
  ])
    assert.ok(
      subtle[field] < normal[field] && normal[field] < strong[field],
      field,
    );
  const full = {
    celebrationEnabled: true,
    confettiEnabled: true,
    fireworksEnabled: true,
    lightingEnabled: true,
    reducedMotion: false,
  };
  assert.deepEqual(
    effectCounts("normal", { ...full, fireworksEnabled: false }),
    {
      confetti: normal.confettiCount,
      fireworks: 0,
      beams: normal.beamCount,
      voltage: normal.voltageCount,
    },
  );
  assert.deepEqual(
    effectCounts("normal", {
      ...full,
      confettiEnabled: false,
      lightingEnabled: false,
    }),
    { confetti: 0, fireworks: normal.fireworksBursts, beams: 0, voltage: 0 },
  );
  assert.deepEqual(effectCounts("strong", { ...full, reducedMotion: true }), {
    confetti: 0,
    fireworks: 0,
    beams: 0,
    voltage: 0,
  });
  assert.deepEqual(
    effectCounts("strong", { ...full, celebrationEnabled: false }),
    { confetti: 0, fireworks: 0, beams: 0, voltage: 0 },
  );
});
