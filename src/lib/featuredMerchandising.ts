import type { CatalogueProduct } from "../types/catalogue";

export const HOME_FEATURED_CAPACITY = 3;
export const SHOP_HERO_FEATURED_CAPACITY = 3;

export type FeaturedEligibility = (product: CatalogueProduct) => boolean;

export function isHomeFeaturedEligible(product: CatalogueProduct) {
  return Boolean(product.id && product.slug && product.name) && Number.isFinite(product.price) && product.price >= 0;
}

export function isShopHeroFeaturedEligible(product: CatalogueProduct) {
  return isHomeFeaturedEligible(product) && Boolean(product.image);
}

export function selectFeaturedProducts(products: readonly CatalogueProduct[], capacity: number, eligible: FeaturedEligibility = isHomeFeaturedEligible) {
  const limit = Number.isSafeInteger(capacity) && capacity > 0 ? capacity : 0;
  return products
    .filter((product) => product.featured === true && eligible(product))
    .sort(featuredMerchandisingCompare)
    .slice(0, limit);
}

export function allocateFeaturedSlots(products: readonly CatalogueProduct[], capacity: number, eligible: FeaturedEligibility = isHomeFeaturedEligible) {
  const limit = Number.isSafeInteger(capacity) && capacity > 0 ? capacity : 0;
  const selected = selectFeaturedProducts(products, limit, eligible);
  return Array.from({ length: limit }, (_, index) => selected[index] ?? null);
}

export function featuredMerchandisingCompare(left: CatalogueProduct, right: CatalogueProduct) {
  return featuredOrder(left) - featuredOrder(right)
    || stableOrder(left.displayOrder) - stableOrder(right.displayOrder)
    || left.id.localeCompare(right.id);
}

function featuredOrder(product: CatalogueProduct) {
  return Number.isSafeInteger(product.featuredOrder) && Number(product.featuredOrder) >= 0 ? Number(product.featuredOrder) : Number.MAX_SAFE_INTEGER;
}

function stableOrder(value: number | undefined) {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : Number.MAX_SAFE_INTEGER;
}
