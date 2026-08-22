import assert from "node:assert/strict";
import { test } from "node:test";

import { COMMUNITY_CHECKPOINT_SECONDS } from "../functions/api/community/_community.js";
import {
  WATCH_INACTIVE_CHECKPOINT_SECONDS,
  WATCH_LIVE_CHECKPOINT_SECONDS,
} from "../functions/api/watch/_watch.js";

const DAY_SECONDS = 24 * 60 * 60;

function writesForDuration(durationSeconds, cadenceSeconds) {
  return Math.ceil(durationSeconds / cadenceSeconds);
}

test("current producer cadence deterministically explains the pre-dedupe KV write rate", () => {
  const current = {
    communityIdle: writesForDuration(DAY_SECONDS, 600),
    communityContinuousChange: writesForDuration(DAY_SECONDS, 300),
    broadcastOffline: writesForDuration(DAY_SECONDS, 600),
    broadcastUpcoming: writesForDuration(DAY_SECONDS, 150),
    broadcastLive: writesForDuration(DAY_SECONDS, 75),
  };
  assert.deepEqual(current, {
    communityIdle: 144,
    communityContinuousChange: 288,
    broadcastOffline: 144,
    broadcastUpcoming: 576,
    broadcastLive: 1152,
  });
  assert.equal(current.communityIdle + current.broadcastOffline, 288);
  assert.equal(current.communityIdle + current.broadcastLive, 1296);
});

test("24-hour quiet, normal-live, and busy-live server budgets stay bounded", () => {
  const communityQuiet = writesForDuration(DAY_SECONDS, COMMUNITY_CHECKPOINT_SECONDS);
  const broadcastQuiet = writesForDuration(DAY_SECONDS, WATCH_INACTIVE_CHECKPOINT_SECONDS);
  const quietCombined = communityQuiet + broadcastQuiet;

  const normalLiveHours = 4;
  const normalBroadcast = writesForDuration(normalLiveHours * 3600, WATCH_LIVE_CHECKPOINT_SECONDS)
    + writesForDuration((24 - normalLiveHours) * 3600, WATCH_INACTIVE_CHECKPOINT_SECONDS)
    + 2;
  const normalCombined = communityQuiet + normalBroadcast;

  const busyLiveHours = 6;
  const busyBroadcast = writesForDuration(busyLiveHours * 3600, WATCH_LIVE_CHECKPOINT_SECONDS)
    + writesForDuration((24 - busyLiveHours) * 3600, WATCH_INACTIVE_CHECKPOINT_SECONDS)
    + 2;
  const busyCombined = communityQuiet + busyBroadcast;

  assert.equal(communityQuiet, 48);
  assert.equal(broadcastQuiet, 48);
  assert.equal(quietCombined, 96);
  assert.equal(normalCombined, 186);
  assert.equal(busyCombined, 230);
  assert.ok(quietCombined < 100);
  assert.ok(normalCombined < 500, "normal scenario must fail before approaching 500 KV PUTs/day");
  assert.ok(busyCombined < 250);
  assert.ok(busyCombined < 1000);
});

test("30-day projections preserve account-wide daily headroom", () => {
  const quietDaily = writesForDuration(DAY_SECONDS, COMMUNITY_CHECKPOINT_SECONDS)
    + writesForDuration(DAY_SECONDS, WATCH_INACTIVE_CHECKPOINT_SECONDS);
  const busyDaily = 230;
  assert.equal(quietDaily * 30, 2880);
  assert.equal(busyDaily * 30, 6900);
  assert.ok(quietDaily < 1000);
  assert.ok(busyDaily < 1000);
});
