import {
  PublicAuthFailure,
  hmacSha256,
  jsonResponse,
  normalizeOrigin,
  readJsonBody,
  requireCsrf,
  requirePublicOrigin,
  resolveSession,
} from "../../_shared/public-auth.js";

const INTERNAL_PATH = "/api/gaming/suggestions";
const encoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env } = context;
  try {
    if (request.method !== "POST") throw failure(405, "method_not_allowed", "This method is not allowed.", { Allow: "POST" });
    requirePublicOrigin(request, env);
    const body = await readJsonBody(request);
    if (clean(body.website, 120)) return success("GAM-RECEIVED");

    const session = await resolveSession(env, request);
    if (session) await requireCsrf(request, session);
    const rateKey = await privacyRateKey(env, request, session?.accountId || "guest");
    const relayBody = JSON.stringify({
      requestId: crypto.randomUUID(),
      gameTitle: body.gameTitle,
      steamUrl: body.steamUrl,
      pitch: body.pitch,
      website: "",
      turnstileToken: body.turnstileToken,
      accountId: session?.accountId || null,
      displayName: session?.account?.displayName || null,
      rateKey,
    });
    const upstream = await boundedFetch(context.data?.gamingFetch || fetch, adminUrl(env), {
      method: "POST",
      redirect: "manual",
      headers: await signedHeaders(env, relayBody),
      body: relayBody,
    });
    return await sanitizeUpstream(upstream);
  } catch (error) {
    const known = error instanceof PublicAuthFailure;
    return jsonResponse({ ok: false, error: known ? error.code : "gaming_request_unavailable", message: known ? error.message : "The Gaming request channel is temporarily unavailable." }, { status: known ? error.status : 500, headers: { ...(known ? error.headers : {}), "Cache-Control": "no-store" } });
  }
}

function adminUrl(env) {
  const origin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
  if (!origin) throw failure(503, "gaming_request_not_configured", "The Gaming request channel is not configured.");
  return `${origin}${INTERNAL_PATH}`;
}

async function privacyRateKey(env, request, identity) {
  const secret = String(env?.THIRDRAILIFY_AUTH_RATE_LIMIT_SECRET || "");
  if (!secret) throw failure(503, "gaming_request_not_configured", "Submission protection is not configured.");
  const ip = clean(request.headers.get("CF-Connecting-IP"), 80) || "unknown";
  return hmacSha256(secret, `gaming-suggestion\n${ip}\n${clean(identity, 160)}`);
}

async function signedHeaders(env, body) {
  const secret = String(env?.THIRDRAILIFY_COMMUNITY_API_SECRET || "");
  const origin = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  if (!secret || !origin) throw failure(503, "gaming_request_not_configured", "The Gaming request channel is not configured.");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = await digestHex(encoder.encode(body));
  const signature = await hmacSha256(secret, `${timestamp}\nPOST\n${INTERNAL_PATH}\n${digest}`);
  return { "Content-Type": "application/json", Accept: "application/json", Origin: origin, "X-ThirdRailify-Timestamp": timestamp, "X-ThirdRailify-Signature": signature };
}

async function boundedFetch(fetchImpl, input, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try { return await fetchImpl(input, { ...init, signal: controller.signal }); }
  catch { throw failure(503, "gaming_request_unavailable", "The Gaming request channel is temporarily unavailable."); }
  finally { clearTimeout(timeout); }
}

async function sanitizeUpstream(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw failure(502, "gaming_request_unavailable", "The Gaming request channel returned an invalid response.");
  const payload = await response.json().catch(() => null);
  if (response.ok && payload?.ok === true && /^GAM-[A-F0-9]{8}$/.test(String(payload.reference || ""))) return success(payload.reference);
  const allowed = new Set(["game_title_invalid", "steam_url_invalid", "pitch_invalid", "suggestion_markup_invalid", "turnstile_required", "turnstile_invalid", "turnstile_unavailable", "too_many_attempts", "gaming_request_not_configured"]);
  const code = allowed.has(payload?.error) ? payload.error : "gaming_request_unavailable";
  const message = allowed.has(payload?.error) && typeof payload?.message === "string" ? payload.message.slice(0, 300) : "The Gaming request channel is temporarily unavailable.";
  return jsonResponse({ ok: false, error: code, message }, { status: response.status >= 400 && response.status < 600 ? response.status : 503, headers: { "Cache-Control": "no-store" } });
}

function success(reference) { return jsonResponse({ ok: true, reference, message: "Your game request reached the Third Railify Admin inbox." }, { headers: { "Cache-Control": "no-store" } }); }
function failure(status, code, message, headers = {}) { return new PublicAuthFailure(status, code, message, headers); }
function clean(value, max) { return Array.from(String(value || "")).filter((character) => { const code = character.charCodeAt(0); return code >= 32 && code !== 127; }).join("").trim().slice(0, max); }
async function digestHex(bytes) { const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export { INTERNAL_PATH, sanitizeUpstream };
