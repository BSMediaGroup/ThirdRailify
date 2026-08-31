import { PublicAuthFailure, hmacSha256, jsonResponse, normalizeOrigin, requireCsrf, requirePublicOrigin, resolveSession, timingSafeEqual } from "../../_shared/public-auth.js";

const PREFIX = "/api/polls";
const MAX_BODY_BYTES = 64 * 1024;
const ANON_COOKIE = "thirdrailify_poll_voter";
const ANON_TTL_SECONDS = 60 * 60 * 24 * 365;
const encoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env } = context;
  try {
    const path = new URL(request.url).pathname.slice(PREFIX.length).replace(/^\/+|\/+$/g, "");
    const session = await resolveSession(env, request).catch(() => null);
    if (request.method === "GET" || request.method === "HEAD") return await read(request, env, path, session, context.data?.pollsFetch || fetch);
    if (!new Set(["POST", "PUT", "DELETE"]).has(request.method)) throw failure(405, "method_not_allowed", "This Poll method is not allowed.");
    requirePublicOrigin(request, env);
    return await write(request, env, path, session, context.data?.pollsFetch || fetch);
  } catch (error) { return publicError(error); }
}

async function read(request, env, path, session, fetchImpl) {
  const url = new URL(request.url);
  if (/^media\/[A-Za-z0-9_-]{16,80}$/.test(path)) {
    if (session) return signedRelay(env, fetchImpl, "POST", `/api/polls/internal/${path}`, { accountId: session.accountId }, { rawResponse: true });
    return boundedFetch(fetchImpl, adminUrl(env, `/api/polls/${path}`), { method: request.method, headers: { Accept: "image/*" } });
  }
  if (path === "access" || path === "mine" || path === "discovery") {
    if (!session) throw failure(401, "authentication_required", "Sign in to view creator access.");
    return signedRelay(env, fetchImpl, "POST", `/api/polls/internal/${path}`, { accountId: session.accountId });
  }
  if (!path && url.searchParams.get("view") === "mine") {
    if (!session) throw failure(401, "authentication_required", "Sign in to view your Polls.");
    return signedRelay(env, fetchImpl, "POST", "/api/polls/internal/mine", { accountId: session.accountId, input: { search: url.searchParams.get("search"), page: url.searchParams.get("page"), pageSize: url.searchParams.get("pageSize") } });
  }
  if (path && session) return signedRelay(env, fetchImpl, "POST", `/api/polls/internal/${encodePath(path)}/read`, { accountId: session.accountId });
  const target = `/api/polls${path ? `/${encodePath(path)}` : ""}${url.search}`;
  const response = await boundedFetch(fetchImpl, adminUrl(env, target), { method: request.method, headers: { Accept: "application/json" } });
  return forward(response, response.ok ? response.headers.get("cache-control") || "public, max-age=5" : "no-store");
}

async function write(request, env, path, session, fetchImpl) {
  const mediaPath = path.match(/^([a-z0-9][a-z0-9-]{0,79})\/media\/(banner|option)(?:\/([A-Za-z0-9_-]{8,180}))?$/i);
  if (mediaPath && request.method === "POST" && String(request.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data")) {
    if (!session) throw failure(401, "authentication_required", "Sign in to manage Poll images.");
    await requireCsrf(request, session);
    return relayMediaUpload(request, env, fetchImpl, path, session.accountId);
  }
  const input = await readInput(request);
  if (path.endsWith("/vote")) {
    const slug = path.slice(0, -5).replace(/\/+$/, "");
    if (!slug) throw failure(404, "poll_route_not_found", "The Poll vote route was not found.");
    let actor; let cookie = null;
    if (session) { await requireCsrf(request, session); actor = { namespace: "web_account", key: `account:${session.accountId}`, accountId: session.accountId, label: session.account.displayName }; }
    else { const identity = await anonymousIdentity(request, env); actor = { namespace: "web_anonymous", key: `anonymous:${identity.id}`, label: null }; cookie = identity.cookie; }
    const response = await signedRelay(env, fetchImpl, "POST", `/api/polls/internal/${encodePath(slug)}/vote`, { accountId: session?.accountId || "", actor, input }, { returnResponse: true });
    if (cookie) response.headers.append("Set-Cookie", cookie);
    return response;
  }
  if (!session) throw failure(401, "authentication_required", "Sign in to create or manage a Poll.");
  await requireCsrf(request, session);
  let internal;
  if (!path && request.method === "POST") internal = "create";
  else if (request.method === "PUT" && /^[a-z0-9][a-z0-9-]{0,79}$/i.test(path)) internal = `${path}/save`;
  else if (request.method === "POST" && /^[a-z0-9][a-z0-9-]{0,79}\/lifecycle$/i.test(path)) internal = path;
  else if (request.method === "POST" && /^[a-z0-9][a-z0-9-]{0,79}\/visibility$/i.test(path)) internal = path;
  else if (request.method === "DELETE" && mediaPath) internal = path;
  else throw failure(404, "poll_route_not_found", "The Poll action was not found.");
  return signedRelay(env, fetchImpl, request.method, `/api/polls/internal/${encodePath(internal)}`, { accountId: session.accountId, input });
}

async function signedRelay(env, fetchImpl, method, pathname, payload, options = {}) {
  const body = JSON.stringify(payload); const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || "");
  if (!secret) throw failure(503, "polls_api_not_configured", "The Poll authority is not configured.");
  const timestamp = String(Math.floor(Date.now() / 1000)); const requestId = crypto.randomUUID(); const digest = await digestHex(encoder.encode(body));
  const signature = await hmacSha256(secret, `${method}\n${pathname}\n${timestamp}\n${requestId}\n${digest}`);
  const response = await boundedFetch(fetchImpl, adminUrl(env, pathname), { method, redirect: "manual", headers: { Accept: "application/json", "Content-Type": "application/json", "X-ThirdRailify-Timestamp": timestamp, "X-ThirdRailify-Request-Id": requestId, "X-ThirdRailify-Signature": signature }, body });
  if (options.rawResponse) return response;
  return forward(response, "no-store", options.returnResponse);
}

