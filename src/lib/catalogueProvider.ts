import type { CatalogueProvider } from "../types/catalogue";

/**
 * Same-origin read boundary to the sanitized Admin-owned Commerce D1 projection.
 */
export const catalogueProvider: CatalogueProvider = {
  async load(signal) {
    const response = await fetch("/api/commerce/catalogue", { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("catalogue_unavailable");
    const payload = await response.json() as CommerceCataloguePayload;
    if (payload.ok !== true || payload.source !== "commerce-d1" || !Array.isArray(payload.collections) || !Array.isArray(payload.products)) throw new Error("catalogue_invalid");
    return { source: "commerce-d1", checkoutEnabled: payload.checkoutEnabled === true, capturedAt: payload.updatedAt || new Date(0).toISOString(), totalProductsReported: payload.products.length, collections: payload.collections, products: payload.products.map(toCatalogueProduct) };
  },
  async loadProduct(slug, signal) {
    const response = await fetch(`/api/commerce/products/${encodeURIComponent(slug)}`, { signal, headers: { Accept: "application/json" } });
    if (response.status === 404) throw new Error("product_not_found");
    if (!response.ok) throw new Error("catalogue_unavailable");
    const payload = await response.json() as { ok?: boolean; source?: string; product?: CommerceProduct };
    if (payload.ok !== true || payload.source !== "commerce-d1" || !payload.product) throw new Error("catalogue_invalid");
    return toCatalogueProduct(payload.product);
  },
};

type CommerceVariant = { id: string; label: string; size: string | null; color: string | null; options: Record<string, string>; unitAmount: number; currency: "CAD"; availability: "active" | "temporarily_out_of_stock" };
type CommerceProduct = { id: string; slug: string; title: string; description: string; images: string[]; categories: string[]; collectionSlugs: string[]; tags: string[]; featured: boolean; featuredOrder: number | null; displayOrder: number; maxQuantity: number; available: boolean; price: { minUnitAmount: number; maxUnitAmount: number; label: string }; variants: CommerceVariant[] };
type CommerceCollection = { title: string; slug: string; description: string; displayOrder: number; productCount: number; productIds: string[] };
type CommerceCataloguePayload = { ok?: boolean; source?: string; checkoutEnabled?: boolean; updatedAt?: string | null; collections: CommerceCollection[]; products: CommerceProduct[] };
function toCatalogueProduct(product: CommerceProduct) {
  const optionTypes = [...new Set(product.variants.flatMap((variant) => Object.keys(variant.options)))];
  return { id: product.id, slug: product.slug, name: product.title, price: product.price.minUnitAmount / 100, formattedPrice: product.price.label, currency: "CAD" as const, optionTypes, image: product.images[0] || "", images: product.images, categories: product.categories, collectionSlugs: product.collectionSlugs, description: product.description, featured: product.featured, featuredOrder: product.featuredOrder, displayOrder: product.displayOrder, tags: product.tags, priceMinUnitAmount: product.price.minUnitAmount, priceMaxUnitAmount: product.price.maxUnitAmount, maxQuantity: product.maxQuantity, available: product.available, variants: product.variants };
}

export function categorySlug(value: string) {
  return value
    .toLowerCase()
    .replace(/™/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
