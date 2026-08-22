import assert from "node:assert/strict";
import { test } from "node:test";

import { MemoryStateNamespace } from "./state-function-harness.mjs";

const DAY_SECONDS = 24 * 60 * 60;

function operationsForDuration(durationSeconds, cadenceSeconds) {
  return Math.ceil(durationSeconds / cadenceSeconds);
}

test("pre-migration community-only optimization could not eliminate shared namespace writes", () => {
  const previous = {
    communityIdleProducerPosts: operationsForDuration(DAY_SECONDS, 600),
    communityContinuousProducerPosts: operationsForDuration(DAY_SECONDS, 300),
    communityQuietKvPuts: operationsForDuration(DAY_SECONDS, 1800),
    broadcastOfflineProducerPosts: operationsForDuration(DAY_SECONDS, 600),
    broadcastLiveProducerPosts: operationsForDuration(DAY_SECONDS, 75),
    broadcastQuietKvPuts: operationsForDuration(DAY_SECONDS, 1800),
    broadcastFullLiveKvPuts: operationsForDuration(DAY_SECONDS, 150),
  };
  assert.deepEqual(previous, {
    communityIdleProducerPosts: 144,
    communityContinuousProducerPosts: 288,
    communityQuietKvPuts: 48,
    broadcastOfflineProducerPosts: 144,
    broadcastLiveProducerPosts: 1152,
    broadcastQuietKvPuts: 48,
    broadcastFullLiveKvPuts: 576,
  });
  assert.equal(previous.communityQuietKvPuts + previous.broadcastQuietKvPuts, 96);
  assert.equal(previous.communityQuietKvPuts + previous.broadcastFullLiveKvPuts, 624);
});

test("24-hour migrated simulation has exact zero steady-state KV operations", async () => {
  let now = Date.parse("2026-08-23T00:00:00Z");
  const state = new MemoryStateNamespace({ now: () => now });
  await state.ready;
  assert.deepEqual(state.legacyOperations, { reads: 2, puts: 0, deletes: 0, lists: 0 });
  state.legacyOperations.reads = 0;
  for (let minute = 0; minute < 24 * 60; minute += 1) {
    now += 60_000;
    await state.service.write("community", { snapshot: communitySnapshot(now, minute), checkpointSeconds: 600 });
    await state.service.write("broadcast", { snapshot: broadcastSnapshot(now, minute), checkpointSeconds: 150 });
  }
  assert.deepEqual(state.legacyOperations, { reads: 0, puts: 0, deletes: 0, lists: 0 });
});

test("30-day migrated simulation has exact zero steady-state KV operations", async () => {
  let now = Date.parse("2026-08-23T00:00:00Z");
  const state = new MemoryStateNamespace({ now: () => now });
  await state.ready;
  state.legacyOperations.reads = 0;
  for (let interval = 0; interval < 30 * 24 * 6; interval += 1) {
    now += 600_000;
    await state.service.write("community", { snapshot: communitySnapshot(now, interval), checkpointSeconds: 600 });
    await state.service.write("broadcast", { snapshot: broadcastSnapshot(now, interval), checkpointSeconds: 600 });
  }
  assert.deepEqual(state.legacyOperations, { reads: 0, puts: 0, deletes: 0, lists: 0 });
});

test("unmigrated bootstrap reads exactly two legacy keys without mutations", async () => {
  const state = new MemoryStateNamespace();
  await state.ready;
  assert.deepEqual(state.legacyOperations, { reads: 2, puts: 0, deletes: 0, lists: 0 });
});

function communitySnapshot(milliseconds, revision) {
  return {
    schema: "thirdrailify-discord-community-v1",
    generatedAt: new Date(milliseconds).toISOString(),
    guild: {
      id: "1114717958573396008",
      name: `Third Railify ${revision % 3}`,
      iconUrl: null,
      inviteUrl: "https://discord.com/invite/Bd8hU5aFxA",
    },
    source: { kind: "thirdrailify-bot", botVersion: "1.1.0" },
    counts: { onlineMembers: revision % 10, publishedMembers: 0, publicChannels: 0 },
    channels: [],
    voiceSpaces: [],
    members: [],
  };
}

function broadcastSnapshot(milliseconds, revision) {
  const generatedAt = new Date(milliseconds).toISOString();
  return {
    schema: "thirdrailify-broadcast-v1",
    generatedAt,
    source: { kind: "thirdrailify-bot", botVersion: "1.1.0" },
    providerStatus: {
      youtube: { state: revision % 4 ? "offline" : "unknown", checkedAt: generatedAt },
      rumble: { state: "offline", checkedAt: generatedAt },
    },
    liveNow: [],
    primary: null,
    latest: null,
    latestByPlatform: { youtube: null, rumble: null },
    upcoming: null,
  };
}
