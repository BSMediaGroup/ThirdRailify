import { readStateSnapshot } from "./api/_state-backend.js";
import { effectiveWatchResponse, normalizeWatchSnapshot } from "./api/watch/_watch.js";

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  let live = false;
  try {
    const record = await readStateSnapshot(env, "broadcast");
    const snapshot = normalizeWatchSnapshot(record?.snapshot);
    live = Boolean(snapshot && effectiveWatchResponse(snapshot).liveNow.length);
  } catch { live = false; }
  const url = new URL(request.url);
  return new Response(null, { status: 302, headers: { Location: `${live ? "/watch/live" : "/watch"}${url.search}`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
