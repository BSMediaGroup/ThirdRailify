import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createWheelRenderPlan, resolveWheelGeometry } from "../src/wheels/wheelRenderPlan.mjs";

const ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315];
const IMAGE_ID = "11111111-1111-4111-8111-111111111111";
const GIF_ID = "22222222-2222-4222-8222-222222222222";
const labels = ["A", "Daniel", "Demo GOAT 01", "THIS IS A MUCH LONGER PARTICIPANT NAME", "Dots", "Triangles", "Bolts", "Image"];
const styles = [
  { mode: "pattern", color: "#11110E", pattern: "zigzag", patternColor: "#F3C928" },
  { mode: "pattern", color: "#B8182F", pattern: "dots", patternColor: "#FFFFFF" },
  { mode: "pattern", color: "#0D6F73", pattern: "triangles", patternColor: "#F3C928" },
  { mode: "pattern", color: "#6D3A93", pattern: "checkers", patternColor: "#FFFFFF" },
  { mode: "pattern", color: "#11110E", pattern: "third-rail-bolts", patternColor: "#F3C928" },
  { mode: "solid", color: "#F3F0E5" },
  { mode: "image", color: "#181818", imageAssetId: GIF_ID },
  { mode: "image", color: "#181818", imageAssetId: IMAGE_ID },
];
const entries = labels.map((label, order) => ({ id: `00000000-0000-4000-8000-00000000000${order + 1}`, label, order, weight: [3, 2, 1, .35, 1, 1, 1, 1][order], colour: null, style: styles[order], state: "active" }));
const config = { themePreset: "custom", palette: ["#F3C928"], paletteStyles: [{ mode: "solid", color: "#F3C928" }], pointerAccent: "#F3C928", labelContrast: "light" };
const dimensions = new Map([[IMAGE_ID, { width: 80, height: 120 }], [GIF_ID, { width: 64, height: 96 }]]);
const measure = (label, size) => label.length * size * .61;

test("V1.9 wheel-local label, pattern, and image metrics are mathematically rotation-invariant", () => {
  const plan = createWheelRenderPlan(entries, config, resolveWheelGeometry(640), measure, dimensions);
  const localMetrics = plan.segments.map(metrics);
  for (const rotation of ROTATIONS) {
    const rigidlyRotated = plan.segments.map((segment) => ({ worldMidpoint: segment.midpoint + rotation * Math.PI / 180, local: metrics(segment) }));
    assert.deepEqual(rigidlyRotated.map((segment) => segment.local), localMetrics, `${rotation} degrees changes only world angle`);
  }
  assert.equal(Object.hasOwn(plan, "rotation"), false);
  assert.equal(plan.segments.every((segment) => Object.hasOwn(segment, "rotation") === false), true);
});

test("V1.9 static font fitting responds to label length and weighted local wedge span", () => {
  const plan = createWheelRenderPlan(entries, config, resolveWheelGeometry(640), measure, dimensions);
  const [shortWide, mediumWide, demo, longNarrow] = plan.segments;
  assert.ok(shortWide.label.fontSize >= mediumWide.label.fontSize);
  assert.ok(mediumWide.label.fontSize >= demo.label.fontSize);
  assert.ok(longNarrow.label.fontSize < shortWide.label.fontSize);
  assert.ok(longNarrow.tangentSpan < shortWide.tangentSpan);
  assert.ok(plan.segments.every((segment) => segment.label.fontSize >= 9 && segment.label.measuredWidth <= segment.label.maxWidth + .01));
});

test("V1.9 vector pattern and asymmetric image-cover plans stay fixed in segment-local coordinates", () => {
  const plan = createWheelRenderPlan(entries, config, resolveWheelGeometry(640), measure, dimensions);
  for (const id of ["zigzag", "dots", "triangles", "checkers", "third-rail-bolts"]) {
    const segment = plan.segments.find((candidate) => candidate.pattern?.id === id); assert.ok(segment?.pattern); assert.ok(segment.pattern.tileWidth > 0); assert.ok(segment.pattern.tileHeight > 0); assert.ok(segment.pattern.lineWidth > 0); assert.equal(segment.pattern.scale, 1); assert.equal(segment.pattern.originX, segment.pattern.originY);
  }
  for (const segment of plan.segments.filter((candidate) => candidate.image)) { assert.ok(segment.image.scale > 0); assert.ok(segment.image.cropWidth > 0); assert.ok(segment.image.cropHeight > 0); assert.equal(segment.image.localOrientation, Math.PI / 2); }
});

test("V1.9 renderer owns a cached local face and never sizes layout from the rotated screen box", async () => {
  const source = await readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8");
  assert.match(source, /observer\.observe\(hostElement\)/);
  assert.doesNotMatch(source, /rotorElement\.clientWidth/);
  assert.doesNotMatch(source, /const rect = canvas\.getBoundingClientRect\(\)/);
  assert.match(source, /staticFaceRebuilds/);
  assert.match(source, /gifLayerComposites/);
  assert.match(source, /context\.setTransform\(face\.ratio/);
  assert.match(source, /useMemo\(\(\) => entries\.filter/);
});

function metrics(segment) {
  return { fontSize: segment.label.fontSize, measuredWidth: segment.label.measuredWidth, maxWidth: segment.label.maxWidth, tangentSpan: segment.tangentSpan, pattern: segment.pattern && { tileWidth: segment.pattern.tileWidth, tileHeight: segment.pattern.tileHeight, lineWidth: segment.pattern.lineWidth, dotRadius: segment.pattern.dotRadius, scale: segment.pattern.scale, originX: segment.pattern.originX, originY: segment.pattern.originY }, image: segment.image && { scale: segment.image.scale, cropWidth: segment.image.cropWidth, cropHeight: segment.image.cropHeight, localOrientation: segment.image.localOrientation } };
}
