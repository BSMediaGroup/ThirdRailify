import assert from "node:assert/strict";
import { createHash, createHmac, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import {
  WATCH_ARCHIVE_SCHEMA,
  archiveEpisodeFromSnapshot,
  episodeIdForCandidate,
  normalizeWatchArchive,
} from "../functions/api/watch/_watch.js";
import { onRequest as episodesRequest } from "../functions/api/watch/episodes.js";
import { onRequest as episodeRequest } from "../functions/api/watch/episodes/[episodeId].js";
import { onRequest as manageRequest } from "../functions/api/watch/manage.js";
import { onRequest as liveRedirect } from "../functions/live.js";
import { MemoryStateNamespace } from "./state-function-harness.mjs";

const NOW = Date.parse("2026-08-28T05:00:00.000Z");
const MANAGEMENT_SECRET = "watch-management-test-secret";

test("archive schema, eligibility, stable IDs, metadata refresh, visibility preservation, and unchanged writes", async () => {
  const state = new MemoryStateNamespace({ now: () => NOW });
  await state.ready;
  const completed = snapshot(1);
  const firstId = await episodeIdForCandidate(completed.primary);
  const renamed = snapshot(1); renamed.primary.title = "Renamed completed transmission"; renamed.latest.title = renamed.primary.title; renamed.latestByPlatform.youtube.title = renamed.primary.title;
  assert.equal(await episodeIdForCandidate(renamed.primary), firstId);
  assert.equal(normalizeWatchArchive({ schema: WATCH_ARCHIVE_SCHEMA, episodes: [] }).episodes.length, 0);
  assert.equal(normalizeWatchArchive({ schema: "wrong", episodes: [] }), null);
  assert.equal((await state.service.ingestBroadcast({ snapshot: completed, checkpointSeconds: 600 })).archiveReason, "episode_inserted");
  const unchangedWrites = state.putCalls;
  assert.equal((await state.service.ingestBroadcast({ snapshot: completed, checkpointSeconds: 600 })).archiveReason, "unchanged");
  assert.equal(state.putCalls, unchangedWrites, "unchanged current/archive semantics perform no SQLite row write");
  await state.service.changeArchiveVisibility("hide", firstId);
  await state.service.ingestBroadcast({ snapshot: renamed, checkpointSeconds: 600 });
  const refreshed = state.service.readEpisode(firstId);
  assert.equal(refreshed.title, "Renamed completed transmission");
  assert.equal(refreshed.visible, false, "metadata refresh preserves Admin visibility");

  for (const [presentation, provider] of [["live", "live"], ["upcoming", "upcoming"], ["archive", "blocked"], ["episode", "unknown"]]) {
    const value = snapshot(2, presentation, provider);
    assert.equal(await archiveEpisodeFromSnapshot(value), null, `${presentation}/${provider} is not historical eligibility`);
  }
});

test("archive upserts retries, orders deterministically, caps all records at 24, and prunes a hidden oldest record", async () => {
  const state = new MemoryStateNamespace({ now: () => NOW });
  await state.ready;
  for (let index = 0; index < 24; index += 1) await state.service.ingestBroadcast({ snapshot: snapshot(index), checkpointSeconds: 600 });
  const oldest = state.service.readArchive().episodes.at(-1);
  await state.service.changeArchiveVisibility("hide", oldest.id);
  await state.service.ingestBroadcast({ snapshot: snapshot(24), checkpointSeconds: 600 });
  const archive = state.service.readArchive();
  assert.equal(archive.episodes.length, 24);
  assert.equal(archive.episodes.some((episode) => episode.id === oldest.id), false, "hidden records remain subject to retention");
  assert.equal(archive.episodes[0].contentId, "00000000024");
  assert.equal(archive.episodes.at(-1).contentId, "00000000001");
  const ids = archive.episodes.map((episode) => episode.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("serialized visibility and ingest mutations cannot overwrite hidden state", async () => {
  const state = new MemoryStateNamespace({ now: () => NOW });
  await state.ready;
  await state.service.ingestBroadcast({ snapshot: snapshot(7), checkpointSeconds: 600 });
  const episode = state.service.readArchive().episodes[0];
  const update = snapshot(7); update.primary.description = "Refreshed description"; update.latest.description = update.primary.description; update.latestByPlatform.youtube.description = update.primary.description;
  await Promise.all([
    state.service.changeArchiveVisibility("hide", episode.id),
    state.service.ingestBroadcast({ snapshot: update, checkpointSeconds: 600 }),
  ]);
  assert.equal(state.service.readEpisode(episode.id).visible, false);
  assert.equal(state.service.readEpisode(episode.id).description, "Refreshed description");
});

test("public archive API is visible-only, bounded, cache-safe, and returns 404 for hidden or unknown detail", async () => {
  const state = new MemoryStateNamespace({ now: () => NOW });
  await state.ready;
  await state.service.ingestBroadcast({ snapshot: snapshot(3), checkpointSeconds: 600 });
  await state.service.ingestBroadcast({ snapshot: snapshot(4), checkpointSeconds: 600 });
  const hidden = state.service.readArchive().episodes[1];
  await state.service.changeArchiveVisibility("hide", hidden.id);
  const env = { THIRDRAILIFY_PUBLIC_STATE: state };
  const list = await episodesRequest({ request: new Request("https://thirdrailify.pages.dev/api/watch/episodes"), env });
  const payload = await list.json();
  assert.equal(list.status, 200);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.summary.placeholderCount, 23);
  assert.equal(list.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(list.headers.get("Cache-Control"), /s-maxage=60/);
  assert.match(list.headers.get("ETag"), /^W\//);
  assert.equal((await episodesRequest({ request: new Request("https://thirdrailify.pages.dev/api/watch/episodes?unsafe=1"), env })).status, 400);
  assert.equal((await episodeRequest({ request: new Request(`https://thirdrailify.pages.dev/api/watch/episodes/${hidden.id}`), env, params: { episodeId: hidden.id } })).status, 404);
  assert.equal((await episodeRequest({ request: new Request("https://thirdrailify.pages.dev/api/watch/episodes/ep_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), env, params: { episodeId: "ep_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } })).status, 404);
});

test("protected management rejects unsigned, expired, invalid, malformed, and unsupported requests then performs visibility actions", async () => {
  const original = Date.now; Date.now = () => NOW;
  const state = new MemoryStateNamespace({ now: () => NOW });
  await state.ready;
  await state.service.ingestBroadcast({ snapshot: snapshot(9), checkpointSeconds: 600 });
  const id = state.service.readArchive().episodes[0].id;
  const env = { THIRDRAILIFY_PUBLIC_STATE: state, THIRDRAILIFY_COMMUNITY_API_SECRET: MANAGEMENT_SECRET };
  try {
    assert.equal((await manageRequest({ request: rawManagement({ action: "read" }), env })).status, 401);
    assert.equal((await manageRequest({ request: signedManagement({ action: "read" }, Math.floor(NOW / 1000) - 301), env })).status, 401);
    assert.equal((await manageRequest({ request: signedManagement({ action: "read" }, Math.floor(NOW / 1000), "wrong"), env })).status, 401);
    assert.equal((await manageRequest({ request: signedManagement({ action: "hide", episodeId: "bad" }), env })).status, 400);
    assert.equal((await manageRequest({ request: signedManagement({ action: "delete" }), env })).status, 400);
    const hidden = await manageRequest({ request: signedManagement({ action: "hide", episodeId: id }), env });
    assert.equal(hidden.status, 200);
    assert.equal((await hidden.json()).summary.hidden, 1);
    const shown = await manageRequest({ request: signedManagement({ action: "show_all" }), env });
    assert.equal((await shown.json()).summary.visible, 1);
  } finally { Date.now = original; }
});

test("/live redirects only for an effective confirmed live candidate and preserves query", async () => {
  const original = Date.now; Date.now = () => NOW;
  try {
    const liveState = new MemoryStateNamespace({ now: () => NOW }); await liveState.ready;
    await liveState.service.write("broadcast", { snapshot: snapshot(1, "live", "live"), checkpointSeconds: 150 });
    const live = await liveRedirect({ request: new Request("https://thirdrailify.pages.dev/live?platform=youtube"), env: { THIRDRAILIFY_PUBLIC_STATE: liveState } });
    assert.equal(live.headers.get("Location"), "/watch/live?platform=youtube");
    assert.equal(live.headers.get("Cache-Control"), "no-store");
    const offlineState = new MemoryStateNamespace({ now: () => NOW }); await offlineState.ready;
    await offlineState.service.write("broadcast", { snapshot: snapshot(2), checkpointSeconds: 600 });
    const offline = await liveRedirect({ request: new Request("https://thirdrailify.pages.dev/live?from=short"), env: { THIRDRAILIFY_PUBLIC_STATE: offlineState } });
    assert.equal(offline.headers.get("Location"), "/watch?from=short");
  } finally { Date.now = original; }
});

test("archive population source gate contains no provider, RSS, search, or HTML network fetch", async () => {
  const sources = await Promise.all([
    "../functions/api/watch/ingest.js",
    "../functions/api/watch/_watch.js",
    "../cloudflare/state-worker/state-core.js",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  const source = sources.join("\n");
  assert.doesNotMatch(source, /fetch\s*\(\s*["'`]https:\/\/(?:[^/]*youtube|[^/]*rumble)/i);
  assert.doesNotMatch(source, /(?:rss|search endpoint|provider api|html scrape)/i);
});

function snapshot(index, presentation = "archive", provider = presentation === "episode" ? "published" : presentation === "archive" ? "completed" : presentation) {
  const contentId = String(index).padStart(11, "0");
  const time = new Date(Date.parse("2026-08-01T00:00:00.000Z") + index * 86_400_000).toISOString();
  const item = {
    platform: "youtube", key: `youtube:${contentId}`, contentId,
    watchUrl: `https://www.youtube.com/watch?v=${contentId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${contentId}?playsinline=1&rel=0`,
    title: `Transmission ${index}`, description: "Validated completed broadcast.", creatorName: "Third Railify",
    thumbnailUrl: `https://i.ytimg.com/vi/${contentId}/maxresdefault.jpg`, providerState: provider, presentationState: presentation,
    publishedAt: time, scheduledStart: presentation === "upcoming" ? time : null, actualStart: presentation === "live" ? time : null,
    actualEnd: presentation === "archive" ? time : null, liveVerifiedAt: presentation === "live" ? new Date(NOW - 30_000).toISOString() : null,
    liveExpiresAt: presentation === "live" ? new Date(NOW + 120_000).toISOString() : null, viewerCount: presentation === "live" ? 10 : null, observedAt: time,
  };
  return {
    schema: "thirdrailify-broadcast-v1", generatedAt: new Date(NOW).toISOString(), source: { kind: "thirdrailify-bot", botVersion: "1.2.0" },
    providerStatus: { youtube: { state: provider, checkedAt: new Date(NOW).toISOString() }, rumble: { state: "offline", checkedAt: new Date(NOW).toISOString() } },
    liveNow: presentation === "live" ? [item] : [], primary: item, latest: item, latestByPlatform: { youtube: item, rumble: null }, upcoming: presentation === "upcoming" ? item : null,
  };
}

function rawManagement(body) {
  return new Request("https://thirdrailify.pages.dev/api/watch/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function signedManagement(body, timestamp = Math.floor(NOW / 1000), secret = MANAGEMENT_SECRET) {
  const raw = JSON.stringify(body);
  const bodyHash = createHashHex(raw);
  const signature = createHmac("sha256", secret).update(`${timestamp}\nPOST\n/api/watch/manage\n${bodyHash}`).digest("base64url");
  return new Request("https://thirdrailify.pages.dev/api/watch/manage", { method: "POST", headers: { "Content-Type": "application/json", "X-ThirdRailify-Timestamp": String(timestamp), "X-ThirdRailify-Signature": signature }, body: raw });
}

function createHashHex(value) {
  return createHash("sha256").update(value).digest("hex");
}
