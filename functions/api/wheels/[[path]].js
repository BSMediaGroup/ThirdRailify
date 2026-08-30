import {
  PublicAuthFailure,
  hmacSha256,
  jsonResponse,
  normalizeOrigin,
  requireCsrf,
  resolveSession,
} from "../../_shared/public-auth.js";

const PREFIX = "/api/wheels";
const MAX_BODY_BYTES = 384 * 1024;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env } = context;
  try {
    const path = new URL(request.url).pathname.slice(PREFIX.length).replace(/^\/+|\/+$/g, "");
    if (request.method === "GET" || request.method === "HEAD") return await proxyRead(request, env, path, context.data?.wheelsFetch || fetch);
    if (!new Set(["POST", "PUT", "DELETE"]).has(request.method)) throw failure(405, "method_not_allowed", "This wheel method is not allowed.");
    return await proxyWrite(request, env, path, context.data?.wheelsFetch || fetch);
  } catch (error) {
    return publicError(error);
  }
}

async function proxyRead(request, env, path, fetchImpl) {
  const session = await resolveSession(env, request).catch(() => null);
  const requestUrl = new URL(request.url);
  if (/^media\/[a-f0-9-]{16,80}$/i.test(path)) {
    const pathname = `/api/wheels/${path}`; const headers = new Headers({ Accept: request.headers.get("accept") || "image/*" });
    if (session?.accountId) { const signed = await signedHeaders(env, request.method, pathname, new Uint8Array(), { "X-ThirdRailify-Account-Id": session.accountId }); for (const [name, value] of signed) headers.set(name, value); }
    const response = await boundedFetch(fetchImpl, adminUrl(env, pathname), { method: request.method, headers }, 12_000);
    return forwardMedia(response, request.method === "HEAD");
  }
  if (path === "access" || path.endsWith("/access")) {
    if (!session) throw failure(401, "authentication_required", "Sign in to view wheel access.");
    const internal = path === "access" ? "access" : `${path.slice(0, -"/access".length)}/access`;
    return signedProxy(env, fetchImpl, "POST", `/api/wheels/internal/${internal}`, { accountId: session.accountId });
  }
  if (path === "stages/lookup") {
    if (!session) throw failure(401, "authentication_required", "Sign in to choose Stage wheels.");
    const url = new URL(request.url);
    return signedProxy(env, fetchImpl, "POST", "/api/wheels/internal/stages/lookup", { accountId: session.accountId, input: { search: url.searchParams.get("search"), scope: url.searchParams.get("scope") } });
  }
  if (path === "stages" && requestUrl.searchParams.get("view") === "public") {
    const targetPath = `/api/wheels/stages${requestUrl.search}`;
    const response = await boundedFetch(fetchImpl, adminUrl(env, targetPath), { method: "GET", headers: { Accept: "application/json" } }, 8_000);
    return forwardJson(response, response.ok ? response.headers.get("cache-control") || "public, max-age=30" : "no-store");
  }
  if (path && session) return signedProxy(env, fetchImpl, "POST", `/api/wheels/internal/${path}/read`, { accountId: session.accountId });
  const targetPath = `/api/wheels${path ? `/${encodePath(path)}` : ""}${new URL(request.url).search}`;
  const response = await boundedFetch(fetchImpl, adminUrl(env, targetPath), { method: "GET", headers: { Accept: "application/json" } }, 8_000);
  return forwardJson(response, response.ok ? response.headers.get("cache-control") || "public, max-age=30" : "no-store");
}

async function proxyWrite(request, env, path, fetchImpl) {
  requirePublicRequestOrigin(request, env);
  const session = await resolveSession(env, request);
  if (!session) throw failure(401, "authentication_required", "Sign in to manage or officially spin a wheel.");
  await requireCsrf(request, session);
  const media = path.match(/^([a-z0-9][a-z0-9-]{1,78}[a-z0-9])\/media\/(background|centre|segment-fill)$/i);
  if (media && request.method === "POST") return proxyMediaUpload(request, env, fetchImpl, path, session.accountId);
  const raw = await readBody(request);
  let input;
  try { input = JSON.parse(raw || "{}"); } catch { throw failure(400, "invalid_json", "The wheel request is invalid."); }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw failure(400, "invalid_json", "The wheel request is invalid.");
  let internal;
  if (!path && request.method === "POST") internal = "create";
  else if (path === "stages" && request.method === "POST") internal = "stages/create";
  else if (request.method === "PUT" && /^stages\/[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/i.test(path)) internal = `${path}/save`;
  else if (request.method === "POST" && /^stages\/[a-z0-9][a-z0-9-]{1,78}[a-z0-9]\/lifecycle$/i.test(path)) internal = path;
  else if (request.method === "PUT" && /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/i.test(path)) internal = `${path}/save`;
  else if (/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]\/spins$/i.test(path)) internal = path;
  else if (/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]\/(?:winner-action|lifecycle)$/i.test(path)) internal = path;
  else if (request.method === "DELETE" && media) internal = path;
  else throw failure(404, "wheel_route_not_found", "The wheel action was not found.");
  return signedProxy(env, fetchImpl, request.method, `/api/wheels/internal/${internal}`, { accountId: session.accountId, input });
}

