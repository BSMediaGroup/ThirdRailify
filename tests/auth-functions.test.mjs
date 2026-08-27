import assert from "node:assert/strict";
import test from "node:test";
import { Miniflare } from "miniflare";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.mjs";
import { createServer } from "vite";
import { onRequest as authRequest } from "../functions/api/auth/[[path]].js";
import { sha256 } from "../functions/_shared/public-auth.js";

const PUBLIC_ORIGIN = "https://thirdrailify.pages.dev";
const envFor = (db) => ({
  THIRDRAILIFY_AUTH_DB: db,
  THIRDRAILIFY_PUBLIC_ORIGIN: PUBLIC_ORIGIN,
  THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev",
  THIRDRAILIFY_PROFILE_MEDIA_ORIGIN: "https://thirdrailify-admin.pages.dev",
  THIRDRAILIFY_AUTH_COOKIE_DOMAIN: "",
  THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET: "test-only-rate-limit-secret",
});

test("public auth consumes a one-time handoff, issues a host session, and enforces CSRF logout", async (t) => {
  const miniflare = new Miniflare({
    compatibilityDate: "2026-01-20",
    d1Databases: ["THIRDRAILIFY_AUTH_DB"],
    modules: true,
    script: "export default { fetch() { return new Response('test'); } };",
  });
  t.after(() => miniflare.dispose());
  const db = await miniflare.getD1Database("THIRDRAILIFY_AUTH_DB");
  await createContractSchema(db);
  const env = envFor(db);
  const now = new Date().toISOString();
  const code = "one-time-public-handoff";

  await db.batch([
    db
      .prepare(
        `INSERT INTO accounts (
           id, email_normalized, display_name, avatar_url, role, admin_level, status,
           email_verified_at, created_at, updated_at, last_login_at, source
         ) VALUES ('account-1', 'person@example.test', 'Rail Person', NULL, 'user', 'none', 'active', ?, ?, ?, NULL, 'email')`,
      )
      .bind(now, now, now),
    db
      .prepare(
        `INSERT INTO auth_handoffs (
           id, code_hash, account_id, target_origin, return_to, created_at, expires_at, consumed_at
         ) VALUES ('handoff-1', ?, 'account-1', ?, '/watch', ?, ?, NULL)`,
      )
      .bind(await sha256(code), PUBLIC_ORIGIN, now, new Date(Date.now() + 5 * 60 * 1000).toISOString()),
  ]);

  const foreignOrigin = await callAuth("handoff", { origin: "https://attacker.example", body: { code } }, env);
  assert.equal(foreignOrigin.status, 403);
  assert.equal((await foreignOrigin.json()).error, "origin_not_allowed");

  const handoff = await callAuth("handoff", { origin: PUBLIC_ORIGIN, body: { code } }, env);
  assert.equal(handoff.status, 200);
  const payload = await handoff.json();
  const cookie = cookiePair(handoff.headers.get("set-cookie"));
  assert.equal(payload.authenticated, true);
  assert.equal(payload.account.email, "person@example.test");
  assert.equal(payload.returnTo, "/watch");
  assert.ok(payload.csrfToken);
  assert.match(handoff.headers.get("set-cookie"), /HttpOnly/);
  assert.match(handoff.headers.get("set-cookie"), /SameSite=Lax/);
  assert.equal(handoff.headers.get("set-cookie").includes("Domain="), false);

  const replay = await callAuth("handoff", { origin: PUBLIC_ORIGIN, body: { code } }, env);
  assert.equal(replay.status, 400);
  assert.equal((await replay.json()).error, "handoff_invalid");

  const session = await callAuth("session", { method: "GET", origin: PUBLIC_ORIGIN, cookie }, env);
  assert.equal(session.status, 200);
  assert.equal((await session.json()).authenticated, true);

  let avatarProxyCalls = 0;
  const avatar = await callAuth(
    "avatar",
    { origin: PUBLIC_ORIGIN, body: { imageUrl: "https://images.example.test/avatar.webp" }, cookie, csrfToken: payload.csrfToken },
    env,
    async (input, init) => {
      avatarProxyCalls += 1;
      assert.equal(String(input), "https://thirdrailify-admin.pages.dev/api/auth/avatar");
      const headers = new Headers(init.headers);
      assert.equal(headers.get("origin"), PUBLIC_ORIGIN);
      assert.equal(headers.get("x-csrf-token"), payload.csrfToken);
      assert.match(headers.get("cookie"), /^thirdrailify_session=/);
      assert.deepEqual(JSON.parse(new TextDecoder().decode(init.body)), { imageUrl: "https://images.example.test/avatar.webp" });
      return Response.json({ ...payload, account: { ...payload.account, avatarUrl: "https://thirdrailify-admin.pages.dev/u/account/avatar/hash.webp" } });
    },
  );
  assert.equal(avatar.status, 200);
  assert.equal((await avatar.json()).account.avatarUrl, "https://thirdrailify-admin.pages.dev/u/account/avatar/hash.webp");
  assert.equal(avatarProxyCalls, 1);
  assert.equal("THIRDRAILIFY_PROFILE_MEDIA" in env, false, "Public owns no profile-media object binding");

  const noCsrfProfile = await callAuth("profile", { origin: PUBLIC_ORIGIN, body: { displayName: "Updated Person" }, cookie }, env);
  assert.equal(noCsrfProfile.status, 403);

  let profileProxyCalls = 0;
  const profile = await callAuth(
    "profile",
    { origin: PUBLIC_ORIGIN, body: { displayName: "Updated Person" }, cookie, csrfToken: payload.csrfToken },
    env,
    async (input, init) => {
      profileProxyCalls += 1;
      assert.equal(String(input), "https://thirdrailify-admin.pages.dev/api/auth/profile");
      const headers = new Headers(init.headers);
      assert.equal(headers.get("origin"), PUBLIC_ORIGIN);
      assert.equal(headers.get("x-csrf-token"), payload.csrfToken);
      assert.match(headers.get("cookie"), /^thirdrailify_session=/);
      assert.deepEqual(JSON.parse(new TextDecoder().decode(init.body)), { displayName: "Updated Person" });
      return Response.json({ ...payload, account: { ...payload.account, displayName: "Updated Person" } });
    },
  );
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).account.displayName, "Updated Person");
  assert.equal(profileProxyCalls, 1);

  const noCsrfLogout = await callAuth("logout", { origin: PUBLIC_ORIGIN, body: {}, cookie }, env);
  assert.equal(noCsrfLogout.status, 403);
  assert.equal((await noCsrfLogout.json()).error, "csrf_invalid");

  const logout = await callAuth("logout", { origin: PUBLIC_ORIGIN, body: {}, cookie, csrfToken: payload.csrfToken }, env);
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);

  const revokedSession = await callAuth("session", { method: "GET", origin: PUBLIC_ORIGIN, cookie }, env);
  assert.equal((await revokedSession.json()).authenticated, false);
  const audit = await db.prepare("SELECT event_type, result FROM auth_audit WHERE target_account_id = 'account-1'").first();
  assert.deepEqual(audit, { event_type: "logout", result: "success" });
});

