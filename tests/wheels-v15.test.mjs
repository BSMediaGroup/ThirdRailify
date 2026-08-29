import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Wheels V1.5 keeps rim markers size-relative and clipped inside every wheel", async () => {
  const [canvas, styles] = await Promise.all([read("src/wheels/WheelCanvas.tsx"), read("src/styles/wheels.css")]);
  assert.match(canvas, /wheel-stage__rim wheel-stage__rim--outer[^>]*aria-hidden="true"/);
  assert.match(styles, /\.wheel-stage__rim--outer\{overflow:clip\}/);
  assert.match(styles, /\.wheel-stage__rim--outer i\{[^}]*inset:0[^}]*background:transparent[^}]*pointer-events:none/);
  assert.match(styles, /\.wheel-stage__rim--outer i::before\{/);
  assert.doesNotMatch(styles, /translateY\(-333px\)/);
});

test("Wheels V1.5 gives extra-light white, silver, and yellow slices dark labels without changing darker configured labels", async () => {
  const canvas = await read("src/wheels/WheelCanvas.tsx");
  assert.match(canvas, /config\.labelContrast === "dark" \|\| isExtraLight\(segmentColour\)/);
  assert.match(canvas, /useDarkLabel \? "#171712" : "#fffdf3"/);
  assert.match(canvas, />= \.72/);
  assert.ok((243 * .2126 + 201 * .7152 + 40 * .0722) / 255 >= .72, "Third Rail Gold selects dark text");
  assert.ok((184 * .2126 + 24 * .7152 + 47 * .0722) / 255 < .72, "Third Rail crimson retains light text");
});

test("Wheels V1.5 modal surfaces use bounded vertical-only content scrollers", async () => {
  const styles = await read("src/styles/wheels.css");
  const v15 = styles.slice(styles.indexOf("Wheels V1.5: size-relative"));
  for (const selector of [".wheel-editor-dialog__body", ".participant-manager__body", ".wheel-transfer-body", ".appearance-dialog__body"]) assert.ok(v15.includes(selector), `${selector} is covered by the V1.5 scroll model`);
  assert.match(v15, /overflow-x:clip;overflow-y:auto/);
  assert.match(v15, /grid-template-columns:minmax\(0,1fr\)/);
});

test("Wheels V1.5 follow-up reserves painted-effect clearance and outlines the pointer", async () => {
  const styles = await read("src/styles/wheels.css");
  const followUp = styles.slice(styles.lastIndexOf("Wheels V1.5 follow-up"));
  assert.match(followUp, /\.wheel-stage__pointer::before\{/);
  assert.match(followUp, /background:color-mix\(in srgb,var\(--pointer\),#120d04 66%\)/);
  for (const selector of [".appearance-preview .wheel-stage", ".wheel-editor-dialog__preview .wheel-stage", ".wheel-editor-preview .wheel-stage", ".wheel-spin-console"]) assert.ok(followUp.includes(selector), `${selector} receives painted-effect clearance`);
  assert.match(followUp, /calc\(100dvh - 292px\)/);
  assert.match(followUp, /\.wheel-control-page--presentation\{position:fixed;[^}]*height:100dvh;[^}]*overflow:hidden/);
});

test("Wheels V1.5 follow-up adds bounded two-tone, three-tone and tonal palettes without expanding the preset contract", async () => {
  const [appearance, types] = await Promise.all([read("src/wheels/AppearanceDialog.tsx"), read("src/wheels/types.ts")]);
  const library = appearance.slice(appearance.indexOf("const WHEEL_PALETTES"), appearance.indexOf("];", appearance.indexOf("const WHEEL_PALETTES")) + 2);
  assert.equal([...library.matchAll(/\{ key:/g)].length, 16);
  for (const label of ["Red / Gold Duo", "Red / Charcoal / Gold", "Silver Gradient", "Crimson Gradient", "Blue / Red Duo", "Blue / Red Gradient", "Emerald Gradient", "Green / Gold Duo"]) assert.ok(library.includes(label), `${label} is available`);
  assert.match(appearance, /themePreset: option\.themePreset, palette: option\.palette, pointerAccent: option\.pointerAccent/);
  assert.equal((types.match(/export type WheelThemePreset = ([^;]+)/) || [])[1], '"third-rail-gold" | "live-wire-red" | "gina-violet" | "high-voltage-mono" | "signal-teal" | "after-hours"');
});
