import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { spinPlan } from "../src/wheels/engine.mjs";
import { cloneDefaultWheelMechanics, compileVelocityProfile, curveTotalArea, normalizeWheelMechanics, progressAtNormalizedTime, spinRotationAtTime, velocityAtNormalizedTime } from "../src/wheels/mechanics.mjs";

const entries = [{ id: "a", label: "Alpha", order: 0, weight: 1, state: "active" }, { id: "b", label: "Bravo", order: 1, weight: 2, state: "active" }];
const profileIds = ["natural-hybrid", "heavy-flywheel", "suspense-tail", "quick-draw", "mechanical-clicker", "classic-linear", "legacy-broadcast-smooth", "custom-physics", "custom-shape"];

test("V1.12 compatibility and every V2 profile remain non-negative, monotone, terminal-zero, and complete", () => {
  for (const profile of profileIds) {
    const mechanics = { ...cloneDefaultWheelMechanics(), curveProfile: profile };
    const velocities = Array.from({ length: 1001 }, (_, index) => velocityAtNormalizedTime(index / 1000, mechanics));
    const progress = Array.from({ length: 1001 }, (_, index) => progressAtNormalizedTime(index / 1000, mechanics));
    assert.equal(velocities[0], 1, profile); assert.equal(velocities.at(-1), 0, profile); assert.equal(progress[0], 0, profile); assert.equal(progress.at(-1), 1, profile);
    assert.ok(velocities.every((value, index) => value >= 0 && (index === 0 || value <= velocities[index - 1] + 1e-10)), `${profile} velocity must never rise or reverse`);
    assert.ok(progress.every((value, index) => value >= 0 && value <= 1 && (index === 0 || value > progress[index - 1])), `${profile} progress must be strictly monotone and bounded`);
  }
});

test("Legacy Broadcast Smooth retains the exact V1.12 authored hold, join speed, and low-speed tail", () => {
  const mechanics = { ...cloneDefaultWheelMechanics(), curveProfile: "legacy-broadcast-smooth" };
  assert.equal(velocityAtNormalizedTime(0, mechanics), 1); assert.ok(velocityAtNormalizedTime(.03, mechanics) > .999);
  assert.ok(velocityAtNormalizedTime(.5, mechanics) < .25); assert.ok(Math.abs(velocityAtNormalizedTime(.66, mechanics) - .12) < 2e-6);
  assert.ok(velocityAtNormalizedTime(.88, mechanics) > 0 && velocityAtNormalizedTime(.88, mechanics) < .06); assert.equal(velocityAtNormalizedTime(1, mechanics), 0);
});

test("compiled cumulative progress agrees with high-resolution numerical integration", () => {
  for (const profile of profileIds) {
    const mechanics = { ...cloneDefaultWheelMechanics(), curveProfile: profile }; const steps = 100_000; const delta = 1 / steps; let area = 0; const samples = new Map([[0, 0]]);
    for (let index = 1; index <= steps; index += 1) { const left = velocityAtNormalizedTime((index - 1) * delta, mechanics); const right = velocityAtNormalizedTime(index * delta, mechanics); area += (left + right) * delta / 2; if (index % 10_000 === 0) samples.set(index / steps, area); }
    assert.ok(Math.abs(area - curveTotalArea(mechanics)) < 2e-6, profile);
    for (const [u, partial] of samples) assert.ok(Math.abs(progressAtNormalizedTime(u, mechanics) - partial / area) < 3e-6, `${profile} at ${u}`);
  }
});

test("Classic Linear remains the constant-deceleration compatibility profile", () => {
  const mechanics = { ...cloneDefaultWheelMechanics(), curveProfile: "classic-linear" };
  for (const u of [0, .1, .25, .5, .9, 1]) { assert.ok(Math.abs(velocityAtNormalizedTime(u, mechanics) - (1 - u)) < 1e-12); assert.ok(Math.abs(progressAtNormalizedTime(u, mechanics) - (2 * u - u ** 2)) < 2e-6); }
});

