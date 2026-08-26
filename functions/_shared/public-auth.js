const encoder = new TextEncoder();

export const AUTH_COOKIE_NAME = "thirdrailify_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
const MAX_BODY_BYTES = 8 * 1024;

export class PublicAuthFailure extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.name = "PublicAuthFailure";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" && !(url.protocol === "http:" && new Set(["localhost", "127.0.0.1"]).has(url.hostname))) return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function requirePublicOrigin(request, env) {
  const origin = normalizeOrigin(request.headers.get("origin"));
  const expected = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  if (!origin || origin !== expected) throw new PublicAuthFailure(403, "origin_not_allowed", "This request origin is not allowed.");
  return origin;
}

export function corsHeaders(request, env) {
  const origin = normalizeOrigin(request.headers.get("origin"));
  const expected = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  if (!origin || origin !== expected) return {};
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" };
}

export function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...(init.headers || {}),
    },
  });
}

export function errorResponse(error, request, env) {
  if (error instanceof PublicAuthFailure) {
    return jsonResponse(
      { ok: false, error: error.code, message: error.message },
      { status: error.status, headers: { ...corsHeaders(request, env), ...error.headers } },
    );
  }
  return jsonResponse(
    { ok: false, error: "auth_unavailable", message: "The account service is temporarily unavailable." },
    { status: 500, headers: corsHeaders(request, env) },
  );
}

export function requireDb(env) {
  const db = env?.THIRDRAILIFY_AUTH_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new PublicAuthFailure(503, "auth_database_not_configured", "Account storage is not configured.");
  }
  return db;
}

export async function readJsonBody(request) {
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    throw new PublicAuthFailure(415, "content_type_required", "A JSON request body is required.");
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new PublicAuthFailure(413, "request_too_large", "The request body is too large.");
  const text = await request.text();
  if (encoder.encode(text).length > MAX_BODY_BYTES) throw new PublicAuthFailure(413, "request_too_large", "The request body is too large.");
  try {
    const body = JSON.parse(text || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
    return body;
  } catch {
    throw new PublicAuthFailure(400, "invalid_json", "The request body is not valid JSON.");
  }
}

export async function sha256(value) {
  return base64UrlEncode(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(String(value)))));
}

export async function hmacSha256(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64UrlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(String(value)))));
}

export function timingSafeEqual(left, right) {
  const leftBytes = encoder.encode(String(left || ""));
  const rightBytes = encoder.encode(String(right || ""));
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) mismatch |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  return mismatch === 0;
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function parseCookies(request) {
  const cookies = {};
  for (const segment of String(request.headers.get("cookie") || "").split(";")) {
    const index = segment.indexOf("=");
    if (index < 1) continue;
    const key = segment.slice(0, index).trim();
    try {
      cookies[key] = decodeURIComponent(segment.slice(index + 1).trim());
    } catch {
      cookies[key] = "";
    }
  }
  return cookies;
}

export function sessionCookie(request, env, token, maxAge = SESSION_TTL_SECONDS) {
  const url = new URL(request.url);
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token || "")}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];
  if (url.protocol === "https:") parts.push("Secure");
  if (
    String(env?.THIRDRAILIFY_AUTH_COOKIE_DOMAIN || "").trim().toLowerCase() === ".thirdrailify.com" &&
    (url.hostname === "thirdrailify.com" || url.hostname.endsWith(".thirdrailify.com"))
  ) {
    parts.push("Domain=.thirdrailify.com");
  }
  return parts.join("; ");
}

export function clearSessionCookie(request, env) {
  return sessionCookie(request, env, "", 0);
}

function cleanText(value, maxLength = 160) {
  const printable = Array.from(String(value || ""), (character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint <= 31 || codePoint === 127 ? " " : character;
  }).join("");
  return printable.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeAvatarUrl(value, env = null) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    const hosts = new Set(["cdn.discordapp.com", "media.discordapp.net", "lh3.googleusercontent.com", "avatars.githubusercontent.com", "pbs.twimg.com"]);
    const origins = new Set([env?.THIRDRAILIFY_ADMIN_ORIGIN, env?.THIRDRAILIFY_PROFILE_MEDIA_ORIGIN].map(normalizeOrigin).filter(Boolean));
    return url.protocol === "https:" && (hosts.has(url.hostname) || origins.has(url.origin)) ? url.toString().slice(0, 1024) : null;
  } catch {
    return null;
  }
}

