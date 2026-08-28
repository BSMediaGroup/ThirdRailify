import { proxyCommerceCatalogue } from "../../../_shared/commerce-catalogue-proxy.js";

export function onRequestGet({ env, params, data = {} }) {
  const slug = String(params.slug || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ ok: false, error: "product_not_found", message: "The product was not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return proxyCommerceCatalogue(env, `/api/public/commerce/products/${encodeURIComponent(slug)}`, data.fetchImpl || fetch);
}
