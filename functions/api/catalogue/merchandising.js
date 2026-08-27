const TIMEOUT_MS = 3500;

export async function onRequestGet({ env, data = {} }) {
  try {
    const adminOrigin = configuredAdminOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await (data.fetchImpl || fetch)(`${adminOrigin}/api/catalogue/merchandising`, { headers: { Accept: "application/json" }, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("merchandising_upstream_unavailable");
    const payload = normalizeMerchandising(await response.json());
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ ok: false, products: [] }, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
}

function configuredAdminOrigin(value) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/") throw new Error("admin_origin_invalid");
  return url.origin;
}

export function normalizeMerchandising(input) {
  if (!input || input.ok !== true || !Array.isArray(input.products)) throw new Error("merchandising_invalid");
  const seen = new Set();
  const products = input.products.map((entry) => {
    const id = String(entry?.id || "").trim().slice(0, 160);
    const slug = String(entry?.slug || "").trim().slice(0, 180);
    if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(slug) || seen.has(id)) throw new Error("merchandising_product_invalid");
    seen.add(id);
    const featuredOrder = entry.featured === true && Number.isInteger(Number(entry.featuredOrder)) ? Number(entry.featuredOrder) : null;
    return { id, slug, featured: entry.featured === true, featuredOrder };
  });
  return { ok: true, products, updatedAt: typeof input.updatedAt === "string" ? input.updatedAt.slice(0, 80) : null };
}