test("Public sign-in and sign-up render server-disabled Google as a non-activatable control", async (t) => {
  const vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  t.after(() => vite.close());
  const { AuthDialog } = await vite.ssrLoadModule("/src/auth/AuthDialog.tsx");
  const config = {
    configured: true,
    emailSignupConfigured: true,
    turnstileSiteKey: "test-site-key",
    oauthProviders: [{ id: "discord", label: "Discord" }],
    oauthProviderStates: [
      { id: "discord", label: "Discord", status: "enabled" },
      { id: "google", label: "Google", status: "disabled", message: "Available after site migration" },
      { id: "github", label: "GitHub", status: "unavailable" },
    ],
    publicOrigin: PUBLIC_ORIGIN,
    adminOrigin: "https://thirdrailify-admin.pages.dev",
    environment: "staging",
    cookieMode: "host-only",
  };

  for (const initialMode of ["signin", "signup"]) {
    const markup = renderToStaticMarkup(createElement(
      StaticRouter,
      { location: initialMode === "signin" ? "/account/login" : "/account" },
      createElement(AuthDialog, {
        initialMode,
        initialError: "",
        resetToken: "",
        config,
        onClose: () => {},
        onSession: async () => {},
      }),
    ));
    const googleButton = buttonContaining(markup, "Continue with Google");
    const discordButton = buttonContaining(markup, "Continue with Discord");
    const passwordInput = markup.match(/<input[^>]*name="password"[^>]*>/)?.[0] || "";
    assert.match(googleButton, /disabled=""/, `${initialMode} Google control uses native disabled semantics`);
    assert.match(googleButton, /auth-provider--disabled/);
    assert.match(googleButton, /Available after site migration/);
    assert.doesNotMatch(googleButton, /href=/, "disabled Google is not a navigation control");
    assert.doesNotMatch(discordButton, /disabled=""/, "Discord remains activatable");
    assert.equal(markup.includes("Continue with GitHub"), false, "unconfigured providers remain hidden");
    if (initialMode === "signin") assert.doesNotMatch(passwordInput, /minlength="12"/i, "sign-in accepts existing credentials without applying the new-password policy");
    else assert.match(passwordInput, /minlength="12"/i, "new passwords retain the 12-character minimum");
  }
});

