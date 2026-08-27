import { jsonResponse } from "../community/_community.js";
import { readStateSnapshot, readWatchEpisode } from "../_state-backend.js";
import { WATCH_EPISODE_ID_PATTERN, candidatesInSnapshot, normalizeWatchSnapshot } from "./_watch.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  const search = new URL(request.url).searchParams;
  const key = search.get("key");
  const episodeId = search.get("episode");
  if ([...search].length !== 1 || Boolean(key) === Boolean(episodeId)) return jsonResponse({ error: "invalid_key" }, 400);
  if (key && key.length > 160) return jsonResponse({ error: "invalid_key" }, 400);
  if (episodeId && !WATCH_EPISODE_ID_PATTERN.test(episodeId)) return jsonResponse({ error: "not_found" }, 404);
  let candidate;
  try {
    if (episodeId) {
      const episode = await readWatchEpisode(env, episodeId);
      candidate = episode?.visible && episode.platform === "rumble" ? episode : null;
    } else {
      const record = await readStateSnapshot(env, "broadcast");
      const snapshot = normalizeWatchSnapshot(record?.snapshot);
      candidate = snapshot && candidatesInSnapshot(snapshot).find((item) => item.key === key && item.platform === "rumble");
    }
  } catch {
    return jsonResponse({ error: "unavailable" }, 503);
  }
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
