import assert from "node:assert/strict";
import { createHmac, webcrypto } from "node:crypto";
import { test } from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { COMMUNITY_KV_KEY } from "../functions/api/community/_community.js";
import { onRequest as getCommunity } from "../functions/api/community/discord.js";
import { onRequest as ingestCommunity } from "../functions/api/community/discord/ingest.js";

const SECRET = "local-functions-test-secret";
const NOW = Date.parse("2026-08-12T06:00:00Z");

class MemoryKv {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async put(key, value) {
    this.values.set(key, value);
  }
}

function snapshot(generatedAt = "2026-08-12T05:59:00Z") {
  return {
    schema: "thirdrailify-discord-community-v1",
    generatedAt,
    guild: {
      id: "1114717958573396008",
      name: "Third Railify",
      iconUrl: "https://cdn.discordapp.com/icons/1/icon.png",
      inviteUrl: "https://discord.com/invite/Bd8hU5aFxA",
      unexpectedGuildField: "strip-me",
    },
    source: { kind: "thirdrailify-bot", botVersion: "1.1.0", unexpectedSourceField: true },
    counts: { onlineMembers: 1, publishedMembers: 1, publicChannels: 2 },
    channels: [
      {
        key: "channel-123",
        name: "general",
        type: "text",
        topic: "Public conversation",
        categoryName: "Community",
        position: 1,
        url: "https://discord.com/channels/1114717958573396008/123",
        permissions: "must-not-persist",
      },
      {
        key: "channel-124",
        name: "Lobby",
        type: "voice",
        topic: null,
        categoryName: "Community",
        position: 2,
        url: "https://discord.com/channels/1114717958573396008/124",
      },
    ],
    voiceSpaces: [
      {
        key: "channel-124",
        name: "Lobby",
        type: "voice",
        topic: null,
        categoryName: "Community",
        position: 2,
        url: "https://discord.com/channels/1114717958573396008/124",
      },
    ],
    members: [
      {
        key: "member-0123456789abcdef01234567",
        displayName: "Rail Member",
        username: "railmember",
        nickname: "Rail",
        avatarUrl: "https://cdn.discordapp.com/avatars/1/avatar.png",
        status: "online",
        joinedAt: "2025-08-12T00:00:00Z",
        bot: false,
        roles: ["admin"],
      },
    ],
    topLevelUnknown: "strip-me",
  };
}

function signedRequest(body, timestamp = Math.floor(NOW / 1000), signatureSecret = SECRET) {
  const raw = JSON.stringify(body);
  const signature = createHmac("sha256", signatureSecret).update(`${timestamp}.${raw}`).digest("hex");
  return new Request("https://staging.example/api/community/discord/ingest", {
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
  try {
    return await callback();
  } finally {
    Date.now = original;
  }
}

test("ingest accepts valid HMAC and persists only normalized public fields", async () => {
  await withNow(async () => {
    const kv = new MemoryKv();
    const response = await ingestCommunity({
      request: signedRequest(snapshot()),
      env: { THIRDRAILIFY_COMMUNITY_KV: kv, THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const stored = JSON.parse(await kv.get(COMMUNITY_KV_KEY));
    assert.equal(stored.snapshot.topLevelUnknown, undefined);
    assert.equal(stored.snapshot.guild.unexpectedGuildField, undefined);
    assert.equal(stored.snapshot.channels[0].permissions, undefined);
    assert.equal(stored.snapshot.members[0].roles, undefined);
    assert.equal(stored.snapshot.voiceSpaces.length, 1);
  });
});

test("ingest rejects bad and expired signatures", async () => {
  await withNow(async () => {
    const env = { THIRDRAILIFY_COMMUNITY_KV: new MemoryKv(), THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
    assert.equal((await ingestCommunity({ request: signedRequest(snapshot(), Math.floor(NOW / 1000), "wrong"), env })).status, 401);
    assert.equal((await ingestCommunity({ request: signedRequest(snapshot(), Math.floor(NOW / 1000) - 301), env })).status, 401);
  });
});

test("ingest rejects wrong guild, malformed schema, and oversized body", async () => {
  await withNow(async () => {
    const env = { THIRDRAILIFY_COMMUNITY_KV: new MemoryKv(), THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
    const wrongGuild = snapshot();
    wrongGuild.guild.id = "1";
    assert.equal((await ingestCommunity({ request: signedRequest(wrongGuild), env })).status, 400);
    const malformed = snapshot();
    malformed.members[0].status = "offline";
    assert.equal((await ingestCommunity({ request: signedRequest(malformed), env })).status, 400);
    const huge = new Request("https://staging.example/api/community/discord/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x".repeat(96 * 1024 + 1),
    });
    assert.equal((await ingestCommunity({ request: huge, env })).status, 413);
  });
});

test("GET derives fresh, delayed, and stale metadata and neutralizes stale presence", async () => {
  await withNow(async () => {
    for (const [age, expected] of [[60, "fresh"], [300, "delayed"], [700, "stale"]]) {
      const kv = new MemoryKv();
      const generatedAt = new Date(NOW - age * 1000).toISOString();
      kv.values.set(COMMUNITY_KV_KEY, JSON.stringify({ snapshot: snapshot(generatedAt), receivedAt: new Date(NOW).toISOString() }));
      const response = await getCommunity({
        request: new Request("https://staging.example/api/community/discord"),
        env: { THIRDRAILIFY_COMMUNITY_KV: kv },
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.ageSeconds, age);
      assert.equal(body.freshness, expected);
      assert.equal(body.members[0].status, expected === "stale" ? "unknown" : "online");
    }
  });
});

test("GET returns a truthful unavailable response when no snapshot exists", async () => {
  const response = await getCommunity({
    request: new Request("https://staging.example/api/community/discord"),
    env: { THIRDRAILIFY_COMMUNITY_KV: new MemoryKv() },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { available: false, status: "unavailable" });
});

test("method boundaries reject unintended verbs", async () => {
  const env = { THIRDRAILIFY_COMMUNITY_KV: new MemoryKv(), THIRDRAILIFY_COMMUNITY_INGEST_SECRET: SECRET };
  assert.equal((await ingestCommunity({ request: new Request("https://staging.example/api/community/discord/ingest"), env })).status, 405);
  assert.equal((await getCommunity({ request: new Request("https://staging.example/api/community/discord", { method: "POST" }), env })).status, 405);
});
