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
    return wixSnapshot;
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
