import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { entryAngles, secureBoundedInteger, secureShuffle, selectWeightedEntry, spinPlan } from "../src/wheels/engine.mjs";

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

function normalize(value) { const turn = Math.PI * 2; let next = value % turn; if (next > Math.PI) next -= turn; if (next < -Math.PI) next += turn; return next; }

