const TIMEOUT_MS = 3500;

export async function onRequestGet({ env, data = {} }) {
  try {
    const adminOrigin = configuredAdminOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await (data.fetchImpl || fetch)(`${adminOrigin}/api/banner`, { headers: { Accept: "application/json" }, signal: controller.signal });
    } finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error("banner_upstream_unavailable");
    const payload = normalizePublicBanner(await response.json());
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ ok: false, error: "banner_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
}

function configuredAdminOrigin(value) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("admin_origin_invalid");
  return url.origin;
}

export function normalizePublicBanner(input) {
  if (!input || input.ok !== true || input.schema !== "thirdrailify-banner-v1" || !input.normal || !input.live) throw new Error("banner_invalid");
  const expected = new Set(["ok", "schema", "normal", "live", "homeRail", "updatedAt"]);
  if (Object.keys(input).some((key) => !expected.has(key))) throw new Error("banner_fields_invalid");
  return {
    ...input,
    normal: { ...input.normal, dismissible: input.normal.dismissible ?? false, glyph: input.normal.glyph ?? "zap", glyphSize: input.normal.glyphSize ?? "medium" },
    homeRail: { ...(input.homeRail || { enabled: true, items: ["THIRD RAILIFY", "NEWS HANGOUT", "ABOOT NOTHING", "POP CULTURE BEAT DOWN"], mode: "marquee", speed: "normal", easing: "linear", glyph: "zap" }), glyphSize: input.homeRail?.glyphSize ?? "medium" },
  };
}
