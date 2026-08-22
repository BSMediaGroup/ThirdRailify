import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";
import { test } from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { WATCH_KV_KEY, watchFreshness } from "../functions/api/watch/_watch.js";
import { onRequest as getWatch } from "../functions/api/watch.js";
import { onRequest as ingestWatch } from "../functions/api/watch/ingest.js";
import { onRequest as getWatchThumbnail } from "../functions/api/watch/thumbnail.js";
import { MemoryStateNamespace as MemoryKv } from "./state-function-harness.mjs";

const SECRET = "local-watch-functions-secret";
const NOW = Date.parse("2026-08-22T06:00:00Z");

function candidate(platform = "youtube", state = "live") {
  const youtube = platform === "youtube";
  const contentId = youtube ? "abc123DEF45" : "vabc123";
  return {
    platform,
    key: `${platform}:${contentId}`,
    contentId,
    watchUrl: youtube ? `https://www.youtube.com/watch?v=${contentId}` : "https://rumble.com/vabc123-third-railify-live.html",
    embedUrl: youtube ? `https://www.youtube-nocookie.com/embed/${contentId}?playsinline=1&rel=0` : "https://rumble.com/embed/vabc123",
    title: `${youtube ? "YouTube" : "Rumble"} broadcast`,
    description: "A validated broadcast snapshot fixture.",
    creatorName: "Third Railify",
    thumbnailUrl: youtube ? `https://i.ytimg.com/vi/${contentId}/maxresdefault.jpg` : "https://image.example/rumble.webp",
    providerState: state === "archive" ? "completed" : state === "episode" ? "published" : state,
    presentationState: state,
    publishedAt: "2026-08-22T04:00:00Z",
    scheduledStart: null,
    actualStart: state === "live" ? "2026-08-22T05:50:00Z" : null,
    actualEnd: state === "archive" ? "2026-08-22T05:00:00Z" : null,
    liveVerifiedAt: state === "live" ? "2026-08-22T05:59:00Z" : null,
    liveExpiresAt: state === "live" ? "2026-08-22T06:04:00Z" : null,
    viewerCount: state === "live" ? 321 : null,
    observedAt: "2026-08-22T05:59:00Z",
  };
}

function snapshot(generatedAt = "2026-08-22T05:59:00Z") {
  const youtube = candidate("youtube", "live");
  const rumble = candidate("rumble", "archive");
  return {
    schema: "thirdrailify-broadcast-v1",
    generatedAt,
    source: { kind: "thirdrailify-bot", botVersion: "1.1.0" },
    providerStatus: {
      youtube: { state: "live", checkedAt: "2026-08-22T05:59:00Z" },
      rumble: { state: "offline", checkedAt: "2026-08-22T05:58:00Z" },
    },
    liveNow: [youtube],
    primary: youtube,
    latest: youtube,
    latestByPlatform: { youtube, rumble },
    upcoming: null,
  };
}

function offlineSnapshot(generatedAt = "2026-08-22T05:59:00Z") {
  const value = snapshot(generatedAt);
  const youtube = candidate("youtube", "archive");
  value.providerStatus.youtube = { state: "offline", checkedAt: generatedAt };
  value.liveNow = [];
  value.primary = youtube;
  value.latest = youtube;
  value.latestByPlatform.youtube = youtube;
  return value;
}

function signedRequest(body, timestamp = Math.floor(NOW / 1000), secret = SECRET) {
  const raw = JSON.stringify(body);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  return new Request("https://staging.example/api/watch/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ThirdRailify-Timestamp": String(timestamp),
      "X-ThirdRailify-Signature": `sha256=${signature}`,
    },
    body: raw,
  });
}

async function withNow(callback) {
  const original = Date.now;
  Date.now = () => NOW;
  try { return await callback(); } finally { Date.now = original; }
}