async function callAuth(path, { method = "POST", origin, body, cookie, csrfToken } = {}, env, authFetch) {
  const headers = new Headers({ Origin: origin, "CF-Connecting-IP": "192.0.2.20" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const request = new Request(`${PUBLIC_ORIGIN}/api/auth/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return authRequest({ request, env, data: authFetch ? { authFetch } : {} });
}

function cookiePair(setCookie) {
  return String(setCookie || "").split(";", 1)[0];
}

function buttonContaining(markup, text) {
  const marker = markup.indexOf(text);
  assert.notEqual(marker, -1, `rendered auth dialog contains ${text}`);
  const start = markup.lastIndexOf("<button", marker);
  const end = markup.indexOf("</button>", marker);
  assert.ok(start >= 0 && end > marker, `${text} is rendered inside a button`);
  return markup.slice(start, end + "</button>".length);
}

async function createContractSchema(db) {
  const statements = [
    `CREATE TABLE accounts (
       id TEXT PRIMARY KEY, email_normalized TEXT UNIQUE, display_name TEXT NOT NULL, avatar_url TEXT,
       role TEXT NOT NULL, admin_level TEXT NOT NULL, status TEXT NOT NULL, email_verified_at TEXT,
       created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login_at TEXT, source TEXT NOT NULL
     )`,
    `CREATE TABLE auth_identities (
       id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider TEXT NOT NULL, provider_subject TEXT NOT NULL,
       provider_username TEXT, created_at TEXT NOT NULL, FOREIGN KEY (account_id) REFERENCES accounts(id)
     )`,
    `CREATE TABLE sessions (
       id TEXT PRIMARY KEY, account_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, csrf_token_hash TEXT NOT NULL,
       created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, revoked_at TEXT,
       source_origin TEXT NOT NULL, user_agent_hash TEXT, FOREIGN KEY (account_id) REFERENCES accounts(id)
     )`,
    `CREATE TABLE auth_handoffs (
       id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, account_id TEXT NOT NULL, target_origin TEXT NOT NULL,
       return_to TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT,
       FOREIGN KEY (account_id) REFERENCES accounts(id)
     )`,
    `CREATE TABLE auth_rate_limits (
       key_hash TEXT NOT NULL, category TEXT NOT NULL, window_started_at TEXT NOT NULL, attempt_count INTEGER NOT NULL,
       blocked_until TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (key_hash, category)
     )`,
    `CREATE TABLE auth_audit (
       id TEXT PRIMARY KEY, actor_account_id TEXT, target_account_id TEXT, event_type TEXT NOT NULL,
       provider TEXT, result TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL
     )`,
  ];
  for (const statement of statements) await db.prepare(statement).run();
}
