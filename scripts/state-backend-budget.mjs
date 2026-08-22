import assert from "node:assert/strict";

const quietDay = {
  communityProducerRequests: 144,
  broadcastProducerRequests: 144,
  publicReadRequests: 5_000,
  sqliteRowWrites: 288,
};
const busyLiveDay = {
  communityProducerRequests: 858,
  broadcastProducerRequests: 351,
  publicReadRequests: 10_000,
  sqliteRowWrites: 1_113,
};
const continuousStormDay = {
  communityProducerRequests: 8_640,
  broadcastProducerRequests: 1_152,
  publicReadRequests: 10_000,
  sqliteRowWrites: 9_216,
};
const freeDailyLimits = {
  durableObjectRequests: 100_000,
  sqliteRowsRead: 5_000_000,
  sqliteRowsWritten: 100_000,
  storageBytes: 5_000_000_000,
};

for (const scenario of [quietDay, busyLiveDay, continuousStormDay]) {
  scenario.durableObjectRequests = scenario.communityProducerRequests
    + scenario.broadcastProducerRequests
    + scenario.publicReadRequests;
  scenario.sqliteRowReads = scenario.durableObjectRequests;
  scenario.conservativeBillableRowsRead = scenario.durableObjectRequests * 3;
  scenario.conservativeBillableRowsWritten = scenario.sqliteRowWrites * 2;
  scenario.kv = { reads: 0, puts: 0, deletes: 0, lists: 0 };
}

const bootstrap = { kv: { reads: 2, puts: 0, deletes: 0, lists: 0 } };
const thirtyDayBusy = {
  durableObjectRequests: busyLiveDay.durableObjectRequests * 30,
  sqliteRowReads: busyLiveDay.sqliteRowReads * 30,
  sqliteRowWrites: busyLiveDay.sqliteRowWrites * 30,
  maximumStateBytes: 200 * 1024,
  kv: { reads: 0, puts: 0, deletes: 0, lists: 0 },
};

assert.deepEqual(quietDay.kv, { reads: 0, puts: 0, deletes: 0, lists: 0 });
assert.deepEqual(busyLiveDay.kv, { reads: 0, puts: 0, deletes: 0, lists: 0 });
assert.deepEqual(thirtyDayBusy.kv, { reads: 0, puts: 0, deletes: 0, lists: 0 });
assert.ok(busyLiveDay.durableObjectRequests < freeDailyLimits.durableObjectRequests);
assert.ok(busyLiveDay.conservativeBillableRowsRead < freeDailyLimits.sqliteRowsRead);
assert.ok(busyLiveDay.conservativeBillableRowsWritten < freeDailyLimits.sqliteRowsWritten);
assert.ok(continuousStormDay.durableObjectRequests < freeDailyLimits.durableObjectRequests);
assert.ok(continuousStormDay.conservativeBillableRowsRead < freeDailyLimits.sqliteRowsRead);
assert.ok(continuousStormDay.conservativeBillableRowsWritten < freeDailyLimits.sqliteRowsWritten);
assert.ok(thirtyDayBusy.maximumStateBytes < freeDailyLimits.storageBytes);

console.log(JSON.stringify({
  bootstrap,
  quietDay,
  busyLiveDay,
  continuousStormDay,
  thirtyDayBusy,
  freeDailyLimits,
  busyLiveHeadroomPercent: {
    requestsUsed: percent(busyLiveDay.durableObjectRequests, freeDailyLimits.durableObjectRequests),
    rowsReadUsed: percent(busyLiveDay.conservativeBillableRowsRead, freeDailyLimits.sqliteRowsRead),
    rowsWrittenUsed: percent(busyLiveDay.conservativeBillableRowsWritten, freeDailyLimits.sqliteRowsWritten),
    storageUsed: percent(thirtyDayBusy.maximumStateBytes, freeDailyLimits.storageBytes),
  },
  continuousStormHeadroomPercent: {
    requestsUsed: percent(continuousStormDay.durableObjectRequests, freeDailyLimits.durableObjectRequests),
    rowsReadUsed: percent(continuousStormDay.conservativeBillableRowsRead, freeDailyLimits.sqliteRowsRead),
    rowsWrittenUsed: percent(continuousStormDay.conservativeBillableRowsWritten, freeDailyLimits.sqliteRowsWritten),
  },
}, null, 2));

function percent(value, limit) {
  return Number((value * 100 / limit).toFixed(3));
}
