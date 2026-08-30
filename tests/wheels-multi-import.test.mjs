import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMultiWheelImportPlan, preflightMultiWheelImport } from "../src/wheels/multiWheelImport.mjs";
import { parseWheelImport, THIRD_RAIL_GOLD_CONFIG } from "../src/wheels/portable.mjs";

test("sanitized supplied-shape file preserves both weighted configurations and title fallback", async () => {
  const file = new URL("./fixtures/wheel-of-names-two-config-sanitized.wheel", import.meta.url); const parsed = await parseWheelImport(await readFile(file), { sourceName: "Wheel-June-3.wheel", defaultConfig: THIRD_RAIL_GOLD_CONFIG });
  assert.equal(parsed.proposals.length, 2); assert.equal(parsed.proposals[0].title, "Wheel-aug29"); assert.equal(parsed.proposals[1].title, "Wheel-June 3 — Wheel 02");
  assert.deepEqual(parsed.proposals.map((proposal) => [proposal.entries.length, proposal.summary.totalWeight]), [[41, 870], [34, 61]]);
  assert.equal(parsed.proposals[0].media.center.mimeType, "image/webp"); assert.equal(parsed.proposals[1].media.center, null);
  const individual = createMultiWheelImportPlan(parsed, { mode: "individual" }); assert.equal(individual.wheels.length, 2); assert.equal(individual.stages.length, 0); assert.equal(individual.recordsCreatedDuringPreview, 0);
  const stage = createMultiWheelImportPlan(parsed, { mode: "stages" }); assert.equal(stage.stages.length, 1); assert.equal(stage.stages[0].wheels.length, 2);
});

test("multi-config Stage plans split exactly at six with no loss or duplicate", async () => {
  for (const count of [1, 2, 6, 7, 12, 14]) {
    const parsed = await parseWheelImport(JSON.stringify(fixture(count)), { sourceName: "Batch.wheel", defaultConfig: THIRD_RAIL_GOLD_CONFIG });
    const individual = createMultiWheelImportPlan(parsed, { mode: "individual" }); assert.equal(individual.wheels.length, count);
    const plan = createMultiWheelImportPlan(parsed, { mode: "stages" }); assert.equal(plan.stages.flatMap((stage) => stage.wheels).length, count); assert.ok(plan.stages.every((stage) => stage.wheels.length <= 6)); assert.equal(new Set(plan.stages.flatMap((stage) => stage.wheels.map((wheel) => wheel.sourceIndex))).size, count);
    if (count === 14) { assert.deepEqual(plan.stages.map((stage) => stage.wheels.length), [6, 6, 2]); assert.deepEqual(plan.stages.map((stage) => stage.title), ["Sanitized Batch — Stage 1", "Sanitized Batch — Stage 2", "Sanitized Batch — Stage 3"]); }
  }
});

test("creator allowance preflight rejects before writes", () => {
  const plan = { mode: "stages", wheels: Array(7), stages: Array(2) };
  assert.deepEqual(preflightMultiWheelImport(plan, { maximumOwnedWheels: 10, ownedWheelCount: 4, maximumOwnedStages: 20, ownedStageCount: 1 }).ok, false);
  assert.equal(preflightMultiWheelImport(plan, { maximumOwnedWheels: 12, ownedWheelCount: 4, maximumOwnedStages: 3, ownedStageCount: 1 }).ok, true);
});

function fixture(count) { return { title: "Sanitized Batch", wheelConfigs: Array.from({ length: count }, (_, index) => ({ title: `Sanitized Wheel ${String(index + 1).padStart(2, "0")}`, entries: [{ text: `Entrant ${index + 1}A`, weight: 1 }, { text: `Entrant ${index + 1}B`, weight: 2 }] })) }; }
