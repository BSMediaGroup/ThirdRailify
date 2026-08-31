import assert from "node:assert/strict";
import test from "node:test";
import { spinPlan } from "../src/wheels/engine.mjs";
import {
  PHYSICS_PRESETS,
  calculateNaturalnessDiagnostics,
  clickerActivation,
  cloneDefaultWheelMechanics,
  compileCustomShape,
  compileVelocityProfile,
  decelerationAt,
  normalizeWheelMechanics,
  progressAt,
  rotationAt,
  velocityAt,
} from "../src/wheels/mechanics.mjs";

const times = [.1, .25, .5, .75, .9, .97];
const entries = [{ id: "a", label: "Alpha", order: 0, weight: 1, state: "active" }, { id: "b", label: "Bravo", order: 1, weight: 2, state: "active" }];

test("Natural Hybrid compiles deterministic RK4 physics into safe terminal-zero tables", () => {
  const first = compileVelocityProfile(cloneDefaultWheelMechanics()); const second = compileVelocityProfile(cloneDefaultWheelMechanics());
  assert.deepEqual(first.velocity, second.velocity); assert.deepEqual(first.progress, second.progress); assert.deepEqual(first.deceleration, second.deceleration);
  assert.equal(first.velocity[0], 1); assert.equal(first.velocity.at(-1), 0); assert.equal(first.progress[0], 0); assert.equal(first.progress.at(-1), 1);
  assert.ok(first.velocity.every((value, index) => Number.isFinite(value) && value >= 0 && (index === 0 || value <= first.velocity[index - 1] + 1e-10)));
  assert.ok(first.progress.every((value, index) => Number.isFinite(value) && value >= 0 && value <= 1 && (index === 0 || value > first.progress[index - 1])));
  assert.equal(first.captureDerivativeScale, 1); assert.ok(first.captureStartU >= .9); assert.ok(velocityAt(first, first.captureStartU) <= first.mechanics.physics.captureStartSpeed + 1e-6);
  assert.equal(velocityAt(first, 1), 0); assert.equal(decelerationAt(first, 1), 0);
});

test("smooth clicker activation has flat bounded endpoints and no torque step", () => {
  const physics = cloneDefaultWheelMechanics().physics; const low = physics.clickerOnsetSpeed; const high = low + physics.clickerBlendWidth;
  assert.equal(clickerActivation(low - .01, physics), 1); assert.equal(clickerActivation(high + .01, physics), 0);
  const epsilon = 1e-6;
  assert.ok(Math.abs(clickerActivation(low - epsilon, physics) - clickerActivation(low + epsilon, physics)) < 1e-8);
  assert.ok(Math.abs(clickerActivation(high - epsilon, physics) - clickerActivation(high + epsilon, physics)) < 1e-8);
  const samples = Array.from({ length: 1001 }, (_, index) => clickerActivation(index / 1000, physics));
  assert.ok(samples.every((value, index) => value >= 0 && value <= 1 && (index === 0 || value <= samples[index - 1] + 1e-12)));
});

test("RK4 step refinement and 513/1025/2049 canonical resampling converge", () => {
  const mechanics = cloneDefaultWheelMechanics(); const coarseOde = compileVelocityProfile(mechanics, { odeStep: 1 / 1024 }); const productionOde = compileVelocityProfile(mechanics, { odeStep: 1 / 2048 }); const fineOde = compileVelocityProfile(mechanics, { odeStep: 1 / 4096 });
  for (const u of times) { assert.ok(Math.abs(velocityAt(coarseOde, u) - velocityAt(productionOde, u)) < 5e-9); assert.ok(Math.abs(velocityAt(productionOde, u) - velocityAt(fineOde, u)) < 5e-9); }
  const sample513 = compileVelocityProfile(mechanics, { sampleCount: 513 }); const sample1025 = compileVelocityProfile(mechanics, { sampleCount: 1025 }); const sample2049 = compileVelocityProfile(mechanics, { sampleCount: 2049 });
  for (const u of times) { assert.ok(Math.abs(progressAt(sample1025, u) - progressAt(sample2049, u)) < 1e-6); assert.ok(Math.abs(progressAt(sample513, u) - progressAt(sample2049, u)) < 3e-6); }
});

test("physics bounds reject non-finite and impossible inputs without an unbounded solver", () => {
  const valid = cloneDefaultWheelMechanics();
  for (const physics of [{ ...valid.physics, quadraticDrag: Infinity }, { ...valid.physics, viscousDrag: .01 }, { ...valid.physics, clickerFriction: 0 }, { ...valid.physics, clickerOnsetSpeed: .5 }, { ...valid.physics, clickerBlendWidth: .01 }, { ...valid.physics, captureDurationFraction: 0 }]) assert.throws(() => compileVelocityProfile({ ...valid, curveProfile: "custom-physics", physics }));
  assert.throws(() => compileVelocityProfile(valid, { odeStep: 1 / 32 })); assert.throws(() => compileVelocityProfile(valid, { sampleCount: 1024 }));
});

