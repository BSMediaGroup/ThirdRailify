import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/polls/[[path]].js";
import { hmacSha256 } from "../functions/_shared/public-auth.js";

const PUBLIC_ORIGIN = "https://www.thirdrailify.test";
const ADMIN_ORIGIN = "https://admin.thirdrailify.test";
const RELAY_SECRET = "community-relay-secret";

test("anonymous Poll vote is origin-bound, signed upstream, and gets an opaque HttpOnly identity", async () => {
  let upstream;
  const response = await onRequest(context("https://www.thirdrailify.test/api/polls/live-choice/vote", {
    method: "POST",
    headers: { Origin: PUBLIC_ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ optionId: "opt_choice123" }),
  }, async (url, init) => {
    upstream = { url, init };
    return Response.json({ ok: true, poll: { id: "pol_choice123" }, vote: { repeated: false, changed: false } });
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /^thirdrailify_poll_voter=.*HttpOnly; SameSite=Lax/);
  assert.equal(upstream.url, `${ADMIN_ORIGIN}/api/polls/internal/live-choice/vote`);
  const body = String(upstream.init.body);
  const timestamp = upstream.init.headers["X-ThirdRailify-Timestamp"];
  const requestId = upstream.init.headers["X-ThirdRailify-Request-Id"];
  const digest = await digestHex(body);
  assert.equal(
    upstream.init.headers["X-ThirdRailify-Signature"],
    await hmacSha256(RELAY_SECRET, `POST\n/api/polls/internal/live-choice/vote\n${timestamp}\n${requestId}\n${digest}`),
  );
  const relay = JSON.parse(body);
  assert.equal(relay.actor.namespace, "web_anonymous");
  assert.match(relay.actor.key, /^anonymous:[a-f0-9-]{36}$/);
  assert.equal("voterId" in relay.input, false);
});

test("cross-origin Poll writes fail before any Admin relay", async () => {
  let called = false;
  const response = await onRequest(context("https://www.thirdrailify.test/api/polls/live-choice/vote", {
    method: "POST",
    headers: { Origin: "https://preview.example", "Content-Type": "application/json" },
    body: JSON.stringify({ optionId: "opt_choice123" }),
  }, async () => { called = true; return Response.json({ ok: true }); }));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "origin_not_allowed");
  assert.equal(called, false);
});

function context(url, init, pollsFetch) {
  return {
    request: new Request(url, init),
    env: {
      THIRDRAILIFY_PUBLIC_ORIGIN: PUBLIC_ORIGIN,
      THIRDRAILIFY_ADMIN_ORIGIN: ADMIN_ORIGIN,
      THIRDRAILIFY_COMMUNITY_API_SECRET: RELAY_SECRET,
      THIRDRAILIFY_POLL_ANONYMOUS_SECRET: "anonymous-cookie-secret",
    },
    data: { pollsFetch },
  };
}

async function digestHex(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