test("watch ingest accepts a signed exact snapshot in the isolated broadcast row", async () => {
  await withNow(async () => {
    const kv = new MemoryKv();
    const response = await ingestWatch({
      request: signedRequest(snapshot()),
      env: { THIRDRAILIFY_PUBLIC_STATE: kv, THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("X-ThirdRailify-Persist-Reason"), "semantic_change");
    assert.ok(await kv.get(WATCH_KV_KEY));
    assert.equal(await kv.get("discord:community:snapshot:v1"), null);
  });
});

test("repeated offline watch state does not rewrite SQLite before the 10-minute checkpoint", async () => {
  const original = Date.now;
  let now = NOW;
  Date.now = () => now;
  const kv = new MemoryKv();
  const env = { THIRDRAILIFY_PUBLIC_STATE: kv, THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
  const ingest = async () => ingestWatch({
    request: signedRequest(offlineSnapshot(new Date(now).toISOString()), Math.floor(now / 1000)),
    env,
  });
  try {
    assert.equal((await ingest()).headers.get("X-ThirdRailify-Persisted"), "true");
    for (let index = 1; index <= 59; index += 1) {
      now = NOW + index * 10_000;
      assert.equal((await ingest()).headers.get("X-ThirdRailify-Persisted"), "false");
    }
    now = NOW + 600_000;
    assert.equal((await ingest()).headers.get("X-ThirdRailify-Persist-Reason"), "freshness_checkpoint");
    assert.equal((await ingest()).headers.get("X-ThirdRailify-Persisted"), "false");
  } finally {
    Date.now = original;
  }
  assert.equal(kv.putCalls, 2);
});

test("watch live start, metadata change, and live end persist while volatile live polls deduplicate", async () => {
  const original = Date.now;
  let now = NOW;
  Date.now = () => now;
  const kv = new MemoryKv();
  const env = { THIRDRAILIFY_PUBLIC_STATE: kv, THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
  const ingest = async (body) => ingestWatch({ request: signedRequest(body, Math.floor(now / 1000)), env });
  try {
    assert.equal((await ingest(offlineSnapshot())).headers.get("X-ThirdRailify-Persisted"), "true");

    now += 10_000;
    assert.equal((await ingest(snapshot(new Date(now).toISOString()))).headers.get("X-ThirdRailify-Persist-Reason"), "semantic_change");

    now += 10_000;
    const volatile = snapshot(new Date(now).toISOString());
    volatile.providerStatus.youtube.checkedAt = new Date(now).toISOString();
    volatile.primary.observedAt = new Date(now).toISOString();
    volatile.primary.liveVerifiedAt = new Date(now).toISOString();
    volatile.primary.liveExpiresAt = new Date(now + 180_000).toISOString();
    volatile.primary.viewerCount = 999;
    assert.equal((await ingest(volatile)).headers.get("X-ThirdRailify-Persist-Reason"), "unchanged");

    const metadata = structuredClone(volatile);
    metadata.primary.title = "Updated public broadcast title";
    metadata.liveNow[0].title = metadata.primary.title;
    metadata.latest.title = metadata.primary.title;
    metadata.latestByPlatform.youtube.title = metadata.primary.title;
    assert.equal((await ingest(metadata)).headers.get("X-ThirdRailify-Persist-Reason"), "semantic_change");

    now += 10_000;
    assert.equal((await ingest(offlineSnapshot(new Date(now).toISOString()))).headers.get("X-ThirdRailify-Persist-Reason"), "semantic_change");
  } finally {
    Date.now = original;
  }
  assert.equal(kv.putCalls, 4);
});

test("identical live watch state checkpoints at the bounded 150-second lease cadence", async () => {
  const original = Date.now;
  let now = NOW;
  Date.now = () => now;
  const kv = new MemoryKv();
  const env = { THIRDRAILIFY_PUBLIC_STATE: kv, THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
  const ingest = async () => ingestWatch({
    request: signedRequest(snapshot(new Date(now).toISOString()), Math.floor(now / 1000)),
    env,
  });
  try {
    assert.equal((await ingest()).headers.get("X-ThirdRailify-Persisted"), "true");
    now += 149_000;
    assert.equal((await ingest()).headers.get("X-ThirdRailify-Persisted"), "false");
    now += 1000;
    assert.equal((await ingest()).headers.get("X-ThirdRailify-Persist-Reason"), "freshness_checkpoint");
    assert.equal((await ingest()).headers.get("X-ThirdRailify-Persisted"), "false");
  } finally {
    Date.now = original;
  }
  assert.equal(kv.putCalls, 2);
});

test("watch ingest rejects bad, expired, and future signatures or snapshots", async () => {
  await withNow(async () => {
    const kv = new MemoryKv();
    const env = { THIRDRAILIFY_PUBLIC_STATE: kv, THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
    assert.equal((await ingestWatch({ request: signedRequest(snapshot(), Math.floor(NOW / 1000), "wrong"), env })).status, 401);
    assert.equal((await ingestWatch({ request: signedRequest(snapshot(), Math.floor(NOW / 1000) - 301), env })).status, 401);
    const future = snapshot(new Date(NOW + 301_000).toISOString());
    assert.equal((await ingestWatch({ request: signedRequest(future), env })).status, 400);
    assert.equal(kv.putCalls, 0);
  });
});

test("watch ingest rejects unknown fields, unsafe URLs, and mismatched embeds", async () => {
  await withNow(async () => {
    const env = { THIRDRAILIFY_PUBLIC_STATE: new MemoryKv(), THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
    const unknown = snapshot(); unknown.internal = "reject-me";
    assert.equal((await ingestWatch({ request: signedRequest(unknown), env })).status, 400);
    const unsafe = snapshot(); unsafe.primary.watchUrl = "https://evil.example/watch";
    assert.equal((await ingestWatch({ request: signedRequest(unsafe), env })).status, 400);
    const mismatch = snapshot(); mismatch.latestByPlatform.youtube.embedUrl = "https://www.youtube-nocookie.com/embed/WRONGid0000?playsinline=1&rel=0";
    assert.equal((await ingestWatch({ request: signedRequest(mismatch), env })).status, 400);
    const badRumble = snapshot(); badRumble.latestByPlatform.rumble.embedUrl = "https://evil.example/embed/vabc123";
    assert.equal((await ingestWatch({ request: signedRequest(badRumble), env })).status, 400);
  });
});

test("watch ingest permits a validated Rumble candidate without an embed", async () => {
  await withNow(async () => {
    const body = snapshot(); body.latestByPlatform.rumble.embedUrl = null;
    const response = await ingestWatch({
      request: signedRequest(body),
      env: { THIRDRAILIFY_PUBLIC_STATE: new MemoryKv(), THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET },
    });
    assert.equal(response.status, 204);
  });
});

test("watch ingest enforces content type and maximum body size", async () => {
  const env = { THIRDRAILIFY_PUBLIC_STATE: new MemoryKv(), THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
  const textRequest = new Request("https://staging.example/api/watch/ingest", { method: "POST", body: "{}" });
  assert.equal((await ingestWatch({ request: textRequest, env })).status, 415);
  const huge = new Request("https://staging.example/api/watch/ingest", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(64 * 1024 + 1),
  });
  assert.equal((await ingestWatch({ request: huge, env })).status, 413);
});

test("watch GET derives fresh and delayed live state", async () => {
  await withNow(async () => {
    for (const [age, freshness] of [[60, "fresh"], [180, "delayed"]]) {
      const kv = new MemoryKv();
      const body = snapshot(new Date(NOW - age * 1000).toISOString());
      kv.values.set(WATCH_KV_KEY, JSON.stringify({ snapshot: body, receivedAt: new Date(NOW).toISOString() }));
      const response = await getWatch({ request: new Request("https://staging.example/api/watch"), env: { THIRDRAILIFY_PUBLIC_STATE: kv } });
      const result = await response.json();
      assert.equal(result.freshness, freshness);
      assert.equal(result.liveNow.length, 1);
      assert.equal(result.primary.key, "youtube:abc123DEF45");
      assert.match(result.latestByPlatform.rumble.thumbnailUrl, /^\/api\/watch\/thumbnail\?key=/);
      assert.equal(result.semanticFingerprint, undefined);
      assert.equal(result.checkpointReason, undefined);
    }
  });
});

test("watch GET suppresses expired or stale live and retains latest archive", async () => {
  await withNow(async () => {
    for (const mode of ["expired", "stale"]) {
      const kv = new MemoryKv();
      const body = snapshot(mode === "stale" ? new Date(NOW - 900_000).toISOString() : new Date(NOW - 60_000).toISOString());
      if (mode === "expired") body.liveNow[0].liveExpiresAt = "2026-08-22T05:59:59Z";
      kv.values.set(WATCH_KV_KEY, JSON.stringify({ snapshot: body, receivedAt: new Date(NOW).toISOString() }));
      const response = await getWatch({ request: new Request("https://staging.example/api/watch"), env: { THIRDRAILIFY_PUBLIC_STATE: kv } });
      const result = await response.json();
      assert.equal(result.liveNow.length, 0);
      assert.equal(result.primary.presentationState, "archive");
      assert.equal(result.primary.viewerCount, null);
    }
  });
});

test("watch GET is unavailable without Durable Object state and rejects wrong methods", async () => {
  const env = { THIRDRAILIFY_PUBLIC_STATE: new MemoryKv(), THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
  assert.equal((await getWatch({ request: new Request("https://staging.example/api/watch"), env })).status, 503);
  assert.equal((await getWatch({ request: new Request("https://staging.example/api/watch", { method: "POST" }), env })).status, 405);
  assert.equal((await ingestWatch({ request: new Request("https://staging.example/api/watch/ingest"), env })).status, 405);
});

test("watch freshness boundaries are exact", () => {
  assert.equal(watchFreshness(179), "fresh");
  assert.equal(watchFreshness(180), "delayed");
  assert.equal(watchFreshness(899), "delayed");
  assert.equal(watchFreshness(900), "stale");
});

test("Rumble thumbnail proxy is snapshot-key bound and returns a bounded image", async () => {
  const kv = new MemoryKv();
  kv.values.set(WATCH_KV_KEY, JSON.stringify({ snapshot: snapshot(), receivedAt: new Date(NOW).toISOString() }));
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls += 1;
    assert.equal(url, "https://image.example/rumble.webp");
    assert.equal(options.redirect, "manual");
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/webp" } });
  };
  try {
    const unknown = await getWatchThumbnail({
      request: new Request("https://staging.example/api/watch/thumbnail?key=rumble:unknown"),
      env: { THIRDRAILIFY_PUBLIC_STATE: kv },
    });
    assert.equal(unknown.status, 404);
    assert.equal(calls, 0);
    const response = await getWatchThumbnail({
      request: new Request("https://staging.example/api/watch/thumbnail?key=rumble:vabc123"),
      env: { THIRDRAILIFY_PUBLIC_STATE: kv },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/webp");
    assert.equal((await response.arrayBuffer()).byteLength, 3);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Rumble thumbnail proxy rejects private hosts and unbounded upstream bodies", async () => {
  const kv = new MemoryKv();
  const privateSnapshot = snapshot();
  privateSnapshot.latestByPlatform.rumble.thumbnailUrl = "https://127.0.0.1/rumble.webp";
  kv.values.set(WATCH_KV_KEY, JSON.stringify({ snapshot: privateSnapshot, receivedAt: new Date(NOW).toISOString() }));
  assert.equal((await getWatchThumbnail({
    request: new Request("https://staging.example/api/watch/thumbnail?key=rumble:vabc123"),
    env: { THIRDRAILIFY_PUBLIC_STATE: kv },
  })).status, 502);

  kv.values.set(WATCH_KV_KEY, JSON.stringify({ snapshot: snapshot(), receivedAt: new Date(NOW).toISOString() }));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array(5 * 1024 * 1024 + 1), {
    headers: { "Content-Type": "image/webp" },
  });
  try {
    const response = await getWatchThumbnail({
      request: new Request("https://staging.example/api/watch/thumbnail?key=rumble:vabc123"),
      env: { THIRDRAILIFY_PUBLIC_STATE: kv },
    });
    assert.equal(response.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Rumble thumbnail proxy rejects upstream redirects without following them", async () => {
  const kv = new MemoryKv();
  kv.values.set(WATCH_KV_KEY, JSON.stringify({ snapshot: snapshot(), receivedAt: new Date(NOW).toISOString() }));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://image.example/rumble.webp");
    assert.equal(options.redirect, "manual");
    return new Response(null, { status: 302, headers: { Location: "https://redirect.example/image.webp" } });
  };
  try {
    const response = await getWatchThumbnail({
      request: new Request("https://staging.example/api/watch/thumbnail?key=rumble:vabc123"),
      env: { THIRDRAILIFY_PUBLIC_STATE: kv },
    });
    assert.equal(response.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
