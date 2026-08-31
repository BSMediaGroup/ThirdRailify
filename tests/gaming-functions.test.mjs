import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/gaming/suggestions.js";
import { hmacSha256, sha256 } from "../functions/_shared/public-auth.js";

const env = {
  THIRDRAILIFY_PUBLIC_ORIGIN: "https://thirdrailify.pages.dev",
  THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev",
  THIRDRAILIFY_COMMUNITY_API_SECRET: "gaming-signing-fixture",
  THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET: "gaming-rate-fixture",
};

test("Public Gaming intake signs a bounded guest request without trusting browser identity", async () => {
  let forwarded;
  const response = await onRequest({ request: request({ gameTitle: "Deep Rock Galactic", accountId: "browser-forgery", pitch: "Co-op chaos.", steamUrl: "", website: "", turnstileToken: "fixture-token" }), env, data: { gamingFetch: async (url, init) => { forwarded = { url, init }; return Response.json({ ok: true, reference: "GAM-A1B2C3D4" }); } } });
  assert.equal(response.status, 200);
  assert.equal(forwarded.url, "https://thirdrailify-admin.pages.dev/api/gaming/suggestions");
  assert.equal(forwarded.init.method, "POST");
  assert.equal(forwarded.init.headers.Origin, "https://thirdrailify.pages.dev");
  assert.match(forwarded.init.headers["X-ThirdRailify-Signature"], /^[A-Za-z0-9_-]{43}$/);
  const body = JSON.parse(forwarded.init.body);
  assert.equal(body.gameTitle, "Deep Rock Galactic");
  assert.equal(body.accountId, null);
  assert.equal(body.displayName, null);
  assert.match(body.rateKey, /^[A-Za-z0-9_-]{43}$/);
  assert.match(body.requestId, /^[0-9a-f-]{36}$/);
  assert.doesNotMatch(forwarded.init.body, /203\.0\.113\.42|browser-forgery/);
  assert.deepEqual(await response.json(), { ok: true, reference: "GAM-A1B2C3D4", message: "Your game request reached the Third Railify Admin inbox." });
});

test("Public Gaming intake attaches only server-resolved account identity and requires its CSRF proof", async () => {
  const token = "gaming-session-token";
  const csrfToken = await hmacSha256(env.THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET, `csrf:${token}`);
  const sessionRow = {
    session_id: "session-1", account_id: "account-authoritative", csrf_token_hash: await sha256(csrfToken),
    expires_at: new Date(Date.now() + 60_000).toISOString(), last_seen_at: new Date().toISOString(), revoked_at: null,
    id: "account-authoritative", email_normalized: "viewer@example.test", display_name: "Trusted Viewer", avatar_url: null,
    source: "email", role: "customer", admin_level: "none", status: "active", email_verified_at: null, created_at: "2026-01-01T00:00:00.000Z", last_login_at: null,
  };
  const authDb = fakeAuthDb(sessionRow);
  let body;
  const response = await onRequest({ request: request({ gameTitle: "Portal 2", accountId: "forged" }, undefined, { Cookie: `thirdrailify_session=${token}`, "X-CSRF-Token": csrfToken }), env: { ...env, THIRDRAILIFY_AUTH_DB: authDb }, data: { gamingFetch: async (_url, init) => { body = JSON.parse(init.body); return Response.json({ ok: true, reference: "GAM-B1C2D3E4" }); } } });
  assert.equal(response.status, 200);
  assert.equal(body.accountId, "account-authoritative");
  assert.equal(body.displayName, "Trusted Viewer");
  const rejected = await onRequest({ request: request({ gameTitle: "Portal 2" }, undefined, { Cookie: `thirdrailify_session=${token}`, "X-CSRF-Token": "wrong" }), env: { ...env, THIRDRAILIFY_AUTH_DB: authDb } });
  assert.equal(rejected.status, 403);
});

test("Public Gaming intake rejects cross-origin, non-JSON, oversized, and unsafe authority responses", async () => {
  assert.equal((await onRequest({ request: request({}, "https://attacker.example"), env })).status, 403);
  assert.equal((await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/gaming/suggestions", { method: "POST", headers: { Origin: env.THIRDRAILIFY_PUBLIC_ORIGIN, "Content-Type": "text/plain" }, body: "fixture" }), env })).status, 415);
  assert.equal((await onRequest({ request: request({ pitch: "x".repeat(9 * 1024) }), env })).status, 413);
  assert.equal((await onRequest({ request: new Request("https://thirdrailify.pages.dev/api/gaming/suggestions", { method: "GET" }), env })).status, 405);
  assert.equal((await onRequest({ request: request({ gameTitle: "Portal 2" }), env: { ...env, THIRDRAILIFY_COMMUNITY_API_SECRET: "" } })).status, 503);
  assert.equal((await onRequest({ request: request({ gameTitle: "Portal 2" }), env, data: { gamingFetch: async () => new Response("bad gateway", { status: 502 }) } })).status, 502);
});

test("Public Gaming honeypot returns generic success without forwarding", async () => {
  let calls = 0;
  const response = await onRequest({ request: request({ website: "spam.example" }), env, data: { gamingFetch: async () => { calls += 1; throw new Error("unexpected"); } } });
  assert.equal(response.status, 200);
  assert.equal(calls, 0);
});

function request(overrides = {}, origin = env.THIRDRAILIFY_PUBLIC_ORIGIN, extraHeaders = {}) {
  return new Request("https://thirdrailify.pages.dev/api/gaming/suggestions", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.42", ...extraHeaders }, body: JSON.stringify({ gameTitle: "Portal 2", steamUrl: "", pitch: "", website: "", turnstileToken: "fixture-token", ...overrides }) });
}

function fakeAuthDb(row) {
  return { prepare(sql) { return { bind() { return { first: async () => sql.includes("FROM sessions JOIN accounts") ? row : null, all: async () => ({ results: sql.includes("auth_identities") ? [] : [] }), run: async () => ({ meta: { changes: 1 } }) }; } }; } };
}

