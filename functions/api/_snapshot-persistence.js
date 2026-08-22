export const SNAPSHOT_ENVELOPE_SCHEMA = "thirdrailify-kv-snapshot-envelope-v1";

export function checkpointSeconds(value, fallback, minimum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.floor(parsed));
}

export async function semanticFingerprint(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function persistSemanticSnapshot({
  kv,
  key,
  snapshot,
  normalizeSnapshot,
  semanticSnapshot,
  checkpointSeconds: checkpoint,
  nowMilliseconds = Date.now(),
}) {
  const incomingFingerprint = await semanticFingerprint(semanticSnapshot(snapshot));
  const currentRecord = await readRecord(kv, key);
  const currentSnapshot = normalizeSnapshot(currentRecord?.snapshot);
  let currentFingerprint = null;
  if (currentSnapshot) {
    currentFingerprint = /^[a-f0-9]{64}$/.test(currentRecord?.semanticFingerprint)
      ? currentRecord.semanticFingerprint
      : await semanticFingerprint(semanticSnapshot(currentSnapshot));
  }
  const persistedMilliseconds = recordTimestamp(currentRecord);
  const unchanged = incomingFingerprint === currentFingerprint;
  const checkpointDue = persistedMilliseconds === null
    || Math.max(0, nowMilliseconds - persistedMilliseconds) >= checkpoint * 1000;

  if (unchanged && !checkpointDue) {
    return { persisted: false, reason: "unchanged", fingerprint: incomingFingerprint, kvWrites: 0 };
  }

  const persistedAt = new Date(nowMilliseconds).toISOString();
  const reason = unchanged ? "freshness_checkpoint" : "semantic_change";
  await kv.put(key, JSON.stringify({
    envelopeSchema: SNAPSHOT_ENVELOPE_SCHEMA,
    snapshot,
    semanticFingerprint: incomingFingerprint,
    producerObservedAt: snapshot.generatedAt,
    persistedAt,
    receivedAt: persistedAt,
    checkpointReason: reason,
  }));
  return { persisted: true, reason, fingerprint: incomingFingerprint, kvWrites: 1 };
}

export function ingestSuccessResponse(result) {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-ThirdRailify-Persisted": String(result.persisted),
      "X-ThirdRailify-Persist-Reason": result.reason,
      "X-ThirdRailify-KV-Writes": String(result.kvWrites),
    },
  });
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function readRecord(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function recordTimestamp(record) {
  for (const field of ["persistedAt", "receivedAt"]) {
    const milliseconds = Date.parse(record?.[field]);
    if (Number.isFinite(milliseconds)) return milliseconds;
  }
  return null;
}
