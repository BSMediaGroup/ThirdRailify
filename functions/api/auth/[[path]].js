import {
  PublicAuthFailure,
  clearSessionCookie,
  consumeHandoff,
  corsHeaders,
  enforceHandoffRateLimit,
  errorResponse,
  jsonResponse,
  normalizeOrigin,
  readJsonBody,
  requireCsrf,
  requirePublicOrigin,
  resolveSession,
  revokeSession,
  sessionEnvelope,
} from "../../_shared/public-auth.js";

const ROUTE_PREFIX = "/api/auth";

export async function onRequest(context) {
  const { request, env } = context;
  try {
    if (request.method === "OPTIONS") return handleOptions(request, env);
    const path = new URL(request.url).pathname.slice(ROUTE_PREFIX.length).replace(/^\/+|\/+$/g, "");
    if (request.method === "GET" && path === "session") {
      requirePublicOriginWhenPresent(request, env);
      return jsonResponse(await sessionEnvelope(await resolveSession(env, request)), { headers: corsHeaders(request, env) });
    }
    if (request.method !== "POST") {
      throw new PublicAuthFailure(405, "method_not_allowed", "This method is not allowed.", { Allow: path === "session" ? "GET, OPTIONS" : "POST, OPTIONS" });
    }
    if (path === "handoff") return await handleHandoff(request, env);
    if (path === "logout") return await handleLogout(request, env);
    throw new PublicAuthFailure(404, "not_found", "The auth route was not found.");
  } catch (error) {
    return errorResponse(error, request, env);
  }
}

async function handleHandoff(request, env) {
  const origin = requirePublicOrigin(request, env);
  const body = await readJsonBody(request);
  await enforceHandoffRateLimit(env, request, String(body.code || ""));
  const created = await consumeHandoff(env, request, body.code, origin);
  return jsonResponse(
    { ...(await sessionEnvelope(created.session)), returnTo: created.returnTo },
    { headers: { ...corsHeaders(request, env), "Set-Cookie": created.cookie } },
  );
}

async function handleLogout(request, env) {
  requirePublicOrigin(request, env);
  const session = await resolveSession(env, request);
  if (session) {
    await requireCsrf(request, session);
    await revokeSession(env, session);
  }
  return jsonResponse(
    { ok: true, authenticated: false, account: null, access: { isAdmin: false, isMasterAdmin: false } },
    { headers: { ...corsHeaders(request, env), "Set-Cookie": clearSessionCookie(request, env) } },
  );
}

function requirePublicOriginWhenPresent(request, env) {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return;
  const origin = normalizeOrigin(rawOrigin);
  const expected = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  if (!origin || origin !== expected) throw new PublicAuthFailure(403, "origin_not_allowed", "This request origin is not allowed.");
}

function handleOptions(request, env) {
  requirePublicOrigin(request, env);
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request, env),
      "Access-Control-Allow-Headers": "content-type,x-csrf-token",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Max-Age": "600",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
