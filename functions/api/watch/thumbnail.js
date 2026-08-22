import { jsonResponse } from "../community/_community.js";
import { WATCH_KV_KEY, candidatesInSnapshot, normalizeWatchSnapshot } from "./_watch.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!env.THIRDRAILIFY_COMMUNITY_KV) return jsonResponse({ error: "unavailable" }, 503);
  const key = new URL(request.url).searchParams.get("key");
  if (!key || key.length > 160) return jsonResponse({ error: "invalid_key" }, 400);
  const raw = await env.THIRDRAILIFY_COMMUNITY_KV.get(WATCH_KV_KEY);
  if (!raw) return jsonResponse({ error: "not_found" }, 404);
  let snapshot;
  try {
    snapshot = normalizeWatchSnapshot(JSON.parse(raw).snapshot);
  } catch {
    snapshot = null;
  }
  const candidate = snapshot && candidatesInSnapshot(snapshot).find((item) => item.key === key && item.platform === "rumble");
  if (!candidate?.thumbnailUrl) return jsonResponse({ error: "not_found" }, 404);
  const hostname = new URL(candidate.thumbnailUrl).hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || /^[\d.]+$/.test(hostname) || hostname.includes(":")) {
    return jsonResponse({ error: "thumbnail_unavailable" }, 502);
  }
  const response = await fetch(candidate.thumbnailUrl, { method: "GET", redirect: "manual", headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" } });
  const contentType = response.headers.get("Content-Type") ?? "";
  const length = Number(response.headers.get("Content-Length") ?? 0);
  if (!response.ok || !/^image\/(?:avif|gif|jpeg|png|webp)$/i.test(contentType) || (length && length > 5 * 1024 * 1024)) {
    return jsonResponse({ error: "thumbnail_unavailable" }, 502);
  }
  const image = await response.arrayBuffer();
  if (image.byteLength > 5 * 1024 * 1024) return jsonResponse({ error: "thumbnail_unavailable" }, 502);
  return new Response(image, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
