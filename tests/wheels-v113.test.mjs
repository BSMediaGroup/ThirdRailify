import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createWheelRenderPlan, resolveWheelGeometry, WHEEL_GEOMETRY } from "../src/wheels/wheelRenderPlan.mjs";

const DIAMETERS = [240, 280, 320, 390, 480, 640, 820, 1024, 1280];
const DPR_VALUES = [1, 1.25, 1.5, 2, 3];

test("V1.13 canonical radial geometry remains proportional and monotonic", () => {
  let previous = null;
  for (const diameter of DIAMETERS) {
    const geometry = resolveWheelGeometry(diameter, 1);
    assert.equal(geometry.diameter, diameter);
    assert.equal(geometry.outerRadius, diameter / 2);
    assert.ok(Math.abs(geometry.faceDiameter / geometry.outerDiameter - WHEEL_GEOMETRY.faceToOuterRatio) < 1e-12);
    assert.ok(Math.abs(geometry.hubRadius / geometry.outerRadius - WHEEL_GEOMETRY.hubToOuterRatio) < 1e-12);
    assert.ok(geometry.faceRadius > geometry.hubRadius && geometry.faceRadius < geometry.outerRadius);
    assert.ok(geometry.rotorDiameter > geometry.faceDiameter && geometry.rotorDiameter < geometry.outerDiameter);
    assert.ok(geometry.canvasBackingSide > 0 && Number.isInteger(geometry.canvasBackingSide));
    if (previous) {
      assert.ok(geometry.outerRadius > previous.outerRadius);
      assert.ok(geometry.faceRadius > previous.faceRadius);
      assert.ok(geometry.hubRadius > previous.hubRadius);
      assert.ok(geometry.rotorDiameter > previous.rotorDiameter);
    }
    previous = geometry;
  }
});

test("V1.13 Canvas backing side is one bounded DPR-derived scalar", () => {
  for (const diameter of DIAMETERS) for (const dpr of DPR_VALUES) {
    const geometry = resolveWheelGeometry(diameter, dpr);
    const boundedDpr = Math.min(dpr, WHEEL_GEOMETRY.dprCap);
    assert.equal(geometry.dpr, boundedDpr);
    assert.equal(geometry.canvasBackingSide, Math.round(geometry.canvasCssSide * boundedDpr));
  }
});

test("V1.13 render plans use the canonical outer geometry at every size", () => {
  const entries = Array.from({ length: 8 }, (_, order) => ({ id: String(order), label: `Entry ${order + 1}`, order, weight: 1, colour: null, state: "active" }));
  const config = { palette: ["#11110E", "#B8182F"], pointerAccent: "#F3C928", labelContrast: "light" };
  for (const diameter of DIAMETERS) {
    const geometry = resolveWheelGeometry(diameter, 1);
    const plan = createWheelRenderPlan(entries, config, geometry.canvasCssSide, (label, size) => label.length * size * .62, new Map(), diameter);
    assert.ok(Math.abs(plan.radius * 2 / diameter - WHEEL_GEOMETRY.faceToOuterRatio) < 1e-12);
    assert.ok(Math.abs(plan.hubRadius / (diameter / 2) - WHEEL_GEOMETRY.hubToOuterRatio) < 1e-12);
    assert.equal(plan.faceToOuterRatio, WHEEL_GEOMETRY.faceToOuterRatio);
    assert.equal(plan.hubToOuterRatio, WHEEL_GEOMETRY.hubToOuterRatio);
  }
});

test("V1.13 source observes the stable frame and contains no one-axis Stage clamp", async () => {
  const [canvas, wheelCss, stageCss, stageV11Css] = await Promise.all([
    readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wheels.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wheels-stage.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wheels-stage-v11.css", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /observer\.observe\(frameElement\)/);
  assert.doesNotMatch(canvas, /observer\.observe\(rotorElement\)/);
  assert.match(canvas, /data-wheel-geometry="canonical-square-v113"/);
  assert.match(wheelCss, /inset:var\(--wheel-rotor-inset,3\.9%\)/);
  assert.match(wheelCss, /aspect-ratio:1\/1/);
  assert.doesNotMatch(wheelCss, /\.wheel-stage\{padding:3\.9%/);
  assert.doesNotMatch(stageCss, /\.stage-wheel-tile__canvas \.wheel-stage\{[^}]*max-height:100%/);
  assert.doesNotMatch(stageV11Css, /\.stage-wheel-tile__canvas\{overflow:hidden\}/);
});
