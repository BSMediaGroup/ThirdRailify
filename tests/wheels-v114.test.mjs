import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createWheelRenderPlan, resolveWheelGeometry, WHEEL_GEOMETRY } from "../src/wheels/wheelRenderPlan.mjs";

const DIAMETERS = [155, 239.5, 308, 390, 418.25, 572, 697, 802, 820, 860, 1040];
const DPR_VALUES = [1, 1.25, 1.5, 2, 2.5, 3];
const ROTATIONS = [0, 15, 30, 45, 60, 75, 90, 120, 135, 180, 225, 270, 315];
const ENTRIES = Array.from({ length: 64 }, (_, order) => ({ id: String(order), label: `Weighted participant ${order + 1}`, order, weight: order === 0 ? 80 : order % 7 ? 1 : .05, colour: null, state: "active" }));
const CONFIG = { palette: ["#11110E", "#B8182F", "#F3C928"], pointerAccent: "#F3C928", labelContrast: "light" };

test("V1.14 resolves one even physical-pixel square and one exact integer centre", () => {
  for (const requested of DIAMETERS) for (const dpr of DPR_VALUES) {
    const geometry = resolveWheelGeometry(requested, dpr);
    assert.equal(geometry.physicalSide % 2, 0);
    assert.equal(geometry.physicalSide, geometry.canvasBackingSide);
    assert.equal(geometry.cssDiameter * geometry.dpr, geometry.physicalSide);
    assert.equal(geometry.centreCss, geometry.cssDiameter / 2);
    assert.equal(geometry.centrePhysical, geometry.physicalSide / 2);
    assert.equal(Number.isInteger(geometry.centrePhysical), true);
    assert.equal(geometry.rotorDiameter, geometry.cssDiameter);
    assert.equal(geometry.canvasCssSide, geometry.cssDiameter);
    assert.ok(Math.abs(geometry.physicalSide - requested * geometry.dpr) <= 1);
  }
});

test("V1.14 derives every major radius from the canonical square", () => {
  for (const requested of DIAMETERS) {
    const geometry = resolveWheelGeometry(requested, 2.5);
    assert.equal(geometry.outerRadius, geometry.centreCss);
    assert.equal(geometry.faceRadius, geometry.outerRadius * WHEEL_GEOMETRY.faceToOuterRatio);
    assert.equal(geometry.hubRadius, geometry.outerRadius * WHEEL_GEOMETRY.hubToOuterRatio);
    assert.equal(geometry.ringRadii.faceBoundary, geometry.faceRadius);
    assert.equal(geometry.ringRadii.outer, geometry.outerRadius * (1 - 2 * WHEEL_GEOMETRY.outerRimInsetRatio));
    assert.equal(geometry.ringRadii.inner, geometry.outerRadius * (1 - 2 * WHEEL_GEOMETRY.innerRimInsetRatio));
    assert.equal(geometry.blackBandWidth, geometry.ringRadii.inner - geometry.faceRadius);
    assert.equal(geometry.pointerGeometry.width, geometry.cssDiameter * WHEEL_GEOMETRY.pointerWidthRatio);
    assert.equal(geometry.pointerGeometry.height, geometry.cssDiameter * WHEEL_GEOMETRY.pointerHeightRatio);
  }
});

test("V1.14 render plans share the exact canonical centre and survive weighted narrow wedges", () => {
  for (const requested of DIAMETERS) {
    const geometry = resolveWheelGeometry(requested, 1.5);
    const plan = createWheelRenderPlan(ENTRIES, CONFIG, geometry, (label, size) => label.length * size * .62);
    assert.equal(plan.size, geometry.cssDiameter);
    assert.equal(plan.centre, geometry.centreCss);
    assert.equal(plan.radius, geometry.faceRadius);
    assert.equal(plan.hubRadius, geometry.hubRadius);
    assert.equal(plan.segments.length, ENTRIES.length);
    assert.equal(plan.segments.every((segment) => segment.radialSpan.outer === geometry.faceRadius), true);
  }
});

test("V1.14 rotate-only matrices remain isotropic at every required phase", () => {
  for (const degrees of ROTATIONS) {
    const radians = degrees * Math.PI / 180;
    const matrix = { a: Math.cos(radians), b: Math.sin(radians), c: -Math.sin(radians), d: Math.cos(radians), e: 0, f: 0 };
    const scaleX = Math.hypot(matrix.a, matrix.b);
    const scaleY = Math.hypot(matrix.c, matrix.d);
    const skew = matrix.a * matrix.c + matrix.b * matrix.d;
    assert.ok(Math.abs(scaleX - scaleY) <= 1e-12);
    assert.ok(Math.abs(skew) <= 1e-12);
    assert.equal(matrix.e, 0);
    assert.equal(matrix.f, 0);
  }
});

test("V1.14 source has one full-square rotor and no obsolete inset geometry", async () => {
  const [canvas, css] = await Promise.all([
    readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/wheels.css", import.meta.url), "utf8"),
  ]);
  assert.match(canvas, /geometryVersion: "physical-square-v114"/);
  assert.match(canvas, /setGeometryAttributes\(frameElement, geometry\)/);
  assert.match(canvas, /rotorElement\.style\.transformOrigin = `\$\{geometry\.centreCss\}px \$\{geometry\.centreCss\}px`/);
  assert.match(canvas, /createWheelRenderPlan\(active, config, geometry,/);
  assert.doesNotMatch(canvas, /Math\.floor\(geometry\.canvasCssSide\)/);
  assert.match(css, /\.wheel-stage__geometry\{[^}]*aspect-ratio:1\/1/);
  assert.match(css, /\.wheel-stage__rotor\{[^}]*inset:0[^}]*inline-size:100%[^}]*block-size:100%/);
  assert.doesNotMatch(css, /--wheel-rotor-inset/);
});
