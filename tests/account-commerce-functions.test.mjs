import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Miniflare } from "miniflare";
import { onRequest as accountCommerceRequest } from "../functions/api/account/commerce/[[path]].js";
import { hmacSha256, sha256 } from "../functions/_shared/public-auth.js";

const PUBLIC_ORIGIN = "https://thirdrailify.pages.dev";
const ADMIN_ORIGIN = "https://thirdrailify-admin.pages.dev";
const BRIDGE_SECRET = "synthetic-public-account-commerce-bridge";

test("Public account-commerce resolves the current session and signs a bounded Admin request", async (t) => {
  const redirects = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
  assert.match(redirects, /^\/\* \/index\.html 200$/m, "nested Account routes require an explicit deployed SPA fallback");
  const harness = await createAuthDatabase(); t.after(harness.dispose);
  const { env, cookie, csrf } = await sessionEnvironment(harness.db);
  let calls = 0;
  const response = await accountCommerceRequest({
    request: request("/api/account/commerce", { method: "GET", cookie }), env,
    data: { accountCommerceFetch: async (url, init) => {
      calls += 1; assert.equal(String(url), `${ADMIN_ORIGIN}/api/account-commerce/internal/overview`); assert.equal(init.method, "POST");
      const body = JSON.parse(init.body); assert.equal(body.accountId, "account-session"); assert.deepEqual(body.input, {});
      await assertValidSignature(init, "/api/account-commerce/internal/overview");
      return Response.json(overview());
    } },
  });
  assert.equal(response.status, 200); assert.equal((await response.json()).summary.savedAddressCount, 1); assert.equal(calls, 1);

  const mutation = await accountCommerceRequest({
    request: request("/api/account/commerce/addresses", { method: "POST", cookie, csrf, body: { ...address(), accountId: "forged-account" } }), env,
    data: { accountCommerceFetch: async (_url, init) => {
      const body = JSON.parse(init.body); assert.equal(body.accountId, "account-session"); assert.equal(body.input.accountId, "forged-account");
      await assertValidSignature(init, "/api/account-commerce/internal/addresses/create");
      return Response.json({ ok: false, error: "saved_address_fields_invalid", message: "The supplied account-commerce fields are invalid." }, { status: 400 });
    } },
  });
  assert.equal(mutation.status, 400); assert.equal((await mutation.json()).error, "saved_address_fields_invalid");
});

test("Public account-commerce rejects unauthenticated, cross-origin, CSRF, and unsafe upstream responses", async (t) => {
  const harness = await createAuthDatabase(); t.after(harness.dispose);
  const { env, cookie, csrf } = await sessionEnvironment(harness.db);
  let calls = 0; const never = async () => { calls += 1; return Response.json(overview()); };
  assert.equal((await accountCommerceRequest({ request: request("/api/account/commerce", { method: "GET" }), env, data: { accountCommerceFetch: never } })).status, 401);
  assert.equal((await accountCommerceRequest({ request: request("/api/account/commerce/addresses", { method: "POST", cookie, body: address() }), env, data: { accountCommerceFetch: never } })).status, 403);
  assert.equal((await accountCommerceRequest({ request: request("/api/account/commerce/addresses", { method: "POST", cookie, csrf, origin: "https://attacker.example", body: address() }), env, data: { accountCommerceFetch: never } })).status, 403);
  assert.equal(calls, 0);
  const unsafe = await accountCommerceRequest({ request: request("/api/account/commerce", { method: "GET", cookie }), env, data: { accountCommerceFetch: async () => Response.json({ ...overview(), leaked_ciphertext: "secret" }) } });
  assert.equal(unsafe.status, 502); assert.equal((await unsafe.json()).error, "account_commerce_projection_invalid");
});

