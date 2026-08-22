import { readStateSnapshot } from "../_state-backend.js";
import { freshnessForAge, jsonResponse, normalizeSnapshot } from "./_community.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);
  try {
    const record = await readStateSnapshot(env, "community");
    if (!record) return jsonResponse({ available: false, status: "unavailable" }, 503);
    const snapshot = normalizeSnapshot(record.snapshot);
    if (!snapshot || typeof record.persistedAt !== "string") return jsonResponse({ available: false, status: "unavailable" }, 503);
    const now = Date.now();
    const ageSeconds = Math.max(0, Math.floor((now - Date.parse(snapshot.generatedAt)) / 1000));
    const freshness = freshnessForAge(ageSeconds);
    const members = freshness === "stale"
      ? snapshot.members.map((member) => ({ ...member, status: "unknown" }))
      : snapshot.members;
    return jsonResponse({
      available: true,
      ...snapshot,
      members,
      retrievedAt: new Date(now).toISOString(),
      ageSeconds,
      freshness,
    });
  } catch {
    return jsonResponse({ available: false, status: "unavailable" }, 503);
  }
}
