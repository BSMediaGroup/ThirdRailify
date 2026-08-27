import assert from "node:assert/strict";
import test from "node:test";
import { configuredRatesUrl, normalizeCurrencyRates, onRequestGet as currencyRatesRequest } from "../functions/api/currency-rates.js";
import { normalizeMerchandising, onRequestGet as merchandisingRequest } from "../functions/api/catalogue/merchandising.js";
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