test("custom shape uses deterministic monotone PCHIP with locked endpoints and no overshoot", () => {
  const points = cloneDefaultWheelMechanics().customShape.points.map((point) => ({ ...point })); const compiled = compileCustomShape(points); const serialized = JSON.stringify(points);
  assert.equal(velocityAt(compiled, 0), 1); assert.equal(velocityAt(compiled, 1), 0); assert.deepEqual(JSON.stringify(points), serialized);
  for (let index = 0; index <= 5000; index += 1) { const value = velocityAt(compiled, index / 5000); assert.ok(value >= 0 && value <= 1); if (index) assert.ok(value <= velocityAt(compiled, (index - 1) / 5000) + 1e-10); }
  const valid = cloneDefaultWheelMechanics();
  assert.throws(() => normalizeWheelMechanics({ ...valid, customShape: { ...valid.customShape, points: points.map((point, index) => index === 0 ? { ...point, speed: .9 } : point) } }, { strict: true }));
  assert.throws(() => normalizeWheelMechanics({ ...valid, customShape: { ...valid.customShape, points: points.map((point, index) => index === points.length - 1 ? { ...point, speed: .01 } : point) } }, { strict: true }));
});

test("built-in preset silhouettes are materially different at representative times", () => {
  const profiles = Object.keys(PHYSICS_PRESETS); const vectors = new Map();
  for (const profile of profiles) { const mechanics = cloneDefaultWheelMechanics(); mechanics.curveProfile = profile; vectors.set(profile, times.map((u) => velocityAt(compileVelocityProfile(mechanics), u))); }
  for (let left = 0; left < profiles.length; left += 1) for (let right = left + 1; right < profiles.length; right += 1) {
    const a = vectors.get(profiles[left]); const b = vectors.get(profiles[right]); const maximumDifference = Math.max(...a.map((value, index) => Math.abs(value - b[index])));
    assert.ok(maximumDifference >= .04, `${profiles[left]} and ${profiles[right]} differ by only ${maximumDifference}`);
  }
});

test("Natural Hybrid terminal metrics are softer than the V1.12 authored ending", () => {
  const natural = compileVelocityProfile(cloneDefaultWheelMechanics()); const legacyConfig = cloneDefaultWheelMechanics(); legacyConfig.curveProfile = "legacy-broadcast-smooth"; const legacy = compileVelocityProfile(legacyConfig);
  const naturalTail = terminalMetrics(natural); const legacyTail = terminalMetrics(legacy);
  assert.ok(naturalTail.peakDeceleration < legacyTail.peakDeceleration); assert.ok(naturalTail.peakJerk < legacyTail.peakJerk); assert.ok(naturalTail.captureSpeed < legacyTail.captureSpeed);
  const naturalIntervals = finalClickIntervals(natural); const legacyIntervals = finalClickIntervals(legacy);
  assert.ok(naturalIntervals.at(-1) / naturalIntervals.at(-2) < legacyIntervals.at(-1) / legacyIntervals.at(-2));
  const diagnostics = calculateNaturalnessDiagnostics(natural); assert.equal(diagnostics.handbrakeRisk, false); assert.equal(diagnostics.checks.softTerminalStop, true); assert.equal(diagnostics.checks.suspenseTailPresent, true);
});

test("30/60/90/120/144Hz schedules sample identical elapsed-time physics and exact final landing", () => {
  const plan = spinPlan(entries, "b", 10_000, 27, { landingFraction: .37, turnRandom: .61 }); const matchedTimes = [0, 1000, 5000, 9000, 10_000]; const baseline = matchedTimes.map((elapsed) => rotationAt(plan, elapsed));
  for (const hz of [30, 60, 90, 120, 144]) {
    const schedule = Array.from({ length: Math.ceil(plan.durationMs / 1000 * hz) + 1 }, (_, index) => Math.min(plan.durationMs, index * 1000 / hz));
    assert.equal(rotationAt(plan, schedule.at(-1)), plan.finalRotation);
    const sampled = matchedTimes.map((elapsed) => { const rendered = schedule.find((value) => Math.abs(value - elapsed) < 1e-8); assert.notEqual(rendered, undefined); return rotationAt(plan, rendered); });
    assert.deepEqual(sampled, baseline);
  }
  assert.equal(rotationAt(plan, plan.durationMs), plan.finalRotation); assert.equal(velocityAt(plan.compiledMechanics, 1), 0);
});

function terminalMetrics(compiled) { const start = Math.floor(.9 * (compiled.sampleCount - 1)); const step = 1 / (compiled.sampleCount - 1); let peakDeceleration = 0; let peakJerk = 0; let previous = compiled.deceleration[start]; for (let index = start; index < compiled.sampleCount; index += 1) { peakDeceleration = Math.max(peakDeceleration, compiled.deceleration[index]); if (index > start) peakJerk = Math.max(peakJerk, Math.abs(compiled.deceleration[index] - previous) / step); previous = compiled.deceleration[index]; } return { peakDeceleration, peakJerk, captureSpeed: velocityAt(compiled, compiled.captureStartU) }; }
function finalClickIntervals(compiled) { const crossings = 240; const times = []; for (let index = crossings - 5; index <= crossings; index += 1) times.push(inverseProgress(compiled.progress, index / crossings)); return times.slice(1).map((value, index) => (value - times[index]) * 10_000); }
function inverseProgress(table, target) { let low = 0; let high = table.length - 1; while (high - low > 1) { const middle = (low + high) >> 1; if (table[middle] < target) low = middle; else high = middle; } const span = table[high] - table[low]; return (low + (target - table[low]) / span) / (table.length - 1); }
