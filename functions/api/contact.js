import { PublicAuthFailure, errorResponse, hmacSha256, normalizeOrigin } from "../_shared/public-auth.js";

const MAX_BODY_BYTES = 12 * 1024;

export async function onRequest(context) {
  const { request, env } = context;
  try {
    if (request.method !== "POST") throw new PublicAuthFailure(405, "method_not_allowed", "This method is not allowed.", { Allow: "POST" });
    const origin = normalizeOrigin(request.headers.get("Origin"));
    const publicOrigin = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
    const adminOrigin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
    if (!origin || origin !== publicOrigin) throw new PublicAuthFailure(403, "origin_not_allowed", "This request origin is not allowed.");
    if (!safeAuthorityOrigin(adminOrigin)) throw new PublicAuthFailure(503, "contact_origin_not_configured", "Contact delivery is not configured.");
    const contentType = String(request.headers.get("Content-Type") || "").toLowerCase();
    if (!contentType.startsWith("application/json")) throw new PublicAuthFailure(415, "content_type_required", "A JSON request body is required.");
    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new PublicAuthFailure(413, "request_too_large", "The contact request is too large.");
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) throw new PublicAuthFailure(413, "request_too_large", "The contact request is too large.");

    const relayHeaders = await signedRelayHeaders(env, request, publicOrigin);

    const upstream = await boundedContactFetch(context.data?.contactFetch || fetch, `${adminOrigin}/api/contact`, {
      method: "POST",
      headers: relayHeaders,
      body,
      redirect: "manual",
    });
    const responseType = String(upstream.headers.get("Content-Type") || "").toLowerCase();
    if (!responseType.startsWith("application/json")) throw new PublicAuthFailure(502, "contact_unavailable", "Contact delivery returned an invalid response.");
    const responseBody = await upstream.text();
    if (responseBody.length > 8 * 1024) throw new PublicAuthFailure(502, "contact_unavailable", "Contact delivery returned an invalid response.");
    return new Response(responseBody, { status: upstream.status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return errorResponse(error, request, env);
  }
}

function safeAuthorityOrigin(origin) {
  if (!origin) return false;
  const url = new URL(origin);
  return url.protocol === "https:" || (url.protocol === "http:" && new Set(["localhost", "127.0.0.1"]).has(url.hostname));
}

async function boundedContactFetch(fetchImpl, input, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try { return await fetchImpl(input, { ...init, signal: controller.signal }); }
  catch { throw new PublicAuthFailure(503, "contact_unavailable", "Contact delivery is temporarily unavailable."); }
  finally { clearTimeout(timeout); }
}

async function signedRelayHeaders(env, request, publicOrigin) {
  const signingSecret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || "");
  const rateSecret = String(env?.THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET || "");
  if (!signingSecret || !rateSecret) throw new PublicAuthFailure(503, "contact_security_not_configured", "Contact delivery is not configured.");
  const clientIp = String(request.headers.get("CF-Connecting-IP") || "unknown").trim().slice(0, 80);
  const rateKey = await hmacSha256(rateSecret, `contact\n${clientIp || "unknown"}`);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await hmacSha256(signingSecret, `${timestamp}\ncontact\n${rateKey}`);
  return {
    "Content-Type": "application/json",
    Origin: publicOrigin,
    "X-ThirdRailify-Contact-Rate-Key": rateKey,
    "X-ThirdRailify-Timestamp": timestamp,
    "X-ThirdRailify-Signature": signature,
  };
}
