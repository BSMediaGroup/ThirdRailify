export function secureBoundedInteger(maxExclusive, randomValues = (values) => globalThis.crypto.getRandomValues(values)) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0xffffffff) throw new Error("The weight total is invalid.");
  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  const values = new Uint32Array(1);
  do { randomValues(values); } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

export function selectWeightedEntry(entries, randomValues) {
  const active = entries.filter((entry) => entry.state === "active");
  if (!active.length) throw new Error("Add at least one active participant.");
  const total = active.reduce((sum, entry) => {
    if (!Number.isSafeInteger(entry.weight) || entry.weight < 1 || entry.weight > 100000) throw new Error("Participant weights must be positive integers.");
    return sum + entry.weight;
  }, 0);
  let cursor = secureBoundedInteger(total, randomValues);
  for (const entry of active) { if (cursor < entry.weight) return entry; cursor -= entry.weight; }
  return active[active.length - 1];
}

export function secureShuffle(items, randomValues) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = secureBoundedInteger(index + 1, randomValues);
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function entryAngles(entries) {
  const active = entries.filter((entry) => entry.state === "active"); const total = active.reduce((sum, entry) => sum + entry.weight, 0); let cursor = 0;
  return active.map((entry) => { const start = cursor / total * Math.PI * 2; cursor += entry.weight; const end = cursor / total * Math.PI * 2; return { entry, start, end, centre: (start + end) / 2 }; });
}

export function spinPlan(entries, winnerId, durationMs, currentRotation = 0, extraTurns) {
  const segment = entryAngles(entries).find((value) => value.entry.id === winnerId); if (!segment) throw new Error("The winning entry is not active.");
  const turns = extraTurns ?? 6 + secureBoundedInteger(4); const targetRadians = -segment.centre; const currentRadians = currentRotation * Math.PI / 180;
  let delta = targetRadians - (currentRadians % (Math.PI * 2)); while (delta <= 0) delta += Math.PI * 2;
  return { winnerId, durationMs: Math.min(20000, Math.max(2000, durationMs)), turns, finalRotation: currentRotation + turns * 360 + delta * 180 / Math.PI };
}
