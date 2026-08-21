import { jsonResponse } from "./community/_community.js";
import {
  WATCH_KV_KEY,
  effectiveWatchResponse,
  normalizeWatchSnapshot,
  projectThumbnailUrls,
} from "./watch/_watch.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!env.THIRDRAILIFY_COMMUNITY_KV) return jsonResponse({ available: false, status: "unavailable" }, 503);
  const raw = await env.THIRDRAILIFY_COMMUNITY_KV.get(WATCH_KV_KEY);
  if (!raw) return jsonResponse({ available: false, status: "unavailable" }, 503);
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return jsonResponse({ available: false, status: "unavailable" }, 503);
  }
  const snapshot = normalizeWatchSnapshot(record?.snapshot);
  if (!snapshot || typeof record?.receivedAt !== "string") return jsonResponse({ available: false, status: "unavailable" }, 503);
  return jsonResponse(projectThumbnailUrls(effectiveWatchResponse(snapshot)));
}