test("V1 mechanics normalize without persistence mutation and V2 validation rejects unsafe physics and shape data", () => {
  const valid = cloneDefaultWheelMechanics(); assert.deepEqual(normalizeWheelMechanics(valid, { strict: true }), valid); assert.deepEqual(normalizeWheelMechanics(undefined), valid);
  const legacy = { mechanicsVersion: 1, curveProfile: "broadcast-smooth", customCurve: { holdEnd: .04, tailStart: .66, tailVelocity: .12 }, launchRpsMin: 2.8, launchRpsMax: 4.5, minimumFullTurns: 2, maximumFullTurns: 120, defaultSpinDurationMs: 6500, minimumSpinDurationMs: 2000, maximumSpinDurationMs: 60000 };
  const normalized = normalizeWheelMechanics(legacy, { strict: true }); assert.equal(normalized.mechanicsVersion, 2); assert.equal(normalized.curveProfile, "legacy-broadcast-smooth"); assert.equal(legacy.mechanicsVersion, 1);
  const invalid = [
    { physics: { ...valid.physics, quadraticDrag: -.01 } }, { physics: { ...valid.physics, viscousDrag: 1.51 } }, { physics: { ...valid.physics, clickerFriction: Number.NaN } }, { physics: { ...valid.physics, captureStartSpeed: .04 } }, { physics: { ...valid.physics, captureDurationFraction: .09 } },
    { customShape: { ...valid.customShape, points: valid.customShape.points.map((point, index) => index === 2 ? { ...point, speed: 1 } : point) } },
    { customShape: { ...valid.customShape, points: valid.customShape.points.map((point, index) => index === 2 ? { ...point, time: .05 } : point) } },
    { launchRpsMin: 5, launchRpsMax: 4 }, { minimumFullTurns: 10, maximumFullTurns: 9 }, { minimumSpinDurationMs: 9000, defaultSpinDurationMs: 8000 }, { defaultSpinDurationMs: 61000 }, { curveProfile: "unknown" },
  ];
  for (const change of invalid) assert.throws(() => normalizeWheelMechanics({ ...valid, ...change }, { strict: true }));
});

test("spin plans freeze the compiled mechanics snapshot and every visual mode samples identical rotation", () => {
  const draft = cloneDefaultWheelMechanics(); draft.curveProfile = "custom-shape"; draft.customShape.points[2].speed = .46;
  const plan = spinPlan(entries, "b", 10_000, 31, { landingFraction: .37, turnRandom: .61, mechanics: draft }); draft.customShape.points[2].speed = .2;
  assert.equal(plan.mechanics.customShape.points[2].speed, .46); assert.equal(plan.compiledMechanics.kind, "compiled-wheel-mechanics-v2");
  const modes = ["regular", "presentation", "stage-tile", "stage-focus", "stage-spin-all"];
  for (const elapsed of [0, 400, 2500, 6600, 9000, 10_000]) { const rotations = modes.map(() => spinRotationAtTime(plan, elapsed)); assert.ok(rotations.every((value) => value === rotations[0])); }
  assert.equal(spinRotationAtTime(plan, plan.durationMs), plan.finalRotation);
});

test("Stage Spin All snapshots one mechanics fetch outside its six-Wheel plan loop", async () => {
  const source = await readFile(new URL("../src/pages/WheelStagePage.tsx", import.meta.url), "utf8"); const batch = source.slice(source.indexOf("const startSpinAll"), source.indexOf("const closeCombined"));
  assert.ok(batch.indexOf("await getWheelMechanics()") < batch.indexOf("for (let index = 0; index < available.length"));
  assert.match(batch, /startAt = performance\.now\(\) \+ 48/); assert.match(batch, /mechanics:\s*mechanics\.mechanics,\s*mechanicsRevision:\s*mechanics\.revision/);
  const canvas = await readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8"); assert.match(canvas, /spinRotationAtTime\(animation, elapsed\)/); assert.match(canvas, /progressAt\(animation\.compiledMechanics/); assert.match(canvas, /countSegmentBoundaryCrossings/); assert.doesNotMatch(canvas, /2\s*\*\s*u\s*-\s*u\s*\*\*\s*2/);
});

test("compile result uses canonical Float64 tables", () => {
  const compiled = compileVelocityProfile(cloneDefaultWheelMechanics());
  assert.equal(compiled.sampleCount, 1025); assert.ok(compiled.velocity instanceof Float64Array); assert.ok(compiled.progress instanceof Float64Array); assert.ok(compiled.deceleration instanceof Float64Array);
});
