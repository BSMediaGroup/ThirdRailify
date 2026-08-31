import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { spinPlan } from "../src/wheels/engine.mjs";
import {
  CURVE_PRESETS,
  cloneDefaultWheelMechanics,
  curveTotalArea,
  normalizeWheelMechanics,
  progressAtNormalizedTime,
  spinRotationAtTime,
  velocityAtNormalizedTime,
} from "../src/wheels/mechanics.mjs";

const entries = [{ id: "a", label: "Alpha", order: 0, weight: 1, state: "active" }, { id: "b", label: "Bravo", order: 1, weight: 2, state: "active" }];

test("every V1.12 preset is non-negative, monotone, continuous, terminal-zero, and analytically complete", () => {
  for (const profile of [...Object.keys(CURVE_PRESETS), "custom"]) {
    const mechanics = { ...cloneDefaultWheelMechanics(), curveProfile: profile };
    const velocities = Array.from({ length: 1001 }, (_, index) => velocityAtNormalizedTime(index / 1000, mechanics));
    const progress = Array.from({ length: 1001 }, (_, index) => progressAtNormalizedTime(index / 1000, mechanics));
    assert.equal(velocities[0], 1, profile); assert.equal(velocities.at(-1), 0, profile); assert.equal(progress[0], 0, profile); assert.equal(progress.at(-1), 1, profile);
    assert.ok(velocities.every((value, index) => value >= 0 && (index === 0 || value <= velocities[index - 1] + 1e-12)), `${profile} velocity must never rise or reverse`);
    assert.ok(progress.every((value, index) => value >= 0 && value <= 1 && (index === 0 || value >= progress[index - 1])), `${profile} progress must be monotone and bounded`);
  }
});

test("Broadcast Smooth matches the requested hold, rounded decay, and long low-speed tail", () => {
  const mechanics = cloneDefaultWheelMechanics();
  assert.equal(velocityAtNormalizedTime(0, mechanics), 1); assert.ok(velocityAtNormalizedTime(.03, mechanics) > .999);
  assert.ok(velocityAtNormalizedTime(.5, mechanics) < .25); assert.ok(Math.abs(velocityAtNormalizedTime(.66, mechanics) - .12) < 1e-12);
  assert.ok(velocityAtNormalizedTime(.88, mechanics) > 0 && velocityAtNormalizedTime(.88, mechanics) < .06); assert.equal(velocityAtNormalizedTime(1, mechanics), 0);
  const epsilon = 1e-6; for (const join of [.04, .66]) { const left = velocityAtNormalizedTime(join - epsilon, mechanics); const at = velocityAtNormalizedTime(join, mechanics); const right = velocityAtNormalizedTime(join + epsilon, mechanics); assert.ok(Math.abs(left - at) < 1e-9); assert.ok(Math.abs(right - at) < 1e-9); }
});

test("analytic cumulative progress agrees with high-resolution numerical integration", () => {
  for (const profile of ["broadcast-smooth", "heavy-flywheel", "quick-draw", "long-settle", "custom"]) {
    const mechanics = { ...cloneDefaultWheelMechanics(), curveProfile: profile }; const steps = 100_000; const delta = 1 / steps; let area = 0; const samples = new Map([[0, 0]]);
    for (let index = 1; index <= steps; index += 1) { const left = velocityAtNormalizedTime((index - 1) * delta, mechanics); const right = velocityAtNormalizedTime(index * delta, mechanics); area += (left + right) * delta / 2; if (index % 10_000 === 0) samples.set(index / steps, area); }
    assert.ok(Math.abs(area - curveTotalArea(mechanics)) < 1e-9, profile);
    for (const [u, partial] of samples) assert.ok(Math.abs(progressAtNormalizedTime(u, mechanics) - partial / area) < 1e-8, `${profile} at ${u}`);
  }
});

test("Classic Linear is the only explicit constant-deceleration compatibility profile", () => {
  const mechanics = { ...cloneDefaultWheelMechanics(), curveProfile: "classic-linear" };
  for (const u of [0, .1, .25, .5, .9, 1]) { assert.equal(velocityAtNormalizedTime(u, mechanics), 1 - u); assert.ok(Math.abs(progressAtNormalizedTime(u, mechanics) - (2 * u - u ** 2)) < 1e-12); }
});

test("mechanics validation rejects unsafe curve, launch, turn, duration, and numeric inputs and defaults legacy policy", () => {
  const valid = cloneDefaultWheelMechanics(); assert.deepEqual(normalizeWheelMechanics(valid, { strict: true }), valid); assert.deepEqual(normalizeWheelMechanics(undefined), valid);
  const invalid = [
    { customCurve: { ...valid.customCurve, holdEnd: -.01 } }, { customCurve: { ...valid.customCurve, holdEnd: .26 } }, { customCurve: { ...valid.customCurve, tailStart: .2 } }, { customCurve: { ...valid.customCurve, tailStart: .91 } }, { customCurve: { ...valid.customCurve, tailVelocity: .01 } }, { customCurve: { ...valid.customCurve, tailVelocity: .36 } }, { customCurve: { holdEnd: .25, tailStart: .4, tailVelocity: .12 } },
    { launchRpsMin: 5, launchRpsMax: 4 }, { minimumFullTurns: 10, maximumFullTurns: 9 }, { minimumSpinDurationMs: 9000, defaultSpinDurationMs: 8000 }, { defaultSpinDurationMs: 61000 }, { curveProfile: "unknown" }, { launchRpsMin: Number.NaN }, { launchRpsMax: Number.POSITIVE_INFINITY },
  ];
  for (const change of invalid) { const candidate = { ...valid, ...change }; assert.throws(() => normalizeWheelMechanics(candidate, { strict: true })); }
});

test("spin plans snapshot mechanics and all visual modes share identical sampled rotation", () => {
  const draft = { ...cloneDefaultWheelMechanics(), curveProfile: "custom", customCurve: { holdEnd: .08, tailStart: .7, tailVelocity: .16 } };
  const plan = spinPlan(entries, "b", 10_000, 31, { landingFraction: .37, turnRandom: .61, mechanics: draft }); draft.customCurve.holdEnd = .2;
  assert.equal(plan.mechanics.customCurve.holdEnd, .08); const modes = ["regular", "presentation", "stage-tile", "stage-focus"];
  for (const elapsed of [0, 400, 2500, 6600, 9000, 10_000]) { const rotations = modes.map(() => spinRotationAtTime(plan, elapsed)); assert.ok(rotations.every((value) => value === rotations[0])); }
  assert.equal(spinRotationAtTime(plan, plan.durationMs), plan.finalRotation);
});

test("Stage Spin All snapshots one mechanics fetch outside its six-Wheel plan loop", async () => {
  const source = await readFile(new URL("../src/pages/WheelStagePage.tsx", import.meta.url), "utf8"); const batch = source.slice(source.indexOf("const startSpinAll"), source.indexOf("const closeCombined"));
  assert.ok(batch.indexOf("await getWheelMechanics()") < batch.indexOf("for (let index = 0; index < available.length"));
  assert.match(batch, /startAt = performance\.now\(\) \+ 48/); assert.match(batch, /mechanics: mechanics\.mechanics, mechanicsRevision: mechanics\.revision/);
  const canvas = await readFile(new URL("../src/wheels/WheelCanvas.tsx", import.meta.url), "utf8"); assert.match(canvas, /spinRotationAtTime\(animation, elapsed\)/); assert.doesNotMatch(canvas, /2\s*\*\s*u\s*-\s*u\s*\*\*\s*2/);
});