async function relayMediaUpload(request, env, fetchImpl, path, accountId) {
  const declared = Number(request.headers.get("content-length") || 0); if (Number.isFinite(declared) && declared > 9 * 1024 * 1024) throw failure(413, "request_too_large", "The Poll image request is too large.");
  let data; try { data = await request.formData(); } catch { throw failure(400, "poll_media_form_invalid", "The Poll image upload could not be read."); }
  const file = data.get("image"); if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") throw failure(400, "poll_media_file_required", "Choose a JPG, PNG, or WebP image.");
  const form = new FormData(); form.set("accountId", accountId); form.set("image", file, file.name || "poll-image");
  const prepared = new Request("https://internal.invalid/", { method: "POST", body: form }); const bytes = new Uint8Array(await prepared.arrayBuffer());
  if (bytes.byteLength > 9 * 1024 * 1024) throw failure(413, "request_too_large", "The Poll image request is too large.");
  const pathname = `/api/polls/internal/${encodePath(path)}`; const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || ""); if (!secret) throw failure(503, "polls_api_not_configured", "The Poll authority is not configured.");
  const timestamp = String(Math.floor(Date.now() / 1000)); const requestId = crypto.randomUUID(); const digest = await digestHex(bytes); const signature = await hmacSha256(secret, `POST\n${pathname}\n${timestamp}\n${requestId}\n${digest}`);
  const response = await boundedFetch(fetchImpl, adminUrl(env, pathname), { method: "POST", redirect: "manual", headers: { Accept: "application/json", "Content-Type": prepared.headers.get("content-type"), "X-ThirdRailify-Timestamp": timestamp, "X-ThirdRailify-Request-Id": requestId, "X-ThirdRailify-Signature": signature }, body: bytes });
  return forward(response, "no-store");
}

async function anonymousIdentity(request, env) {
  const secret = String(env?.THIRDRAILIFY_POLL_ANONYMOUS_SECRET || "");
  if (!secret) throw failure(503, "anonymous_voting_not_configured", "Anonymous Poll voting is not configured.");
  const value = parseCookies(request)[ANON_COOKIE] || ""; const [id, signature] = value.split(".");
  if (/^[a-f0-9-]{36}$/.test(id || "") && signature && timingSafeEqual(signature, await hmacSha256(secret, `poll-anonymous-v1:${id}`))) return { id, cookie: null };
  const next = crypto.randomUUID(); const nextSignature = await hmacSha256(secret, `poll-anonymous-v1:${next}`);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { id: next, cookie: `${ANON_COOKIE}=${encodeURIComponent(`${next}.${nextSignature}`)}; Path=/api/polls; HttpOnly; SameSite=Lax; Max-Age=${ANON_TTL_SECONDS}${secure}` };
}

async function readInput(request) {
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw failure(415, "content_type_invalid", "A JSON Poll request is required.");
  const declared = Number(request.headers.get("content-length") || 0); if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw failure(413, "request_too_large", "The Poll request is too large.");
  const raw = await request.text(); if (encoder.encode(raw).byteLength > MAX_BODY_BYTES) throw failure(413, "request_too_large", "The Poll request is too large.");
  try { const value = JSON.parse(raw || "{}"); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid"); return value; } catch { throw failure(400, "invalid_json", "The Poll request is invalid."); }
}

function adminUrl(env, pathname) { const origin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN); if (!origin) throw failure(503, "polls_api_not_configured", "The Poll authority is not configured."); return `${origin}${pathname}`; }
async function boundedFetch(fetchImpl, input, init) { const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12_000); try { return await fetchImpl(input, { ...init, signal: controller.signal }); } catch { throw failure(503, "polls_unavailable", "The Poll authority is temporarily unavailable."); } finally { clearTimeout(timeout); } }
async function forward(response, cacheControl, returnResponse = false) { const payload = await response.json().catch(() => null); const result = jsonResponse(payload || { ok: false, error: "polls_invalid_response", message: "The Poll authority returned an invalid response." }, { status: payload ? response.status : 502, headers: { "Cache-Control": cacheControl, ETag: response.headers.get("etag") || "" } }); return returnResponse ? result : result; }
function parseCookies(request) { return Object.fromEntries(String(request.headers.get("cookie") || "").split(";").map((part) => { const index = part.indexOf("="); if (index < 1) return ["", ""]; try { return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]; } catch { return ["", ""]; } }).filter(([key]) => key)); }
function encodePath(path) { return String(path).split("/").map(encodeURIComponent).join("/"); }
function publicError(error) { const known = error instanceof PublicAuthFailure || error?.name === "PublicAuthFailure"; return jsonResponse({ ok: false, error: known ? error.code : "polls_unavailable", message: known ? error.message : "The Poll service is temporarily unavailable." }, { status: known ? Number(error.status || 500) : 500, headers: { "Cache-Control": "no-store" } }); }
function failure(status, code, message) { return new PublicAuthFailure(status, code, message); }
async function digestHex(bytes) { const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export { anonymousIdentity, read, signedRelay, write };
