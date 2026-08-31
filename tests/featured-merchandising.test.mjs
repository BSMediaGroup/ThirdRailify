import assert from "node:assert/strict";
import test from "node:test";
import { allocateFeaturedSlots, isHomeFeaturedEligible, isShopHeroFeaturedEligible, selectFeaturedProducts } from "../src/lib/featuredMerchandising.ts";

const product = (id, overrides = {}) => ({ id, slug: id, name: id, price: 30, formattedPrice: "CA$30.00", currency: "CAD", optionTypes: [], image: "https://images.example.test/product.png", categories: [], featured: false, featuredOrder: null, displayOrder: 100, ...overrides });

test("zero Featured never substitutes ordinary catalogue products", () => {
  const slots = allocateFeaturedSlots([product("normal-a"), product("normal-b")], 3);
  assert.deepEqual(slots, [null, null, null]);
});

test("one and partial Featured inventories preserve fixed slots without duplication", () => {
  const one = allocateFeaturedSlots([product("featured-a", { featured: true, featuredOrder: 10 }), product("normal")], 3);
  assert.deepEqual(one.map((entry) => entry?.id ?? null), ["featured-a", null, null]);
  const partial = allocateFeaturedSlots([product("featured-a", { featured: true, featuredOrder: 20 }), product("featured-b", { featured: true, featuredOrder: 10 })], 3);
  assert.deepEqual(partial.map((entry) => entry?.id ?? null), ["featured-b", "featured-a", null]);
});

test("exact and over-capacity inventories use authoritative ordering and deterministic ties", () => {
  const catalogue = [
    product("featured-d", { featured: true, featuredOrder: 30 }),
    product("featured-b", { featured: true, featuredOrder: 10, displayOrder: 20 }),
    product("featured-a", { featured: true, featuredOrder: 10, displayOrder: 20 }),
    product("featured-c", { featured: true, featuredOrder: 20 }),
  ];
  assert.deepEqual(selectFeaturedProducts(catalogue, 3).map((entry) => entry.id), ["featured-a", "featured-b", "featured-c"]);
  assert.equal(allocateFeaturedSlots(catalogue.slice(0, 3), 3).filter(Boolean).length, 3);
});

test("Featured but surface-ineligible products do not leak and ordinary products never backfill", () => {
  const catalogue = [product("image-missing", { featured: true, featuredOrder: 10, image: "" }), product("normal", { image: "https://images.example.test/normal.png" })];
  assert.equal(isHomeFeaturedEligible(catalogue[0]), true);
  assert.equal(isShopHeroFeaturedEligible(catalogue[0]), false);
  assert.deepEqual(allocateFeaturedSlots(catalogue, 3, isShopHeroFeaturedEligible), [null, null, null]);
});

test("invalid capacity is bounded to zero", () => {
  assert.deepEqual(allocateFeaturedSlots([product("featured", { featured: true })], -1), []);
  assert.deepEqual(selectFeaturedProducts([product("featured", { featured: true })], Number.NaN), []);
});
