import { ingestWatchState, writeStateSnapshot } from "./_state-backend.js";

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
  env,
  kind,
  snapshot,
  checkpointSeconds: checkpoint,
}) {
  const result = await writeStateSnapshot(env, kind, snapshot, checkpoint);
  return {
    persisted: result.persisted === true,
    reason: result.reason,
    storageWrites: Number(result.storageWrites ?? 0),
    kvWrites: 0,
  };
}

export async function persistWatchSnapshot({ env, snapshot, checkpointSeconds: checkpoint }) {
  const result = await ingestWatchState(env, snapshot, checkpoint);
  return {
    persisted: result.persisted === true,
    reason: result.reason,
    storageWrites: Number(result.storageWrites ?? 0),
    archivePersisted: result.archivePersisted === true,
    archiveReason: result.archiveReason,
    archiveCount: Number(result.archiveCount ?? 0),
    kvWrites: 0,
  };
}

export function ingestSuccessResponse(result) {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-ThirdRailify-Persisted": String(result.persisted),
      "X-ThirdRailify-Persist-Reason": result.reason,
      "X-ThirdRailify-DO-Writes": String(result.storageWrites),
      "X-ThirdRailify-KV-Writes": "0",
    },
  });
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
