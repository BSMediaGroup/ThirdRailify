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

test("Wheels V1.5 gives near-white slices dark labels without changing other configured labels", async () => {
  const canvas = await read("src/wheels/WheelCanvas.tsx");
  assert.match(canvas, /config\.labelContrast === "dark" \|\| isNearWhite\(segmentColour\)/);
  assert.match(canvas, /useDarkLabel \? "#171712" : "#fffdf3"/);
  assert.match(canvas, />= \.84/);
});

test("Wheels V1.5 modal surfaces use bounded vertical-only content scrollers", async () => {
  const styles = await read("src/styles/wheels.css");
  const v15 = styles.slice(styles.lastIndexOf("Wheels V1.5"));
  for (const selector of [".wheel-editor-dialog__body", ".participant-manager__body", ".wheel-transfer-body", ".appearance-dialog__body"]) assert.ok(v15.includes(selector), `${selector} is covered by the V1.5 scroll model`);
  assert.match(v15, /overflow-x:clip;overflow-y:auto/);
  assert.match(v15, /grid-template-columns:minmax\(0,1fr\)/);
});
