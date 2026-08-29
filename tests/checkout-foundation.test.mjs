import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { onRequestPost as checkoutRequest } from "../functions/api/commerce/checkout.js";
import { onRequestPost as quoteRequest } from "../functions/api/commerce/shipping-quotes.js";
import { normalizeCheckout, normalizeShippingQuote } from "../functions/_shared/commerce-checkout-proxy.js";

const PUBLIC_ORIGIN = "https://thirdrailify.pages.dev";
const ADMIN_ORIGIN = "https://thirdrailify-admin.pages.dev";
const ENV = { THIRDRAILIFY_PUBLIC_ORIGIN: PUBLIC_ORIGIN, THIRDRAILIFY_ADMIN_ORIGIN: ADMIN_ORIGIN };
const quote = {
  ok: true,
  quote: {
    id: "shq_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    expiresAt: "2026-08-29T01:15:00.000Z",
    currency: "CAD",
    subtotalAmount: 3050,
    requiresShipping: true,
    checkoutAvailable: false,
    options: [{ id: "shr_bbbbbbbbbbbbbbbbbbbbbbbb", name: "Standard delivery", amount: 895, currency: "CAD", totalAmount: 3945, delivery: { minDays: 3, maxDays: 7, minDate: null, maxDate: null } }],
  },
};

function request(path, body = { items: [{ productId: "product-1", variantId: "variant-1", quantity: 1 }] }) {
  return new Request(`${PUBLIC_ORIGIN}${path}`, { method: "POST", headers: { Origin: PUBLIC_ORIGIN, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

test("shipping quote proxy preserves exact origin, body, and only a bounded customer projection", async () => {
  let call;
  const response = await quoteRequest({ env: ENV, request: request("/api/commerce/shipping-quotes"), data: { fetchImpl: async (url, init) => { call = { url, init }; return Response.json(quote); } } });
  assert.equal(response.status, 200);
  assert.equal(call.url, `${ADMIN_ORIGIN}/api/commerce/shipping-quotes`);
  assert.equal(call.init.headers.Origin, PUBLIC_ORIGIN);
  assert.equal(call.init.headers.Authorization, undefined);
  const payload = await response.json();
  assert.deepEqual(payload, quote);
  assert.doesNotMatch(JSON.stringify(payload), /printful|providerRateId|variant_id|sync_variant|store_id|recipient/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("commerce POST proxies fail closed for wrong origins, oversized bodies, upstream failures, and malformed authority", async () => {
  let calls = 0;
  const wrongOrigin = new Request(`${PUBLIC_ORIGIN}/api/commerce/shipping-quotes`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal((await quoteRequest({ env: ENV, request: wrongOrigin, data: { fetchImpl: async () => { calls += 1; } } })).status, 403);
  const oversized = new Request(`${PUBLIC_ORIGIN}/api/commerce/shipping-quotes`, { method: "POST", headers: { Origin: PUBLIC_ORIGIN, "Content-Type": "application/json", "Content-Length": "20000" }, body: "{}" });
  assert.equal((await quoteRequest({ env: ENV, request: oversized, data: { fetchImpl: async () => { calls += 1; } } })).status, 413);
  const unavailable = await quoteRequest({ env: ENV, request: request("/api/commerce/shipping-quotes"), data: { fetchImpl: async () => Response.json({ ok: false, error: "shipping_unavailable", message: "Shipping calculation is not available yet." }, { status: 409 }) } });
  assert.equal(unavailable.status, 409); assert.deepEqual(await unavailable.json(), { ok: false, error: "shipping_unavailable", message: "Shipping calculation is not available yet." });
  const malformed = await quoteRequest({ env: ENV, request: request("/api/commerce/shipping-quotes"), data: { fetchImpl: async () => Response.json({ ...quote, quote: { ...quote.quote, options: [{ ...quote.quote.options[0], amount: 1 }] } }) } });
  assert.equal(malformed.status, 503); assert.equal((await malformed.json()).error, "commerce_unavailable");
  assert.equal(calls, 0);
});

test("checkout proxy accepts only a Stripe TEST URL and never returns extra upstream fields", async () => {
  const upstream = { ok: true, orderId: "ord_test_123", sessionId: "cs_test_session_123", checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_session_123", recipient: { address1: "secret" }, provider: "printful" };
  const response = await checkoutRequest({ env: ENV, request: request("/api/commerce/checkout"), data: { fetchImpl: async () => Response.json(upstream) } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, orderId: "ord_test_123", sessionId: "cs_test_session_123", checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_session_123" });
  assert.throws(() => normalizeCheckout({ ...upstream, checkoutUrl: "https://evil.example/checkout" }), /checkout_url_invalid/);
  assert.throws(() => normalizeShippingQuote({ ...quote, quote: { ...quote.quote, checkoutAvailable: "yes" } }), /checkout_state/);
});

test("checkout source keeps delivery ephemeral and derives totals and gates from server responses", async () => {
  const [page, cart, app] = await Promise.all([
    readFile(new URL("../src/pages/CheckoutPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/store/cart.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(app, /path="\/checkout" element=\{<CheckoutPage/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|providerRateId|printful|syncVariant|storeId/i);
  assert.match(page, /quote\.checkoutAvailable/); assert.match(page, /selectedRate\.totalAmount/);
  assert.match(page, /autocomplete/i); assert.match(page, /Request shipping methods/);
  assert.match(cart, /thirdrailify-commerce-cart-v2/); assert.doesNotMatch(cart, /address1|postalCode|recipient/);
});
