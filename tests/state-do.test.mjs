import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { test } from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { COMMUNITY_KV_KEY } from "../functions/api/community/_community.js";
import { WATCH_KV_KEY } from "../functions/api/watch/_watch.js";
import { MemoryStateNamespace } from "./state-function-harness.mjs";

const NOW = "2026-08-23T00:00:00.000Z";

function community(revision = 0) {
  return {
    schema: "thirdrailify-discord-community-v1",
    generatedAt: NOW,
    guild: {
      id: "1114717958573396008",
      name: `Third Railify ${revision}`,
      iconUrl: null,
      inviteUrl: "https://discord.com/invite/Bd8hU5aFxA",
    },
    source: { kind: "thirdrailify-bot", botVersion: "1.1.0" },
    counts: { onlineMembers: 0, publishedMembers: 0, publicChannels: 0 },
    channels: [],
    voiceSpaces: [],
    members: [],
  };
}

function broadcast(revision = 0) {
  return {
    schema: "thirdrailify-broadcast-v1",
    generatedAt: NOW,
    source: { kind: "thirdrailify-bot", botVersion: `1.1.${revision}` },
    providerStatus: {
      youtube: { state: "offline", checkedAt: NOW },
      rumble: { state: "offline", checkedAt: NOW },
    },
    liveNow: [],
    primary: null,
    latest: null,
    latestByPlatform: { youtube: null, rumble: null },
    upcoming: null,
  };
}

function legacy(snapshot) {
  return JSON.stringify({
    snapshot,
    receivedAt: NOW,
    persistedAt: NOW,
  });
}

test("first initialization migrates both legacy KV records once and then never reads KV again", async () => {
  const legacyValues = new Map([
    [COMMUNITY_KV_KEY, legacy(community())],
    [WATCH_KV_KEY, legacy(broadcast())],
  ]);
  const state = new MemoryStateNamespace({ legacyValues });
  await state.ready;
  assert.equal(state.legacyOperations.reads, 2);
  assert.equal(state.putCalls, 2);
  assert.equal(state.service.read("community").snapshot.guild.name, "Third Railify 0");
  assert.equal(state.service.read("broadcast").snapshot.source.botVersion, "1.1.0");
  assert.equal(state.service.diagnostics().legacy_kv_migration, "complete");

  for (let index = 0; index < 100; index += 1) await state.service.initialize();
  assert.deepEqual(state.legacyOperations, { reads: 2, puts: 0, deletes: 0, lists: 0 });
});

test("invalid or absent legacy records complete migration without inventing public state", async () => {
  const state = new MemoryStateNamespace({
    legacyValues: new Map([[COMMUNITY_KV_KEY, "not-json"]]),
  });
  await state.ready;
  assert.equal(state.service.read("community"), null);
  assert.equal(state.service.read("broadcast"), null);
  assert.equal(state.service.diagnostics().legacy_kv_migration, "complete");
  assert.equal(state.legacyOperations.reads, 2);
});

test("100 community writes never alter the broadcast row", async () => {
  const state = new MemoryStateNamespace();
  await state.ready;
  await state.service.write("broadcast", { snapshot: broadcast(), checkpointSeconds: 1800 });
  const originalBroadcast = await state.get(WATCH_KV_KEY);
  for (let index = 1; index <= 100; index += 1) {
    const result = await state.service.write("community", { snapshot: community(index), checkpointSeconds: 600 });
    assert.equal(result.persisted, true);
  }
  assert.equal(await state.get(WATCH_KV_KEY), originalBroadcast);
});

test("100 broadcast writes never alter the community row", async () => {
  const state = new MemoryStateNamespace();
  await state.ready;
  await state.service.write("community", { snapshot: community(), checkpointSeconds: 600 });
  const originalCommunity = await state.get(COMMUNITY_KV_KEY);
  for (let index = 1; index <= 100; index += 1) {
    const result = await state.service.write("broadcast", { snapshot: broadcast(index), checkpointSeconds: 1800 });
    assert.equal(result.persisted, true);
  }
  assert.equal(await state.get(COMMUNITY_KV_KEY), originalCommunity);
});

test("simultaneous cross-key operations serialize without corruption", async () => {
  const state = new MemoryStateNamespace();
  await state.ready;
  const operations = [];
  for (let index = 1; index <= 100; index += 1) {
    operations.push(state.service.write("community", { snapshot: community(index), checkpointSeconds: 600 }));
    operations.push(state.service.write("broadcast", { snapshot: broadcast(index), checkpointSeconds: 1800 }));
  }
  await Promise.all(operations);
  assert.equal(state.service.read("community").snapshot.schema, "thirdrailify-discord-community-v1");
  assert.equal(state.service.read("broadcast").snapshot.schema, "thirdrailify-broadcast-v1");
  assert.equal(JSON.parse(await state.get(COMMUNITY_KV_KEY)).snapshot.guild.name.startsWith("Third Railify "), true);
  assert.equal(JSON.parse(await state.get(WATCH_KV_KEY)).snapshot.source.botVersion.startsWith("1.1."), true);
  assert.deepEqual(state.legacyOperations, { reads: 2, puts: 0, deletes: 0, lists: 0 });
});