async function proxyMediaUpload(request, env, fetchImpl, path, accountId) {
  const declared = Number(request.headers.get("content-length") || 0); if (Number.isFinite(declared) && declared > MAX_MEDIA_BYTES) throw failure(413, "wheel_media_too_large", "Choose an image no larger than 8 MB.");
  const bytes = new Uint8Array(await request.arrayBuffer()); if (!bytes.byteLength) throw failure(400, "wheel_media_empty", "Choose a non-empty image."); if (bytes.byteLength > MAX_MEDIA_BYTES) throw failure(413, "wheel_media_too_large", "Choose an image no larger than 8 MB.");
  const pathname = `/api/wheels/internal/${path}`; const headers = await signedHeaders(env, "POST", pathname, bytes, { Accept: "application/json", "Content-Type": String(request.headers.get("content-type") || "application/octet-stream").slice(0, 100), "X-ThirdRailify-Account-Id": accountId, "X-ThirdRailify-Filename": String(request.headers.get("x-thirdrailify-filename") || "").slice(0, 180) });
  const response = await boundedFetch(fetchImpl, adminUrl(env, pathname), { method: "POST", headers, body: bytes }, 25_000);
  return forwardJson(response, "no-store");
}

async function signedProxy(env, fetchImpl, method, pathname, payload) {
  const body = JSON.stringify(payload);
  const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || "");
  if (!secret) throw failure(503, "wheels_api_not_configured", "The wheel authority is not configured.");
  const timestamp = String(Math.floor(Date.now() / 1000)); const digest = await digestHex(encoder.encode(body));
  const signature = await hmacSha256(secret, `${timestamp}\n${method}\n${pathname}\n${digest}`);
  const response = await boundedFetch(fetchImpl, adminUrl(env, pathname), { method, headers: { Accept: "application/json", "Content-Type": "application/json", "X-ThirdRailify-Timestamp": timestamp, "X-ThirdRailify-Signature": signature }, body }, 12_000);
  return forwardJson(response, "no-store");
}

async function signedHeaders(env, method, pathname, bytes, extra = {}) {
  const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || ""); if (!secret) throw failure(503, "wheels_api_not_configured", "The wheel authority is not configured.");
  const timestamp = String(Math.floor(Date.now() / 1000)); const digest = await digestHex(bytes); const signature = await hmacSha256(secret, `${timestamp}\n${method}\n${pathname}\n${digest}`);
  return new Headers({ ...extra, "X-ThirdRailify-Timestamp": timestamp, "X-ThirdRailify-Signature": signature });
}

async function readBody(request) {
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw failure(415, "content_type_invalid", "A JSON wheel request is required.");
  const declared = Number(request.headers.get("content-length") || 0); if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw failure(413, "request_too_large", "The wheel request is too large.");
  const raw = await request.text(); if (encoder.encode(raw).byteLength > MAX_BODY_BYTES) throw failure(413, "request_too_large", "The wheel request is too large."); return raw;
}

function requirePublicRequestOrigin(request, env) {
  const origin = normalizeOrigin(request.headers.get("origin")); const expected = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN); const host = new URL(request.url).hostname;
  const local = new Set(["localhost", "127.0.0.1"]).has(host) && origin && new Set(["localhost", "127.0.0.1"]).has(new URL(origin).hostname);
  if (!origin || (!local && origin !== expected)) throw failure(403, "origin_not_allowed", "This request origin is not allowed.");
}
function adminUrl(env, pathname) { const origin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN); if (!origin) throw failure(503, "wheels_api_not_configured", "The wheel authority is not configured."); return `${origin}${pathname}`; }
function encodePath(path) { return String(path).split("/").map((segment) => encodeURIComponent(segment)).join("/"); }
async function boundedFetch(fetchImpl, input, init, timeoutMs) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs); try { return await fetchImpl(input, { ...init, signal: controller.signal }); } catch { throw failure(503, "wheels_unavailable", "The wheel authority is temporarily unavailable."); } finally { clearTimeout(timeout); } }
async function forwardJson(response, cacheControl) { const payload = await response.json().catch(() => null); if (!payload) return jsonResponse({ ok: false, error: "wheels_unavailable", message: "The wheel authority returned an invalid response." }, { status: 502 }); return jsonResponse(payload, { status: response.status, headers: { "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" } }); }
function forwardMedia(response, head) { const headers = new Headers({ "Cache-Control": response.headers.get("cache-control") || "no-store", "X-Content-Type-Options": "nosniff" }); for (const name of ["content-type", "content-length", "etag", "content-security-policy", "cross-origin-resource-policy"]) { const value = response.headers.get(name); if (value) headers.set(name, value); } return new Response(head ? null : response.body, { status: response.status, headers }); }
function publicError(error) { const known = error instanceof PublicAuthFailure || error?.name === "PublicAuthFailure"; return jsonResponse({ ok: false, error: known ? error.code : "wheels_unavailable", message: known ? error.message : "The wheel service is temporarily unavailable." }, { status: known ? Number(error.status || 500) : 500, headers: { "Cache-Control": "no-store" } }); }
function failure(status, code, message) { return new PublicAuthFailure(status, code, message); }
async function digestHex(bytes) { const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export { proxyMediaUpload, proxyRead, proxyWrite };
