import { jsonResponse } from "./community/_community.js";
import { readStateSnapshot } from "./_state-backend.js";
import {
  effectiveWatchResponse,
  normalizeWatchSnapshot,
  projectThumbnailUrls,
} from "./watch/_watch.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  try {
    const record = await readStateSnapshot(env, "broadcast");
    if (!record) return jsonResponse({ available: false, status: "unavailable" }, 503);
    const snapshot = normalizeWatchSnapshot(record.snapshot);
    if (!snapshot || typeof record.persistedAt !== "string") return jsonResponse({ available: false, status: "unavailable" }, 503);
    return jsonResponse(projectThumbnailUrls(effectiveWatchResponse(snapshot)));
  } catch {
    return jsonResponse({ available: false, status: "unavailable" }, 503);
  }
}