function safeReturnPath(value) {
  const path = String(value || "");
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/api/") || /[\r\n]/.test(path)) return "/account";
  return path.slice(0, 1024);
}

async function serializeAccount(env, row) {
  const identities = await requireDb(env)
    .prepare("SELECT provider, provider_username FROM auth_identities WHERE account_id = ? ORDER BY created_at ASC")
    .bind(row.id)
    .all();
  const providerRows = identities?.results || [];
  const locked = row.source === "env_master";
  return {
    id: row.id,
    email: row.email_normalized || null,
    displayName: row.display_name,
    username: providerRows.find((identity) => identity.provider_username)?.provider_username || null,
    avatarUrl: safeAvatarUrl(row.avatar_url, env),
    providers: providerRows.map((identity) => identity.provider),
    role: locked ? "admin" : row.role,
    adminLevel: locked ? "master" : row.admin_level,
    status: locked ? "active" : row.status,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || null,
    source: locked ? "Environment Master" : cleanText(row.source, 80),
  };
}

function accessFor(account) {
  return {
    isAdmin: Boolean(account && account.role === "admin" && account.status === "active"),
    isMasterAdmin: Boolean(account && account.adminLevel === "master" && account.status === "active"),
  };
}

export async function resolveSession(env, request) {
  const token = parseCookies(request)[AUTH_COOKIE_NAME];
  if (!token) return null;
  const secret = String(env?.THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET || "");
  if (!secret) throw new PublicAuthFailure(503, "session_protection_not_configured", "Session protection is not configured.");
  const row = await requireDb(env)
    .prepare(
      `SELECT sessions.id AS session_id, sessions.account_id, sessions.csrf_token_hash,
              sessions.expires_at, sessions.last_seen_at, sessions.revoked_at, accounts.*
       FROM sessions JOIN accounts ON accounts.id = sessions.account_id
       WHERE sessions.token_hash = ? LIMIT 1`,
    )
    .bind(await sha256(token))
    .first();
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now() || row.status !== "active") return null;
  const csrfToken = await hmacSha256(secret, `csrf:${token}`);
  if (!timingSafeEqual(await sha256(csrfToken), row.csrf_token_hash)) return null;
  if (Date.now() - Date.parse(row.last_seen_at) >= 15 * 60 * 1000) {
    await requireDb(env).prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").bind(new Date().toISOString(), row.session_id).run();
  }
  return { id: row.session_id, accountId: row.account_id, token, csrfToken, csrfTokenHash: row.csrf_token_hash, account: await serializeAccount(env, row) };
}

export async function sessionEnvelope(session) {
  if (!session) return { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } };
  return { ok: true, authenticated: true, account: session.account, access: accessFor(session.account), csrfToken: session.csrfToken };
}

export async function requireCsrf(request, session) {
  const token = String(request.headers.get("x-csrf-token") || "");
  if (!token || !timingSafeEqual(await sha256(token), session.csrfTokenHash)) {
    throw new PublicAuthFailure(403, "csrf_invalid", "The request could not be verified.");
  }
}

export async function enforceHandoffRateLimit(env, request, identifier) {
  const secret = String(env?.THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET || "");
  if (!secret) throw new PublicAuthFailure(503, "rate_limit_not_configured", "Account protection is not configured.");
  const ip = cleanText(request.headers.get("CF-Connecting-IP") || "unknown", 80);
  const keyHash = await hmacSha256(secret, `handoff\n${ip}\n${cleanText(identifier, 24)}`);
  const db = requireDb(env);
  const row = await db.prepare("SELECT * FROM auth_rate_limits WHERE key_hash = ? AND category = 'handoff' LIMIT 1").bind(keyHash).first();
  const now = Date.now();
  if (row?.blocked_until && Date.parse(row.blocked_until) > now) {
    throw new PublicAuthFailure(429, "too_many_attempts", "Too many attempts. Try again later.", { "Retry-After": "900" });
  }
  const expired = !row || now - Date.parse(row.window_started_at) >= 15 * 60 * 1000;
  const attempts = expired ? 1 : Number(row.attempt_count || 0) + 1;
  const blockedUntil = attempts > 10 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
  const timestamp = new Date(now).toISOString();
  await db
    .prepare(
      `INSERT INTO auth_rate_limits (key_hash, category, window_started_at, attempt_count, blocked_until, updated_at)
       VALUES (?, 'handoff', ?, ?, ?, ?)
       ON CONFLICT(key_hash, category) DO UPDATE SET
         window_started_at = excluded.window_started_at, attempt_count = excluded.attempt_count,
         blocked_until = excluded.blocked_until, updated_at = excluded.updated_at`,
    )
    .bind(keyHash, expired ? timestamp : row.window_started_at, attempts, blockedUntil, timestamp)
    .run();
  if (blockedUntil) throw new PublicAuthFailure(429, "too_many_attempts", "Too many attempts. Try again later.", { "Retry-After": "900" });
}

