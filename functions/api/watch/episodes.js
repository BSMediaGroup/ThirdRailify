import { jsonResponse } from "../community/_community.js";
import { readWatchArchive } from "../_state-backend.js";
import { cachedJson, episodeListPayload } from "./_episodes.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") return jsonResponse({ error: "method_not_allowed" }, 405);
  if ([...new URL(request.url).searchParams].length) return jsonResponse({ error: "invalid_query" }, 400);
  try {
    const response = await cachedJson(request, episodeListPayload(await readWatchArchive(env)));
    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  } catch {
    return jsonResponse({ error: "archive_unavailable" }, 503);
  }
}
