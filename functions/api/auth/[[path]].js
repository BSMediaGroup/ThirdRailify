import {
  AUTH_COOKIE_NAME,
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
  const fetchImpl = context.data?.authFetch || fetch;
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
    if (path === "profile") return await handleProfileProxy(request, env, fetchImpl);
    if (path === "avatar") return await handleAvatarProxy(request, env, fetchImpl);
    throw new PublicAuthFailure(404, "not_found", "The auth route was not found.");
  } catch (error) {
    return errorResponse(error, request, env);
  }
}

async function handleProfileProxy(request, env, fetchImpl) {
  const origin = requirePublicOrigin(request, env);
  const session = await resolveSession(env, request);
  if (!session) throw new PublicAuthFailure(401, "unauthenticated", "A signed-in account is required.");
  await requireCsrf(request, session);
  const adminOrigin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
  if (!adminOrigin) throw new PublicAuthFailure(503, "auth_origin_not_configured", "The account service origin is not configured.");
  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new PublicAuthFailure(415, "profile_content_type", "Display-name changes require a JSON request.");
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 4 * 1024) {
    throw new PublicAuthFailure(413, "profile_request_too_large", "The profile request is too large.");
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > 4 * 1024) throw new PublicAuthFailure(413, "profile_request_too_large", "The profile request is too large.");
  const upstream = await fetchImpl(`${adminOrigin}/api/auth/profile`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Cookie": `${AUTH_COOKIE_NAME}=${encodeURIComponent(session.token)}`,
      "Origin": origin,
      "X-CSRF-Token": session.csrfToken,
    },
    body,
    redirect: "manual",
  });
  const responseType = String(upstream.headers.get("content-type") || "").toLowerCase();
  if (!responseType.startsWith("application/json")) {
    throw new PublicAuthFailure(502, "auth_unavailable", "The account service returned an invalid response.");
  }
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      ...corsHeaders(request, env),
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handleAvatarProxy(request, env, fetchImpl) {
  const origin = requirePublicOrigin(request, env);
  const session = await resolveSession(env, request);
  if (!session) throw new PublicAuthFailure(401, "unauthenticated", "A signed-in account is required.");
  await requireCsrf(request, session);
  const adminOrigin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
  if (!adminOrigin) throw new PublicAuthFailure(503, "auth_origin_not_configured", "The account service origin is not configured.");
  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.toLowerCase().startsWith("application/json") && !contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new PublicAuthFailure(415, "avatar_content_type", "Upload a JPG, PNG, or WebP file, or provide an HTTPS image URL.");
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 5 * 1024 * 1024 + 64 * 1024) {
    throw new PublicAuthFailure(413, "avatar_too_large", "Choose an image no larger than 5 MB.");
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > 5 * 1024 * 1024 + 64 * 1024) {
    throw new PublicAuthFailure(413, "avatar_too_large", "Choose an image no larger than 5 MB.");
  }
  const upstream = await fetchImpl(`${adminOrigin}/api/auth/avatar`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "Cookie": `${AUTH_COOKIE_NAME}=${encodeURIComponent(session.token)}`,
      "Origin": origin,
      "X-CSRF-Token": session.csrfToken,
    },
    body,
    redirect: "manual",
  });
  const responseType = String(upstream.headers.get("content-type") || "").toLowerCase();
  if (!responseType.startsWith("application/json")) {
    throw new PublicAuthFailure(502, "auth_unavailable", "The account service returned an invalid response.");
  }
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      ...corsHeaders(request, env),
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
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