export async function consumeHandoff(env, request, code, origin) {
  const db = requireDb(env);
  const codeHash = await sha256(String(code || ""));
  const row = await db
    .prepare(
      `SELECT
         auth_handoffs.id AS handoff_id, auth_handoffs.account_id, auth_handoffs.target_origin,
         auth_handoffs.return_to, auth_handoffs.expires_at, auth_handoffs.consumed_at,
         accounts.*
       FROM auth_handoffs JOIN accounts ON accounts.id = auth_handoffs.account_id
       WHERE auth_handoffs.code_hash = ? LIMIT 1`,
    )
    .bind(codeHash)
    .first();
  const timestamp = new Date().toISOString();
  if (!row || row.consumed_at || Date.parse(row.expires_at) <= Date.now() || row.target_origin !== origin || row.status !== "active") {
    throw new PublicAuthFailure(400, "handoff_invalid", "The login handoff is invalid or expired.");
  }
  const consumed = await db
    .prepare("UPDATE auth_handoffs SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?")
    .bind(timestamp, row.handoff_id, timestamp)
    .run();
  if (Number(consumed?.meta?.changes || 0) !== 1) throw new PublicAuthFailure(400, "handoff_invalid", "The login handoff is invalid or expired.");
  return { ...(await createSession(env, request, row, origin)), returnTo: safeReturnPath(row.return_to) };
}

async function createSession(env, request, accountRow, origin) {
  const secret = String(env?.THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET || "");
  if (!secret) throw new PublicAuthFailure(503, "session_protection_not_configured", "Session protection is not configured.");
  const db = requireDb(env);
  const token = randomToken(32);
  const csrfToken = await hmacSha256(secret, `csrf:${token}`);
  const timestamp = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const userAgent = cleanText(request.headers.get("user-agent"), 512);
  const sessionId = crypto.randomUUID();
  await db.batch([
    db
      .prepare(
        `INSERT INTO sessions (
           id, account_id, token_hash, csrf_token_hash, created_at, expires_at,
           last_seen_at, revoked_at, source_origin, user_agent_hash
         ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .bind(
        sessionId,
        accountRow.account_id,
        await sha256(token),
        await sha256(csrfToken),
        timestamp,
        expiresAt,
        timestamp,
        origin,
        userAgent ? await sha256(userAgent) : null,
      ),
    db.prepare("UPDATE accounts SET last_login_at = ?, updated_at = ? WHERE id = ?").bind(timestamp, timestamp, accountRow.account_id),
  ]);
  const account = await serializeAccount(env, { ...accountRow, id: accountRow.account_id, last_login_at: timestamp });
  return {
    cookie: sessionCookie(request, env, token),
    session: { id: sessionId, accountId: accountRow.account_id, csrfToken, csrfTokenHash: await sha256(csrfToken), account },
  };
}

export async function revokeSession(env, session) {
  const timestamp = new Date().toISOString();
  const db = requireDb(env);
  await db.batch([
    db.prepare("UPDATE sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?").bind(timestamp, session.id),
    db
      .prepare(
        `INSERT INTO auth_audit (
           id, actor_account_id, target_account_id, event_type, provider, result, metadata_json, created_at
         ) VALUES (?, ?, ?, 'logout', NULL, 'success', NULL, ?)`,
      )
      .bind(crypto.randomUUID(), session.accountId, session.accountId, timestamp),
  ]);
}
