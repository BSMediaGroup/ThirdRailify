const TIMEOUT_MS = 5000;

export async function proxyCommerceCatalogue(env, path, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const adminOrigin = configuredAdminOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
    const response = await fetchImpl(`${adminOrigin}${path}`, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (response.status === 404) return Response.json({ ok: false, error: "product_not_found", message: "The product was not found." }, { status: 404, headers: noStoreHeaders() });
    if (!response.ok) throw new Error("catalogue_upstream_unavailable");
    const normalized = path.endsWith("/catalogue") ? normalizeCatalogue(await response.json()) : normalizeProductPayload(await response.json());
    return Response.json(normalized, { headers: publicCacheHeaders() });
  } catch {
    return Response.json({ ok: false, error: "catalogue_unavailable", message: "The shop catalogue is temporarily unavailable." }, { status: 503, headers: noStoreHeaders() });
  } finally { clearTimeout(timeout); }
}

export function normalizeCatalogue(input) {
  if (!input || input.ok !== true || input.source !== "commerce-d1" || !Array.isArray(input.products)) throw new Error("catalogue_invalid");
  const products = input.products.map(normalizeProduct);
  const collections = requiredArray(input.collections, 200).map(normalizeCollection);
  if (new Set(products.map((product) => product.id)).size !== products.length || new Set(products.map((product) => product.slug)).size !== products.length) throw new Error("catalogue_duplicate");
  if (new Set(collections.map((collection) => collection.slug)).size !== collections.length) throw new Error("catalogue_collection_duplicate");
  return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, collections, products, updatedAt: boundedText(input.updatedAt, 80) || null };
}

export function normalizeProductPayload(input) {
  if (!input || input.ok !== true || input.source !== "commerce-d1") throw new Error("catalogue_product_invalid");
  return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, product: normalizeProduct(input.product) };
}

function normalizeProduct(input) {
  const id = identifier(input?.id); const slug = boundedText(input?.slug, 180); const title = boundedText(input?.title, 240);
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title) throw new Error("catalogue_product_invalid");
  const variants = requiredArray(input.variants, 2000).map(normalizeVariant);
  const price = normalizePrice(input.price);
  return {
    id, slug, title, description: boundedText(input.description, 12000), images: stringArray(input.images, 24, 4096, true),
    categories: stringArray(input.categories, 20, 160), collectionSlugs: stringArray(input.collectionSlugs, 20, 180), tags: stringArray(input.tags, 30, 80), featured: input.featured === true,
    featuredOrder: input.featured === true && Number.isSafeInteger(Number(input.featuredOrder)) ? Number(input.featuredOrder) : null,
    displayOrder: integer(input.displayOrder, 0, 999999, 1000), requiresShipping: input.requiresShipping === true,
    maxQuantity: integer(input.maxQuantity, 1, 20, 20), price, variants, available: input.available === true,
    updatedAt: boundedText(input.updatedAt, 80),
  };
}

function normalizeCollection(input) {
  const slug = boundedText(input?.slug, 180); const title = boundedText(input?.title, 160);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title) throw new Error("catalogue_collection_invalid");
  return { title, slug, description: boundedText(input.description, 2000), displayOrder: integer(input.displayOrder, 0, 999999, 1000), productCount: integer(input.productCount, 0, 100000, 0), productIds: stringArray(input.productIds, 10000, 160), updatedAt: boundedText(input.updatedAt, 80) };
}

function normalizeVariant(input) {
  const id = identifier(input?.id); const label = boundedText(input?.label, 240); const unitAmount = integer(input?.unitAmount, 1, 100_000_000, null);
  if (!id || !label || unitAmount === null || input?.currency !== "CAD") throw new Error("catalogue_variant_invalid");
  const options = input.options && typeof input.options === "object" && !Array.isArray(input.options) ? Object.fromEntries(Object.entries(input.options).slice(0, 12).map(([key, value]) => [boundedText(key, 80), boundedText(value, 120)]).filter(([key, value]) => key && value)) : {};
  return { id, label, size: boundedText(input.size, 120) || null, color: boundedText(input.color, 120) || null, options, unitAmount, currency: "CAD", availability: input.availability === "temporarily_out_of_stock" ? "temporarily_out_of_stock" : "active" };
}

function normalizePrice(input) { const minimum = integer(input?.minUnitAmount, 1, 100_000_000, null); const maximum = integer(input?.maxUnitAmount, 1, 100_000_000, null); if (minimum === null || maximum === null || maximum < minimum || input?.currency !== "CAD") throw new Error("catalogue_price_invalid"); return { currency: "CAD", minUnitAmount: minimum, maxUnitAmount: maximum, label: boundedText(input.label, 80) || formatCad(minimum) }; }
function configuredAdminOrigin(value) { const url = new URL(String(value || "")); if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/") throw new Error("admin_origin_invalid"); return url.origin; }
function identifier(value) { const text = boundedText(value, 160); return /^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(text) ? text : ""; }
function boundedText(value, maximum) { return String(value ?? "").trim().slice(0, maximum); }
function integer(value, minimum, maximum, fallback) { const number = Number(value); return Number.isSafeInteger(number) && number >= minimum && number <= maximum ? number : fallback; }
function requiredArray(value, maximum) { if (!Array.isArray(value) || value.length > maximum) throw new Error("catalogue_array_invalid"); return value; }
function stringArray(value, maximum, itemLength, urls = false) { return [...new Set(requiredArray(value, maximum).map((item) => boundedText(item, itemLength)).filter((item) => item && (!urls || safeHttps(item))))]; }
function safeHttps(value) { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; } }
function formatCad(value) { return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value / 100); }
function publicCacheHeaders() { return { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", "X-Content-Type-Options": "nosniff" }; }
function noStoreHeaders() { return { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }; }