async function sessionEnvironment(db) {
  const token = "public-account-commerce-session-token"; const rateSecret = "public-account-commerce-rate-secret";
  const csrf = await hmacSha256(rateSecret, `csrf:${token}`); const now = new Date().toISOString();
  await db.prepare("INSERT INTO accounts (id,email_normalized,display_name,role,admin_level,status,email_verified_at,created_at,updated_at,source) VALUES ('account-session','buyer@example.test','Account Buyer','user','none','active',?,?,?,'test')").bind(now, now, now).run();
  await db.prepare("INSERT INTO sessions (id,account_id,token_hash,csrf_token_hash,created_at,expires_at,last_seen_at,source_origin) VALUES ('session-account-commerce','account-session',?,?,?,'2099-08-30T00:00:00.000Z',? ,?)")
    .bind(await sha256(token), await sha256(csrf), now, now, PUBLIC_ORIGIN).run();
  return { cookie: `thirdrailify_session=${encodeURIComponent(token)}`, csrf, env: { THIRDRAILIFY_AUTH_DB: db, THIRDRAILIFY_PUBLIC_ORIGIN: PUBLIC_ORIGIN, THIRDRAILIFY_ADMIN_ORIGIN: ADMIN_ORIGIN, THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET: rateSecret, THIRDRAILIFY_COMMUNITY_API_SECRET: BRIDGE_SECRET } };
}

function request(path, { method = "GET", cookie = "", csrf = "", origin = PUBLIC_ORIGIN, body } = {}) {
  const headers = new Headers({ Origin: origin }); if (cookie) headers.set("Cookie", cookie); if (csrf) headers.set("X-CSRF-Token", csrf);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request(`${PUBLIC_ORIGIN}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}

async function assertValidSignature(init, pathname) {
  const timestamp = init.headers["X-ThirdRailify-Timestamp"]; const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(init.body))), (byte) => byte.toString(16).padStart(2, "0")).join("");
  assert.equal(init.headers["X-ThirdRailify-Signature"], await hmacSha256(BRIDGE_SECRET, `${timestamp}\nPOST\n${pathname}\n${digest}`)); assert.equal(init.headers.Origin, PUBLIC_ORIGIN);
}

function address() { return { label: "Home", recipientName: "Buyer", company: "", address1: "100 Test Street", address2: "", city: "London", region: "ON", postalCode: "N6A 1A1", countryCode: "CA", phone: "", isDefault: true }; }
function overview() { return { ok: true, authority: "Admin Commerce D1", linked: true, contact: { name: "Buyer", phone: null, email: "buyer@example.test", emailVerified: true, revision: 1 }, addresses: [{ id: "adr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", ...address(), company: null, address2: null, region: "ON", phone: null, revision: 1, createdAt: "2026-08-30", updatedAt: "2026-08-30", externallyVerified: false }], orders: [], summary: { savedAddressCount: 1, orderCount: 0, liveOrderCount: 0, testOrderCount: 0 }, checkout: { enabled: false, livePaymentCaptureEnabled: false, fulfillmentSubmissionEnabled: false, shippingConfigured: false, message: "Checkout is currently unavailable." } }; }

async function createAuthDatabase() {
  const miniflare = new Miniflare({ compatibilityDate: "2026-08-11", d1Databases: ["THIRDRAILIFY_AUTH_DB"], modules: true, script: "export default { fetch() { return new Response('test'); } };" });
  const db = await miniflare.getD1Database("THIRDRAILIFY_AUTH_DB");
  const statements = [
    `CREATE TABLE accounts (id TEXT PRIMARY KEY,email_normalized TEXT UNIQUE,display_name TEXT NOT NULL,avatar_url TEXT,role TEXT NOT NULL,admin_level TEXT NOT NULL,status TEXT NOT NULL,email_verified_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,last_login_at TEXT,source TEXT NOT NULL)`,
    `CREATE TABLE auth_identities (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,provider TEXT NOT NULL,provider_subject TEXT NOT NULL,provider_username TEXT,created_at TEXT NOT NULL)`,
    `CREATE TABLE sessions (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,csrf_token_hash TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,revoked_at TEXT,source_origin TEXT NOT NULL,user_agent_hash TEXT)`,
  ];
  for (const statement of statements) await db.prepare(statement).run();
  return { db, dispose: () => miniflare.dispose() };
}
