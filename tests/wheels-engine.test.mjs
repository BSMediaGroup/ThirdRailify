import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { entryAngles, entryAtPointer, formatProbability, hitTestWheel, participantOdds, secureBoundedInteger, secureShuffle, selectWeightedEntry, spinPlan } from "../src/wheels/engine.mjs";

const entries = [
  { id: "a", label: "Duplicate", order: 0, weight: 1, colour: "#F3C928", state: "active" },
  { id: "b", label: "Duplicate", order: 1, weight: 2, colour: "#B8182F", state: "active" },
  { id: "h", label: "Hidden", order: 2, weight: 100, colour: null, state: "hidden" },
];

test("weighted selection boundaries include duplicate labels by immutable entry ID and exclude hidden entries", () => {
  const at = (value) => (array) => { array[0] = value; return array; };
  assert.equal(selectWeightedEntry(entries, at(0)).id, "a");
  assert.equal(selectWeightedEntry(entries, at(1)).id, "b");
  assert.equal(selectWeightedEntry(entries, at(2)).id, "b");
  assert.notEqual(entries[0].id, entries[1].id); assert.equal(entries[0].label, entries[1].label);
});

test("rejection sampling rejects the modulo-bias tail and validates invalid bounds", () => {
  let calls = 0; const sequence = [0xffffffff, 7];
  assert.equal(secureBoundedInteger(10, (array) => { array[0] = sequence[calls++]; return array; }), 7);
  assert.equal(calls, 2); assert.throws(() => secureBoundedInteger(0)); assert.throws(() => selectWeightedEntry([{ ...entries[0], weight: 0 }]));
});

test("deterministic spin plans land the selected segment beneath the top pointer with bounded motion", () => {
  const plan = spinPlan(entries, "b", 50_000, 17, 7); assert.equal(plan.turns, 7); assert.equal(plan.durationMs, 20_000);
  const segment = entryAngles(entries).find((item) => item.entry.id === "b"); const rotation = plan.finalRotation * Math.PI / 180;
  const worldCentre = normalize(segment.centre - Math.PI / 2 + rotation); assert.ok(Math.abs(normalize(worldCentre - (-Math.PI / 2))) < 1e-9);
  const single = [{ ...entries[0], weight: 1 }]; assert.equal(spinPlan(single, "a", 100, 0, 6).durationMs, 2000);
});

test("secure shuffle is deterministic with injected Web Crypto values and supports 1000 entries", () => {
  const large = Array.from({ length: 1000 }, (_, index) => index); const shuffled = secureShuffle(large, (array) => { array[0] = 0; return array; });
  assert.equal(shuffled.length, 1000); assert.deepEqual([...shuffled].sort((a, b) => a - b), large); assert.notDeepEqual(shuffled, large);
});

test("winner-selection source never calls Math.random", async () => {
  const source = await readFile(new URL("../src/wheels/engine.mjs", import.meta.url), "utf8"); assert.doesNotMatch(source, /Math\.random\s*\(/); assert.match(source, /crypto\.getRandomValues/);
});

test("pointer target resolves exact weighted geometry across normalized rotations and boundaries", () => {
  assert.equal(entryAtPointer(entries, 0).id, "a", "zero rotation begins in the first segment");
  assert.equal(entryAtPointer(entries, -121).id, "b", "negative rotation is normalized");
  assert.equal(entryAtPointer(entries, 239 + 360 * 20).id, "b", "large positive rotations are normalized");
  assert.equal(entryAtPointer(entries, .001).id, "b", "a positive boundary crossing wraps to the last segment");
  assert.equal(entryAtPointer(entries, -.001).id, "a", "a negative boundary crossing remains in the first segment");
  assert.equal(entryAtPointer(entries, -121).weight, 2, "weighted segment width, not DOM order, determines the target");
});

test("rotation-aware wheel hit testing ignores centre and exterior clicks", () => {
  const equal = Array.from({ length: 4 }, (_, index) => ({ id: String(index), label: String(index), order: index, weight: 1, colour: null, state: "active" }));
  assert.equal(hitTestWheel(equal, { x: 100, y: 10 }, 200, 0).id, "0", "top point selects the first segment");
  assert.equal(hitTestWheel(equal, { x: 190, y: 100 }, 200, 0).id, "1", "right point selects the second segment");
  assert.equal(hitTestWheel(equal, { x: 190, y: 100 }, 200, 90).id, "0", "rotation is subtracted from click geometry");
  assert.equal(hitTestWheel(equal, { x: 100, y: 100 }, 200, 0), null, "centre medallion is ignored");
  assert.equal(hitTestWheel(equal, { x: 201, y: 100 }, 200, 0), null, "outside wheel is ignored");
});

test("settled spin winner and pointer target agree", () => {
  const plan = spinPlan(entries, "b", 6500, -27, 6);
  assert.equal(entryAtPointer(entries, plan.finalRotation).id, "b");
});

test("weighted odds exclude hidden entries and combine exact duplicate labels", () => {
  const first = participantOdds(entries, "a"); const second = participantOdds(entries, "b"); const hidden = participantOdds(entries, "h");
  assert.equal(first.totalWeight, 3); assert.equal(first.eligibleCount, 2); assert.equal(first.probability, 1 / 3); assert.equal(second.probability, 2 / 3);
  assert.equal(first.combinedWeight, 3); assert.equal(first.combinedProbability, 1); assert.equal(hidden.probability, 0);
  assert.deepEqual(Object.keys(first).sort(), ["combinedProbability", "combinedWeight", "eligibleCount", "entry", "probability", "totalWeight"], "odds projection contains no private metadata");
});

test("odds formatting is adaptive and never rounds a positive chance to zero", () => {
  assert.equal(formatProbability(1), "100%"); assert.equal(formatProbability(.125), "12.5%"); assert.equal(formatProbability(1 / 6), "16.67%"); assert.equal(formatProbability(1 / 1000), "0.1%"); assert.equal(formatProbability(1 / 1_000_000), "<0.01%"); assert.equal(formatProbability(0), "0%");
});

function normalize(value) { const turn = Math.PI * 2; let next = value % turn; if (next > Math.PI) next -= turn; if (next < -Math.PI) next += turn; return next; }
