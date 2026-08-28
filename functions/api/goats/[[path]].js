import {
  PublicAuthFailure,
  hmacSha256,
  jsonResponse,
  normalizeOrigin,
  requireCsrf,
  resolveSession,
} from "../../_shared/public-auth.js";

const ROUTE_PREFIX = "/api/goats";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const encoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env } = context;
  try {
    const path = new URL(request.url).pathname.slice(ROUTE_PREFIX.length).replace(/^\/+|\/+$/g, "");
    if (request.method === "GET" || request.method === "HEAD") return await proxyRead(request, env, path, context.data?.goatsFetch || fetch);
    if (request.method === "POST" || request.method === "DELETE") return await proxyWrite(request, env, path, context.data?.goatsFetch || fetch);
    throw failure(405, "method_not_allowed", "This method is not allowed.");
  } catch (error) {
    return publicError(error);
  }
}

async function proxyRead(request, env, path, fetchImpl) {
  if (!isReadPath(path)) throw failure(404, "not_found", "The GOATS route was not found.");
  const target = adminUrl(env, `/api/goats/${path}${new URL(request.url).search}`);
  const headers = new Headers({ Accept: request.headers.get("accept") || "application/json" });
  if (path.startsWith("listings/")) {
    const session = await resolveSession(env, request).catch(() => null);
    if (session?.accountId) headers.set("x-thirdrailify-account-id", session.accountId);
  }
  const response = await boundedFetch(fetchImpl, target, { method: request.method, headers }, 8_000);
  if (request.method === "GET" && path === "config" && response.ok) {
    const payload = await response.json();
    return jsonResponse({ ...payload, turnstileSiteKey: clean(env?.THIRDRAILIFY_TURNSTILE_SITE_KEY, 160) || null }, { status: response.status, headers: forwardedHeaders(response, false) });
  }
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers: forwardedHeaders(response, path.startsWith("media/")) });
}

async function proxyWrite(request, env, path, fetchImpl) {
  requirePublicOrigin(request, env);
  const interaction = /^listings\/[^/]+\/(?:reaction|comments)$/.test(path) || /^comments\/[^/]+$/.test(path);
  const session = interaction ? await resolveSession(env, request) : await resolveSession(env, request).catch(() => null);
  if (interaction) {
    if (!session) throw failure(401, "authentication_required", "Sign in to continue.");
    await requireCsrf(request, session);
  }
  const rateKey = await privacyRateKey(env, request, session?.accountId || "guest");
  if (path === "drafts/media") return proxyUpload(request, env, fetchImpl, rateKey);
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw failure(415, "content_type_invalid", "JSON is required.");
  const raw = await request.text();
  if (raw.length > 64 * 1024) throw failure(413, "request_too_large", "The request is too large.");
  let input;
  try { input = JSON.parse(raw || "{}"); } catch { throw failure(400, "invalid_json", "The request body is invalid."); }
  const body = JSON.stringify({
    ...input,
    accountId: session?.accountId || null,
    displayName: session?.account?.displayName || null,
    avatarUrl: session?.account?.avatarUrl || null,
    rateKey,
    clientIp: clean(request.headers.get("CF-Connecting-IP"), 80) || null,
  });
  const internalPath = internalPathFor(path);
  const target = adminUrl(env, `/api/goats/${internalPath}`);
  const headers = await signedHeaders(env, request.method, `/api/goats/${internalPath}`, encoder.encode(body), { "Content-Type": "application/json", Accept: "application/json" });
  const response = await boundedFetch(fetchImpl, target, { method: request.method, headers, body }, 12_000);
  return sanitizeUpstreamJson(response);
}

async function proxyUpload(request, env, fetchImpl, rateKey) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw failure(413, "image_too_large", "Choose an image no larger than 10 MB.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw failure(413, "image_too_large", "Choose an image no larger than 10 MB.");
  const internalPath = "internal/drafts/media";
  const headers = await signedHeaders(env, "POST", `/api/goats/${internalPath}`, bytes, {
    "Content-Type": clean(request.headers.get("content-type"), 100),
    Accept: "application/json",
    "X-Goats-Draft-Token": clean(request.headers.get("x-goats-draft-token"), 180),
    "X-Goats-Media-Role": clean(request.headers.get("x-goats-media-role"), 20),
    "X-Goats-Media-Order": clean(request.headers.get("x-goats-media-order"), 4),
    "X-Goats-Rate-Key": rateKey,
  });
  const response = await boundedFetch(fetchImpl, adminUrl(env, `/api/goats/${internalPath}`), { method: "POST", headers, body: bytes }, 20_000);
  return sanitizeUpstreamJson(response);
}

