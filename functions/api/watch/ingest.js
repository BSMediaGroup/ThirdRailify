import { jsonResponse, verifySignedRequest } from "../community/_community.js";
import {
  WATCH_KV_KEY,
  WATCH_MAX_BODY_BYTES,
  normalizeWatchSnapshot,
  watchCheckpointSeconds,
  watchSemanticSnapshot,
} from "./_watch.js";
import { ingestSuccessResponse, persistSemanticSnapshot } from "../_snapshot-persistence.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!env.THIRDRAILIFY_COMMUNITY_KV || !env.THIRDRAILIFY_COMMUNITY_INGEST_SECRET) {
    return jsonResponse({ error: "watch_bridge_not_configured" }, 503);
  }
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return jsonResponse({ error: "unsupported_media_type" }, 415);
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > WATCH_MAX_BODY_BYTES) return jsonResponse({ error: "payload_too_large" }, 413);
  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (!rawBody.length || rawBody.length > WATCH_MAX_BODY_BYTES) return jsonResponse({ error: "payload_too_large" }, 413);
  const validSignature = await verifySignedRequest(
    rawBody,
    request.headers.get("X-ThirdRailify-Timestamp"),
    request.headers.get("X-ThirdRailify-Signature"),
    env.THIRDRAILIFY_COMMUNITY_INGEST_SECRET,
    Math.floor(Date.now() / 1000),
  );
  if (!validSignature) return jsonResponse({ error: "invalid_signature" }, 401);
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const snapshot = normalizeWatchSnapshot(parsed);
  if (!snapshot) return jsonResponse({ error: "invalid_snapshot" }, 400);
  if (Date.parse(snapshot.generatedAt) > Date.now() + 5 * 60 * 1000) return jsonResponse({ error: "invalid_snapshot_time" }, 400);
  const result = await persistSemanticSnapshot({
    kv: env.THIRDRAILIFY_COMMUNITY_KV,
    key: WATCH_KV_KEY,
    snapshot,
    normalizeSnapshot: normalizeWatchSnapshot,
    semanticSnapshot: watchSemanticSnapshot,
    checkpointSeconds: watchCheckpointSeconds(snapshot, env),
  });
  if (result.persisted) {
    console.info(`watch ingest accepted persisted=true reason=${result.reason} kvWrites=1`);
  }
  return ingestSuccessResponse(result);
}
