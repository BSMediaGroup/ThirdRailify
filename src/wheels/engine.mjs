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
  return active.map((entry) => { const start = cursor / total * Math.PI * 2; cursor += entry.weight; const end = cursor / total * Math.PI * 2; return { entry, start, end, span: end - start, centre: (start + end) / 2 }; });
}

export function normalizeTurn(value) {
  const turn = Math.PI * 2;
  return ((value % turn) + turn) % turn;
}

export function entryAtAngle(entries, angle) {
  const segments = entryAngles(entries); if (!segments.length) return null;
  const target = normalizeTurn(angle);
  return (segments.find((segment) => target >= segment.start && target < segment.end) || segments[segments.length - 1]).entry;
}

export function entryAtPointer(entries, rotationDegrees, pointerAngle = -Math.PI / 2) {
  const rotation = rotationDegrees * Math.PI / 180;
  return entryAtAngle(entries, pointerAngle + Math.PI / 2 - rotation);
}

export function hitTestWheel(entries, point, size, rotationDegrees, innerRadiusRatio = .12, outerRadiusRatio = .48) {
  if (!Number.isFinite(size) || size <= 0) return null;
  const centre = size / 2; const dx = point.x - centre; const dy = point.y - centre; const distance = Math.hypot(dx, dy);
  if (distance < size * innerRadiusRatio || distance > size * outerRadiusRatio) return null;
  const visualAngle = Math.atan2(dy, dx) + Math.PI / 2;
  return entryAtAngle(entries, visualAngle - rotationDegrees * Math.PI / 180);
}

export function participantOdds(entries, entryId) {
  const active = entries.filter((entry) => entry.state === "active");
  const totalWeight = active.reduce((sum, entry) => sum + entry.weight, 0); const entry = entries.find((candidate) => candidate.id === entryId) || null;
  if (!entry || entry.state !== "active" || totalWeight <= 0) return { entry, totalWeight, probability: 0, combinedWeight: 0, combinedProbability: 0, eligibleCount: active.length };
  const combinedWeight = active.filter((candidate) => candidate.label === entry.label).reduce((sum, candidate) => sum + candidate.weight, 0);
  return { entry, totalWeight, probability: entry.weight / totalWeight, combinedWeight, combinedProbability: combinedWeight / totalWeight, eligibleCount: active.length };
}

export function formatProbability(probability) {
  if (!Number.isFinite(probability) || probability <= 0) return "0%";
  const percent = probability * 100;
  if (percent < .01) return "<0.01%";
  const digits = Number.isInteger(percent) ? 0 : percent >= 1 ? 2 : 3;
  return `${percent.toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "")}%`;
}

export function secureUnitFraction(randomValues = (values) => globalThis.crypto.getRandomValues(values)) {
  const values = new Uint32Array(1); randomValues(values);
  return (values[0] + .5) / 0x100000000;
}

export function constantDecelerationProgress(elapsedMs, durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 1;
  const u = Math.min(1, Math.max(0, Number(elapsedMs) / durationMs));
  return 2 * u - u * u;
}

export function constantDecelerationVelocity(elapsedMs, durationMs, totalTravel = 1) {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isFinite(totalTravel)) return 0;
  const u = Math.min(1, Math.max(0, Number(elapsedMs) / durationMs));
  return totalTravel * 2 * (1 - u) / durationMs;
}

export function fullTurnsForDuration(durationMs, turnRandom) {
  const duration = Math.min(60000, Math.max(2000, Number(durationMs) || 2000));
  const random = turnRandom ?? secureUnitFraction();
  if (!Number.isFinite(random) || random <= 0 || random >= 1) throw new Error("The turn variance must be strictly between zero and one.");
  const seconds = duration / 1000;
  const minimum = Math.max(3, Math.ceil(2 + seconds * .5));
  const spread = Math.max(2, Math.ceil(seconds * .15));
  return minimum + Math.floor(random * (spread + 1));
}

export function spinPlan(entries, winnerId, durationMs, currentRotation = 0, options = {}) {
  const segment = entryAngles(entries).find((value) => value.entry.id === winnerId); if (!segment) throw new Error("The winning entry is not active.");
  const legacyTurns = typeof options === "number" ? options : undefined;
  const settings = typeof options === "number" ? {} : options;
  const landingFraction = settings.landingFraction ?? secureUnitFraction(settings.randomValues);
  if (!Number.isFinite(landingFraction) || landingFraction <= 0 || landingFraction >= 1) throw new Error("The landing fraction must be strictly inside the winning segment.");
  const duration = Math.min(60000, Math.max(2000, Number(durationMs) || 2000));
  const turns = legacyTurns ?? settings.extraTurns ?? fullTurnsForDuration(duration, settings.turnRandom ?? secureUnitFraction(settings.randomValues));
  if (!Number.isSafeInteger(turns) || turns < 1) throw new Error("The full-turn count is invalid.");
  const landingLocalAngle = segment.start + segment.span * landingFraction;
  const targetRadians = normalizeTurn(-landingLocalAngle); const currentRadians = currentRotation * Math.PI / 180;
  let positiveTargetDelta = normalizeTurn(targetRadians - normalizeTurn(currentRadians)); if (positiveTargetDelta <= Number.EPSILON) positiveTargetDelta = Math.PI * 2;
  const totalTravel = turns * Math.PI * 2 + positiveTargetDelta;
  return {
    winnerId,
    durationMs: duration,
    turns,
    landingFraction,
    landingLocalAngle,
    targetModuloRotation: targetRadians * 180 / Math.PI,
    positiveTargetDelta: positiveTargetDelta * 180 / Math.PI,
    startRotation: currentRotation,
    totalTravel: totalTravel * 180 / Math.PI,
    finalRotation: currentRotation + totalTravel * 180 / Math.PI,
  };
}
