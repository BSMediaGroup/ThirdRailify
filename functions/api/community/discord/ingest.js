import {
  COMMUNITY_CHECKPOINT_SECONDS,
  COMMUNITY_MAX_BODY_BYTES,
  COMMUNITY_MIN_CHECKPOINT_SECONDS,
  jsonResponse,
  normalizeSnapshot,
  verifySignedRequest,
} from "../_community.js";
import {
  checkpointSeconds,
  ingestSuccessResponse,
  persistSemanticSnapshot,
} from "../../_snapshot-persistence.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!env.THIRDRAILIFY_PUBLIC_STATE || !env.THIRDRAILIFY_COMMUNITY_INGEST_SECRET) {
    return jsonResponse({ error: "community_bridge_not_configured" }, 503);
  }
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return jsonResponse({ error: "unsupported_media_type" }, 415);
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > COMMUNITY_MAX_BODY_BYTES) {
    return jsonResponse({ error: "payload_too_large" }, 413);
  }
  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (!rawBody.length || rawBody.length > COMMUNITY_MAX_BODY_BYTES) return jsonResponse({ error: "payload_too_large" }, 413);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const validSignature = await verifySignedRequest(
    rawBody,
    request.headers.get("X-ThirdRailify-Timestamp"),
    request.headers.get("X-ThirdRailify-Signature"),
    env.THIRDRAILIFY_COMMUNITY_INGEST_SECRET,
    nowSeconds,
  );
  if (!validSignature) return jsonResponse({ error: "invalid_signature" }, 401);

  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const snapshot = normalizeSnapshot(parsed);
  if (!snapshot) return jsonResponse({ error: "invalid_snapshot" }, 400);
  const generatedMilliseconds = Date.parse(snapshot.generatedAt);
  if (generatedMilliseconds > Date.now() + 5 * 60 * 1000) return jsonResponse({ error: "invalid_snapshot_time" }, 400);

  const result = await persistSemanticSnapshot({
    env,
    kind: "community",
    snapshot,
    checkpointSeconds: checkpointSeconds(
      env.THIRDRAILIFY_COMMUNITY_FRESHNESS_CHECKPOINT_SECONDS
        ?? env.THIRDRAILIFY_COMMUNITY_KV_CHECKPOINT_SECONDS,
      COMMUNITY_CHECKPOINT_SECONDS,
      COMMUNITY_MIN_CHECKPOINT_SECONDS,
    ),
  });
  if (result.persisted) {
    console.info(`community ingest accepted persisted=true reason=${result.reason} sqliteWrites=${result.storageWrites}`);
  }
  return ingestSuccessResponse(result);
}
