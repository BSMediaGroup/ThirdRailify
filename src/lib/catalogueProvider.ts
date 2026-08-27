import { wixSnapshot } from "../data/wixSnapshot";
import type { CatalogueProvider } from "../types/catalogue";

/**
 * Temporary read boundary. A later server-backed provider can replace this
 * object without changing storefront components or exposing provider secrets.
 */
export const catalogueProvider: CatalogueProvider = {
  async load(signal) {
    await Promise.resolve();
    if (signal?.aborted) {
      throw new DOMException("Catalogue request aborted", "AbortError");
    }
    try {
      const response = await fetch("/api/catalogue/merchandising", { signal, headers: { Accept: "application/json" } });
      if (!response.ok) return wixSnapshot;
      const payload = await response.json() as { ok?: boolean; products?: Array<{ id?: string; slug?: string; featured?: boolean; featuredOrder?: number | null }> };
      if (payload.ok !== true || !Array.isArray(payload.products)) return wixSnapshot;
      const overlay = new Map(payload.products.map((entry) => [entry.id, entry]));
      return { ...wixSnapshot, products: wixSnapshot.products.map((product) => {
        const entry = overlay.get(product.id);
        if (!entry || entry.slug !== product.slug) return product;
        return { ...product, featured: entry.featured === true, featuredOrder: Number.isInteger(entry.featuredOrder) ? entry.featuredOrder : null };
      }) };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      return wixSnapshot;
    }
  },
};

export function categorySlug(value: string) {
  return value
    .toLowerCase()
    .replace(/™/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
