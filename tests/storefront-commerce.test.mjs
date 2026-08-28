import assert from "node:assert/strict";
import test from "node:test";
import { configuredRatesUrl, normalizeCurrencyRates, onRequestGet as currencyRatesRequest } from "../functions/api/currency-rates.js";
import { normalizeMerchandising, onRequestGet as merchandisingRequest } from "../functions/api/catalogue/merchandising.js";
import { normalizeCatalogue, proxyCommerceCatalogue } from "../functions/_shared/commerce-catalogue-proxy.js";
import { convertCad, formatMoney, resolveInitialCurrency } from "../src/currency/math.js";

test("currency responses normalize CAD and reject malformed or non-positive rates", () => {
  assert.deepEqual(normalizeCurrencyRates({ base: "CAD", date: "2026-08-27", rates: { USD: 0.72, AUD: 1.09 } }), { ok: true, base: "CAD", date: "2026-08-27", rates: { CAD: 1, USD: 0.72, AUD: 1.09 } });
  assert.throws(() => normalizeCurrencyRates({ base: "USD", rates: { CAD: 1.2 } }), /base/);
  assert.throws(() => normalizeCurrencyRates({ base: "CAD", rates: { USD: 0 } }), /rate/);
  assert.throws(() => normalizeCurrencyRates({ base: "CAD", rates: { USD: Number.NaN } }), /rate/);
  assert.throws(() => configuredRatesUrl("http://example.test/rates"), /invalid/);
});

test("CAD conversion uses integer cents and Intl respects zero-decimal currencies", () => {
  const rates = { CAD: 1, USD: 0.72, AUD: 1.09, JPY: 105.4 };
  assert.equal(convertCad(30.5, "USD", rates), 21.96);
  assert.ok(Math.abs(convertCad(30.5, "AUD", rates) - 33.245) < 1e-9);
  assert.equal(convertCad(Number.NaN, "USD", rates), null);
  assert.equal(convertCad(30.5, "EUR", rates), null);
  assert.doesNotMatch(formatMoney(convertCad(30.5, "JPY", rates), "JPY"), /\./);
  assert.equal(resolveInitialCurrency(null, null), "USD");
  assert.equal(resolveInitialCurrency("AUD", "GBP"), "AUD");
  assert.equal(resolveInitialCurrency("invalid", "GBP"), "GBP");
  assert.equal(resolveInitialCurrency("invalid", "also-invalid"), "USD");
});

test("currency endpoint projects one bounded response and fails without breaking CAD", async () => {
  const success = await currencyRatesRequest({ env: { CURRENCY_RATES_API_URL: "https://rates.example.test/latest?base=CAD" }, data: { fetchImpl: async () => Response.json({ base: "CAD", date: "2026-08-27", rates: { USD: 0.72 } }) } });
  assert.equal(success.status, 200); assert.match(success.headers.get("cache-control"), /stale-while-revalidate/); assert.equal((await success.json()).rates.CAD, 1);
  const failure = await currencyRatesRequest({ env: { CURRENCY_RATES_API_URL: "" }, data: {} });
  assert.equal(failure.status, 503); assert.equal((await failure.json()).ok, false);
});

test("merchandising projection is bounded, stable, and gracefully unavailable", async () => {
  const upstream = { ok: true, updatedAt: "2026-08-27T01:00:00.000Z", products: [{ id: "p1", slug: "product-one", featured: true, featuredOrder: 10 }] };
  assert.deepEqual(normalizeMerchandising(upstream).products[0], { id: "p1", slug: "product-one", featured: true, featuredOrder: 10 });
  assert.throws(() => normalizeMerchandising({ ok: true, products: [{ id: "p1", slug: "Bad slug" }] }), /invalid/);
  const response = await merchandisingRequest({ env: { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" }, data: { fetchImpl: async () => Response.json(upstream) } });
  assert.equal(response.status, 200); assert.equal((await response.json()).products.length, 1);
  const failure = await merchandisingRequest({ env: {}, data: {} });
  assert.equal(failure.status, 503); assert.deepEqual((await failure.json()).products, []);
});

const commerceProduct = { id: "product-local-1", slug: "real-product", title: "Real product", description: "Commerce description", images: ["https://images.example.test/product.png"], categories: ["Apparel"], tags: ["tee"], featured: true, featuredOrder: 10, displayOrder: 20, requiresShipping: true, maxQuantity: 5, price: { currency: "CAD", minUnitAmount: 3050, maxUnitAmount: 3450, label: "From CA$30.50" }, variants: [{ id: "variant-local-1", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 3050, currency: "CAD", availability: "active" }, { id: "variant-local-2", label: "2XL / Black", size: "2XL", color: "Black", options: { Size: "2XL", Color: "Black" }, unitAmount: 3450, currency: "CAD", availability: "active" }], available: true, updatedAt: "2026-08-28T00:00:00.000Z" };

test("commerce catalogue proxy preserves safe local variant identity and integer CAD prices", async () => {
  const upstream = { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: false, updatedAt: "2026-08-28T00:00:00.000Z", products: [commerceProduct] };
  const normalized = normalizeCatalogue(upstream); assert.equal(normalized.products[0].price.minUnitAmount, 3050); assert.equal(normalized.products[0].variants[1].unitAmount, 3450); assert.deepEqual(Object.keys(normalized.products[0].variants[0]).sort(), ["availability", "color", "currency", "id", "label", "options", "size", "unitAmount"]);
  assert.doesNotMatch(JSON.stringify(normalized), /printful|legacy|migration|sku|provider/i);
  const response = await proxyCommerceCatalogue({ THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" }, "/api/public/commerce/catalogue", async (url) => { assert.equal(url, "https://thirdrailify-admin.pages.dev/api/public/commerce/catalogue"); return Response.json(upstream); });
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /stale-while-revalidate/); assert.equal((await response.json()).products.length, 1);
  const failed = await proxyCommerceCatalogue({}, "/api/public/commerce/catalogue", async () => { throw new Error("must not fetch"); }); assert.equal(failed.status, 503); assert.equal(failed.headers.get("cache-control"), "no-store");
});

test("replacement storefront source uses product plus variant cart identity and has no runtime Wix fallback", async () => {
  const [providerSource, cartSource] = await Promise.all([import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/lib/catalogueProvider.ts", import.meta.url), "utf8")), import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/store/cart.tsx", import.meta.url), "utf8"))]);
  assert.match(providerSource, /\/api\/commerce\/catalogue/); assert.doesNotMatch(providerSource, /wixSnapshot|legacy-wix-snapshot/);
  assert.match(cartSource, /variantId: string/); assert.match(cartSource, /productId: product\.id, variantId: variant\.id/); assert.doesNotMatch(cartSource, /unitPrice|formattedPrice/);
});
