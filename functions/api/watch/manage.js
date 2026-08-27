import { hmacSha256, timingSafeEqual } from "../../_shared/public-auth.js";
import { jsonResponse } from "../community/_community.js";
import { changeWatchVisibility, readStateSnapshot, readWatchArchive } from "../_state-backend.js";
import { effectiveWatchResponse, normalizeWatchSnapshot, WATCH_EPISODE_ID_PATTERN } from "./_watch.js";

const MAX_BODY_BYTES = 4 * 1024;
const ACTIONS = new Set(["read", "show", "hide", "show_all", "hide_all"]);

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!String(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) return jsonResponse({ error: "unsupported_media_type" }, 415);
  const raw = new Uint8Array(await request.arrayBuffer());
  if (!raw.length || raw.length > MAX_BODY_BYTES) return jsonResponse({ error: "payload_too_large" }, 413);
  if (!(await verifyManagementRequest(request, env, raw))) return jsonResponse({ error: "invalid_signature" }, 401);
  let body;
  try { body = JSON.parse(new TextDecoder().decode(raw)); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body) || !ACTIONS.has(body.action)) return jsonResponse({ error: "unsupported_action" }, 400);
  const individual = body.action === "show" || body.action === "hide";
  if (individual !== WATCH_EPISODE_ID_PATTERN.test(String(body.episodeId || ""))) return jsonResponse({ error: "invalid_episode_id" }, 400);
  try {
    if (body.action !== "read") {
      const result = await changeWatchVisibility(env, body.action, individual ? body.episodeId : null);
      if (!result) return jsonResponse({ error: "episode_not_found" }, 404);
    }
    const [archive, currentRecord] = await Promise.all([
      readWatchArchive(env),
      readStateSnapshot(env, "broadcast").catch(() => null),
    ]);
    const snapshot = normalizeWatchSnapshot(currentRecord?.snapshot);
    return jsonResponse(adminProjection(archive, snapshot ? effectiveWatchResponse(snapshot) : null, new URL(request.url).origin));
  } catch {
    return jsonResponse({ error: "watch_management_unavailable" }, 503);
  }
}

async function verifyManagementRequest(request, env, bytes) {
  const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || "");
  const timestamp = String(request.headers.get("X-ThirdRailify-Timestamp") || "");
  const signature = String(request.headers.get("X-ThirdRailify-Signature") || "");
  if (!secret || !/^\d{10}$/.test(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(signature)) return false;
  const digest = await digestHex(bytes);
  const pathname = new URL(request.url).pathname;
  const expected = await hmacSha256(secret, `${timestamp}\n${request.method}\n${pathname}\n${digest}`);
  return timingSafeEqual(expected, signature);
}

function adminProjection(archive, current, publicOrigin = "") {
  const episodes = Array.isArray(archive?.episodes) ? archive.episodes : [];
  const visible = episodes.filter((episode) => episode.visible).length;
  return {
    ok: true,
    current,
    summary: {
      retained: episodes.length,
      visible,
      hidden: episodes.length - visible,
      remaining: 24 - episodes.length,
      newest: episodes[0] ? { id: episodes[0].id, title: episodes[0].title, date: episodes[0].sortAt } : null,
      oldest: episodes.at(-1) ? { id: episodes.at(-1).id, title: episodes.at(-1).title, date: episodes.at(-1).sortAt } : null,
    },
    episodes: episodes.map((episode, index) => ({
      id: episode.id,
      identityKey: episode.identityKey,
      platform: episode.platform,
      contentId: episode.contentId,
      title: episode.title,
      description: episode.description,
      thumbnailUrl: episode.platform === "rumble" && episode.thumbnailUrl ? `${publicOrigin}/api/watch/thumbnail?episode=${encodeURIComponent(episode.id)}` : episode.thumbnailUrl,
      watchUrl: episode.watchUrl,
      archiveDate: episode.sortAt,
      visible: episode.visible,
      archiveOrder: index + 1,
      publicRoute: `${publicOrigin}/watch/v/${episode.id}`,
    })),
  };
}

async function digestHex(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export { adminProjection, verifyManagementRequest };
