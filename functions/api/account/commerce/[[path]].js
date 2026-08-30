import {
  PublicAuthFailure,
  hmacSha256,
  jsonResponse,
  normalizeOrigin,
  requireCsrf,
  requirePublicOrigin,
  resolveSession,
} from "../../../_shared/public-auth.js";

const PREFIX = "/api/account/commerce";
const MAX_BODY_BYTES = 16 * 1024;
const encoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env } = context;
  try {
    const path = new URL(request.url).pathname.slice(PREFIX.length).replace(/^\/+|\/+$/g, "");
    const session = await resolveSession(env, request);
    if (!session) throw failure(401, "authentication_required", "Sign in to view your account commerce details.");
    const mutation = request.method !== "GET";
    if (mutation) {
      requirePublicOrigin(request, env);
      await requireCsrf(request, session);
    } else if (request.method !== "GET") {
      throw failure(405, "method_not_allowed", "This account-commerce method is not allowed.");
    }
    const route = routeFor(request.method, path);
    const input = mutation ? await readInput(request) : Object.fromEntries(new URL(request.url).searchParams);
    const payload = await signedRelay(env, context.data?.accountCommerceFetch || fetch, route, { accountId: session.accountId, input });
    assertSafePayload(payload);
    return jsonResponse(payload, { status: 200, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const known = error instanceof PublicAuthFailure || error?.name === "PublicAuthFailure";
    return jsonResponse(
      { ok: false, error: known ? error.code : "account_commerce_unavailable", message: known ? error.message : "Account commerce is temporarily unavailable." },
      { status: known ? Number(error.status || 500) : 500, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  }
}

function routeFor(method, path) {
  if (method === "GET" && (!path || path === "overview" || path === "addresses")) return "overview";
  if (method === "PATCH" && path === "contact") return "contact";
  if (method === "POST" && path === "addresses") return "addresses/create";
  if (method === "GET" && path === "orders") return "orders";
  if (method === "GET" && path === "inbox") return "inbox";
  if (method === "POST" && path === "inbox/bulk") return "inbox/mutate";
  const address = path.match(/^addresses\/(adr_[0-9a-f-]{36})$/);
  if (address && method === "PATCH") return `addresses/${address[1]}/update`;
  if (address && method === "DELETE") return `addresses/${address[1]}/delete`;
  const makeDefault = path.match(/^addresses\/(adr_[0-9a-f-]{36})\/default$/);
  if (makeDefault && method === "POST") return `addresses/${makeDefault[1]}/default`;
  const order = path.match(/^orders\/(ord_[A-Za-z0-9_-]{1,150})$/);
  if (order && method === "GET") return `orders/${order[1]}`;
  throw failure(404, "account_commerce_route_not_found", "The account-commerce route was not found.");
}

async function readInput(request) {
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    throw failure(415, "content_type_invalid", "A JSON account-commerce request is required.");
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw failure(413, "request_too_large", "The account-commerce request is too large.");
  const raw = await request.text();
  if (encoder.encode(raw).byteLength > MAX_BODY_BYTES) throw failure(413, "request_too_large", "The account-commerce request is too large.");
  try {
    const value = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    return value;
  } catch {
    throw failure(400, "invalid_json", "The account-commerce request is invalid.");
  }
}

async function signedRelay(env, fetchImpl, route, payload) {
  const adminOrigin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
  const publicOrigin = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || "");
  if (!adminOrigin || !publicOrigin || !secret) throw failure(503, "account_commerce_not_configured", "Account commerce is not configured.");
  const pathname = `/api/account-commerce/internal/${route}`;
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = await digestHex(encoder.encode(body));
  const signature = await hmacSha256(secret, `${timestamp}\nPOST\n${pathname}\n${digest}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(`${adminOrigin}${pathname}`, {
      method: "POST",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: publicOrigin,
        "X-ThirdRailify-Timestamp": timestamp,
        "X-ThirdRailify-Signature": signature,
      },
      body,
    });
    const result = await response.json().catch(() => null);
    if (!result) throw failure(502, "account_commerce_invalid_response", "Account commerce returned an invalid response.");
    if (!response.ok) throw failure(response.status >= 400 && response.status < 500 ? response.status : 503, safeCode(result.error), safeMessage(result.message));
    return result;
  } catch (error) {
    if (error instanceof PublicAuthFailure) throw error;
    throw failure(503, "account_commerce_unavailable", "Account commerce is temporarily unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

function assertSafePayload(payload) {
  const serialized = JSON.stringify(payload);
  if (/ciphertext|fingerprint|stripe_checkout|payment_intent|provider_order_id|webhook|secret|credential/i.test(serialized)) {
    throw failure(502, "account_commerce_projection_invalid", "Account commerce returned an unsafe response.");
  }
}

function safeCode(value) { const code = String(value || "").slice(0, 80); return /^[a-z][a-z0-9_]{1,79}$/.test(code) ? code : "account_commerce_unavailable"; }
function safeMessage(value) { const message = Array.from(String(value || ""), (character) => { const code = character.codePointAt(0) || 0; return code <= 31 || code === 127 || character === "<" || character === ">" ? "" : character; }).join("").trim().slice(0, 240); return message || "Account commerce is temporarily unavailable."; }
function failure(status, code, message) { return new PublicAuthFailure(status, code, message); }
async function digestHex(bytes) { const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
