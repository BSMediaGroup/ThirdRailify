import { jsonResponse } from "../../community/_community.js";
import { readWatchArchive } from "../../_state-backend.js";
import { WATCH_EPISODE_ID_PATTERN } from "../_watch.js";
import { cachedJson, episodeDetailPayload } from "../_episodes.js";

export async function onRequest({ request, env, params }) {
  if (request.method !== "GET" && request.method !== "HEAD") return jsonResponse({ error: "method_not_allowed" }, 405);
  if ([...new URL(request.url).searchParams].length) return jsonResponse({ error: "invalid_query" }, 400);
  const episodeId = String(params?.episodeId || "");
  if (!WATCH_EPISODE_ID_PATTERN.test(episodeId)) return jsonResponse({ error: "episode_not_found" }, 404);
  try {
    const payload = episodeDetailPayload(await readWatchArchive(env), episodeId);
    if (!payload) return jsonResponse({ error: "episode_not_found" }, 404);
    const response = await cachedJson(request, payload);
    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  } catch {
    return jsonResponse({ error: "archive_unavailable" }, 503);
  }
}