function internalPathFor(path) {
  if (path === "drafts") return "internal/drafts";
  if (path === "drafts/finalise") return "internal/drafts/finalise";
  if (/^listings\/[^/]+\/(?:reaction|comments)$/.test(path)) return `internal/${path}`;
  if (/^comments\/[^/]+$/.test(path)) return `internal/${path}`;
  throw failure(404, "not_found", "The GOATS action was not found.");
}

function isReadPath(path) {
  return !path || new Set(["config", "products", "locations", "listings", "map"]).has(path) || /^media\/[a-f0-9-]{36}$/.test(path) || /^listings\/[a-z0-9][a-z0-9-]{1,118}[a-z0-9](?:\/comments)?$/.test(path);
}

async function signedHeaders(env, method, pathname, bytes, extra) {
  const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || "");
  if (!secret) throw failure(503, "community_api_not_configured", "GOATS submissions and interactions are not configured.");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = await digestHex(bytes);
  const signature = await hmacSha256(secret, `${timestamp}\n${method}\n${pathname}\n${digest}`);
  return new Headers({ ...extra, "X-ThirdRailify-Timestamp": timestamp, "X-ThirdRailify-Signature": signature });
}

async function privacyRateKey(env, request, identity) {
  const secret = String(env?.THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET || "");
  if (!secret) throw failure(503, "rate_limit_not_configured", "Submission protection is not configured.");
  const ip = clean(request.headers.get("CF-Connecting-IP"), 80) || "unknown";
  return hmacSha256(secret, `goats\n${ip}\n${clean(identity, 160)}`);
}

function requirePublicOrigin(request, env) {
  const origin = normalizeOrigin(request.headers.get("origin"));
  const expected = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  const host = new URL(request.url).hostname;
  const local = new Set(["localhost", "127.0.0.1"]).has(host) && origin && new Set(["localhost", "127.0.0.1"]).has(new URL(origin).hostname);
  if (!origin || (!local && origin !== expected)) throw failure(403, "origin_not_allowed", "This request origin is not allowed.");
}

function adminUrl(env, pathname) {
  const origin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
  if (!origin || (!origin.startsWith("https://") && !origin.startsWith("http://127.0.0.1") && !origin.startsWith("http://localhost"))) throw failure(503, "community_api_not_configured", "The GOATS service is not configured.");
  return `${origin}${pathname}`;
}

async function boundedFetch(fetchImpl, input, init, timeoutMs) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetchImpl(input, { ...init, signal: controller.signal }); }
  catch { throw failure(503, "community_unavailable", "The GOATS service is temporarily unavailable."); }
  finally { clearTimeout(timeout); }
}

async function sanitizeUpstreamJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const allowed = new Set(["submission_invalid", "email_invalid", "rating_invalid", "consent_required", "product_invalid", "main_image_required", "city_invalid", "country_invalid", "location_unresolved", "location_unavailable", "draft_expired", "draft_finalised", "image_too_large", "image_format_invalid", "gallery_limit", "authentication_required", "reaction_invalid", "comment_invalid", "comments_disabled", "reactions_disabled", "too_many_requests", "submissions_unavailable", "community_media_not_configured"]);
    const code = allowed.has(payload?.error) ? payload.error : "community_unavailable";
    const message = allowed.has(payload?.error) && typeof payload?.message === "string" ? payload.message.slice(0, 300) : "The GOATS service is temporarily unavailable.";
    return jsonResponse({ ok: false, error: code, message }, { status: response.status >= 400 && response.status < 600 ? response.status : 503, headers: { "Cache-Control": "no-store" } });
  }
  return jsonResponse(payload, { status: response.status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function forwardedHeaders(response, media) {
  const headers = new Headers({ "Cache-Control": response.headers.get("cache-control") || (media ? "public, max-age=31536000, immutable" : "no-store"), "X-Content-Type-Options": "nosniff" });
  for (const name of media ? ["content-type", "content-length", "etag", "content-security-policy", "cross-origin-resource-policy"] : ["content-type", "etag"]) { const value = response.headers.get(name); if (value) headers.set(name, value); }
  return headers;
}

function publicError(error) {
  const status = Number(error?.status || 500); const known = error instanceof PublicAuthFailure || error?.name === "PublicAuthFailure";
  return jsonResponse({ ok: false, error: known ? error.code : "community_unavailable", message: known ? error.message : "The GOATS service is temporarily unavailable." }, { status: known ? status : 500, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function failure(status, code, message) { return new PublicAuthFailure(status, code, message); }
function clean(value, max) { return Array.from(String(value || "")).filter((character) => { const code = character.charCodeAt(0); return code >= 32 && code !== 127; }).join("").trim().slice(0, max); }
async function digestHex(bytes) { const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export { boundedFetch, internalPathFor, isReadPath, proxyRead, proxyWrite };
