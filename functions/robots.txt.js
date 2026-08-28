export function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const origin = publicOrigin(env, new URL(request.url));
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(request.method === "HEAD" ? null : body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff" } });
}

function publicOrigin(env, requestUrl) {
  try {
    const configured = new URL(String(env?.THIRDRAILIFY_PUBLIC_ORIGIN || ""));
    if (configured.protocol === "https:") return configured.origin;
  } catch { /* use request origin */ }
  return requestUrl.origin;
}
