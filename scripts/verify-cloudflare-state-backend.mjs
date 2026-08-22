import process from "node:process";

import {
  STATE_BACKEND_CONTRACT_VERSION,
  STATE_BACKEND_NAME,
  STATE_BACKEND_SOURCE_FINGERPRINT,
  STATE_BACKEND_SOURCE_RELEASE,
} from "../functions/api/_state-contract.js";

const origin = (process.argv[2] ?? "https://thirdrailify.pages.dev").replace(/\/$/, "");
let result = "CURRENT";
const checks = [];

try {
  const [community, watch, state] = await Promise.all([
    probe("community", `${origin}/api/community/discord`),
    probe("watch", `${origin}/api/watch`),
    probe("state", `${origin}/api/state-backend`),
  ]);
  if (!state.reachable) result = "UNREACHABLE";
  else if (!state.body || typeof state.body !== "object" || !("contract_version" in state.body)) result = "INCOMPATIBLE";
  else {
    const expected = {
      contract_version: STATE_BACKEND_CONTRACT_VERSION,
      source_release: STATE_BACKEND_SOURCE_RELEASE,
      source_fingerprint: STATE_BACKEND_SOURCE_FINGERPRINT,
      state_backend: STATE_BACKEND_NAME,
      legacy_kv_migration: "complete",
      legacy_kv_read_only: true,
      expected_steady_state_kv_puts_per_day: 0,
      expected_steady_state_kv_deletes_per_day: 0,
      expected_steady_state_kv_lists_per_day: 0,
      expected_steady_state_kv_reads_per_day: 0,
    };
    for (const [key, value] of Object.entries(expected)) {
      const current = state.body[key];
      const matches = current === value;
      checks.push({ key, matches, expected: value, current });
      if (!matches && ["contract_version", "state_backend", "legacy_kv_read_only"].includes(key)) {
        result = "INCOMPATIBLE";
      } else if (!matches && result !== "INCOMPATIBLE") {
        result = "STALE";
      }
    }
    if (!community.reachable || !watch.reachable) result = "UNREACHABLE";
    else if (![200, 503].includes(community.status) || ![200, 503].includes(watch.status)) result = "INCOMPATIBLE";
  }
} catch {
  result = "UNREACHABLE";
}

console.log(`Cloudflare state backend: ${result}`);
for (const check of checks) console.log(`${check.matches ? "PASS" : "FAIL"} ${check.key}`);
process.exitCode = result === "CURRENT" ? 0 : 2;

async function probe(name, url) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    console.log(`${name}: HTTP ${response.status}`);
    return { reachable: true, status: response.status, body };
  } catch {
    console.log(`${name}: unreachable`);
    return { reachable: false, status: 0, body: null };
  }
}
