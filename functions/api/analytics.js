import {
  hmacSha256,
  normalizeOrigin,
  resolveSession,
} from "../_shared/public-auth.js";

const encoder = new TextEncoder();
const MAX_BODY_BYTES = 2048;
const COOKIE = "thirdrailify_analytics_session";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST")
    return new Response(null, {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    });
  try {
    if (privacyOptOut(request) || prefetch(request) || automated(request)) return empty();
    requireOrigin(request, env);
    if (!String(env?.THIRDRAILIFY_ANALYTICS_INGEST_SECRET || "")) return empty();
    const body = await readBody(request);
    const path = normalizePath(body.path);
    const id = identifier(body.id);
    if (body.eventType !== "page_view") throw new Error("unsupported");
    const existing = sessionCookie(request);
    const sessionId = existing || crypto.randomUUID();
    const session = await resolveSession(env, request).catch(() => null);
    const event = {
      id,
      eventType: "page_view",
      occurredAt: new Date().toISOString(),
      sessionId,
      path,
      pageType: pageType(path),
      referrerHost: referrerHost(body.referrerHost, env),
      sourceCategory: sourceCategory(body.referrerHost, env),
      ...trustedLocation(request.cf),
      ...device(request.headers.get("user-agent")),
      visitorClass: session ? "member" : "guest",
      metadata: campaign(body.metadata),
    };
    const relay = forward(env, context.data?.analyticsFetch || fetch, event);
    if (context.waitUntil) context.waitUntil(relay.catch(() => {}));
    else await relay.catch(() => {});
    return empty(
      existing
        ? undefined
        : `${COOKIE}=${sessionId}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
  } catch {
    return empty();
  }
}

async function readBody(request) {
  if (
    !String(request.headers.get("content-type") || "")
      .toLowerCase()
      .startsWith("application/json")
  )
    throw new Error("type");
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES)
    throw new Error("large");
  const raw = await request.text();
  if (encoder.encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("large");
  const value = JSON.parse(raw || "{}");
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) =>
        !["id", "eventType", "path", "referrerHost", "metadata"].includes(key),
    )
  )
    throw new Error("body");
  return value;
}
async function forward(env, fetchImpl, event) {
  const admin = normalizeOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
  const origin = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  const secret = String(env?.THIRDRAILIFY_ANALYTICS_INGEST_SECRET || "");
  if (!admin || !origin || !secret) return;
  const pathname = "/api/internal/analytics/ingest";
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = await digestHex(encoder.encode(body));
  const signature = await hmacSha256(
    secret,
    `${timestamp}\nPOST\n${pathname}\n${digest}`,
  );
  const response = await fetchImpl(`${admin}${pathname}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
      "X-ThirdRailify-Timestamp": timestamp,
      "X-ThirdRailify-Signature": signature,
    },
    body,
  });
  if (!response.ok) throw new Error("relay");
}
function requireOrigin(request, env) {
  const actual = normalizeOrigin(request.headers.get("origin"));
  const expected = normalizeOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN);
  if (!actual || actual !== expected) throw new Error("origin");
}
function privacyOptOut(request) {
  return (
    request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1"
  );
}
function prefetch(request) {
  const purpose =
    `${request.headers.get("purpose") || ""} ${request.headers.get("sec-purpose") || ""}`.toLowerCase();
  return purpose.includes("prefetch") || purpose.includes("prerender");
}
function automated(request) {
  if (request.cf?.botManagement?.verifiedBot === true) return true;
  return /(?:bot|crawler|spider|slurp|facebookexternalhit|bingpreview|headlesschrome)/i.test(
    String(request.headers.get("user-agent") || ""),
  );
}
function normalizePath(value) {
  const url = new URL(String(value || "/"), "https://thirdrailify.invalid");
  let path = url.pathname.replace(/\/{2,}/g, "/");
  if (
    !path.startsWith("/") ||
    path.length > 512 ||
    /^\/(?:api|admin)(?:\/|$)/i.test(path) ||
    /\.(?:js|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf)$/i.test(path)
  )
    throw new Error("path");
  return path || "/";
}
function identifier(value) {
  const id = String(value || "");
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) throw new Error("id");
  return id;
}
function sessionCookie(request) {
  const part = String(request.headers.get("cookie") || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE}=`));
  const value = part?.slice(COOKIE.length + 1) || "";
  return /^[0-9a-f-]{36}$/.test(value) ? value : "";
}
function trustedLocation(cf = {}) {
  const coordinate = (value, min, max) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max
      ? Math.round(number * 10) / 10
      : null;
  };
  const text = (value, max) => {
    const result = safeText(value);
    return result ? result.slice(0, max) : null;
  };
  const countryCode = /^[A-Z]{2}$/.test(String(cf?.country || ""))
    ? String(cf.country)
    : null;
  return {
    countryCode,
    countryName: null,
    regionCode: text(cf?.regionCode, 24),
    regionName: text(cf?.region, 100),
    city: text(cf?.city, 100),
    latitude: coordinate(cf?.latitude, -90, 90),
    longitude: coordinate(cf?.longitude, -180, 180),
  };
}
function device(userAgentValue) {
  const ua = String(userAgentValue || "");
  const deviceClass = /iPad|Tablet|PlayBook/i.test(ua)
    ? "tablet"
    : /Mobi|Android|iPhone/i.test(ua)
      ? "mobile"
      : ua
        ? "desktop"
        : "other";
  const browserFamily = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Other";
  const platformFamily = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/i.test(ua)
        ? "iOS"
        : /Mac OS/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Other";
  return { deviceClass, browserFamily, platformFamily };
}
function referrerHost(value, env) {
  try {
    const host = new URL(String(value || "")).hostname.toLowerCase();
    const own = new URL(
      String(env?.THIRDRAILIFY_PUBLIC_ORIGIN || ""),
    ).hostname.toLowerCase();
    return host && host !== own ? host.slice(0, 253) : null;
  } catch {
    return null;
  }
}
function sourceCategory(value, env) {
  try {
    const candidate = new URL(String(value || "")).hostname.toLowerCase();
    const own = new URL(String(env?.THIRDRAILIFY_PUBLIC_ORIGIN || "")).hostname.toLowerCase();
    if (candidate && candidate === own) return "internal";
  } catch { /* Empty and invalid referrers are direct. */ }
  const host = referrerHost(value, env);
  if (!host) return "direct";
  if (/(?:google|bing|duckduckgo|yahoo)\./.test(host)) return "search";
  if (
    /(?:youtube|x|twitter|facebook|instagram|tiktok|reddit|rumble)\./.test(host)
  )
    return "social";
  return "referral";
}
function campaign(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [source, target, max] of [
    ["campaignSource", "campaignSource", 80],
    ["campaignMedium", "campaignMedium", 80],
    ["campaignName", "campaignName", 120],
  ]) {
    const text = safeText(value[source]);
    if (text) result[target] = text.slice(0, max);
  }
  return result;
}
function pageType(path) {
  if (path === "/") return "home";
  for (const type of [
    "shop",
    "watch",
    "wheels",
    "goats",
    "account",
    "community",
    "donate",
  ]) {
    if (path === `/${type}` || path.startsWith(`/${type}/`)) return type;
  }
  return "content";
}
function safeText(value) {
  return Array.from(String(value || ""), (character) => {
    const code = character.codePointAt(0) || 0;
    return code <= 31 || code === 127 || character === "<" || character === ">" ? "" : character;
  }).join("").trim();
}
function empty(cookie) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (cookie) headers["Set-Cookie"] = cookie;
  return new Response(null, { status: 204, headers });
}
async function digestHex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export { MAX_BODY_BYTES, normalizePath, device, privacyOptOut, automated };
