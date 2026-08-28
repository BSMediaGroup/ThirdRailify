import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeOrderStatus, proxyCommerceOrderStatus } from "../functions/_shared/commerce-order-status-proxy.js";
import { onRequestGet as orderStatusRequest } from "../functions/api/commerce/order-status.js";

const SESSION_ID = "cs_test_safe_status_001";
const upstream = { ok: true, order: { reference: "ord_safe_001", paymentStatus: "pending", orderStatus: "checkout_created", fulfillmentStatus: "disabled", amount: 1500, currency: "CAD" } };

test("safe order-status proxy requires one opaque TEST Session and cannot enumerate orders", async () => {
  const env = { THIRDRAILIFY_ADMIN_ORIGIN: "https://thirdrailify-admin.pages.dev" };
  const calls = [];
  const response = await orderStatusRequest({
    request: new Request(`https://thirdrailify.pages.dev/api/commerce/order-status?session_id=${SESSION_ID}`),
    env,
    data: { fetchImpl: async (url, init) => { calls.push({ url, init }); return Response.json(upstream); } },
  });
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls[0].url, `https://thirdrailify-admin.pages.dev/api/public/commerce/order-status?session_id=${SESSION_ID}`);
  assert.deepEqual(await response.json(), upstream);
  const missing = await proxyCommerceOrderStatus(env, "", async () => { throw new Error("must not fetch"); }); assert.equal(missing.status, 400);
  const live = await proxyCommerceOrderStatus(env, "cs_live_forbidden", async () => { throw new Error("must not fetch"); }); assert.equal(live.status, 400);
  const unknown = await proxyCommerceOrderStatus(env, "cs_test_unknown", async () => Response.json({ ok: false }, { status: 404 })); assert.equal(unknown.status, 404);
});

test("status normalization exposes only bounded payment state and rejects provider internals", () => {
  assert.deepEqual(normalizeOrderStatus(upstream), upstream);
  assert.throws(() => normalizeOrderStatus({ ...upstream, order: { ...upstream.order, fulfillmentStatus: "submitted" } }));
  assert.throws(() => normalizeOrderStatus({ ...upstream, order: { ...upstream.order, currency: "USD" } }));
  assert.throws(() => normalizeOrderStatus({ ...upstream, order: { ...upstream.order, stripePaymentIntentId: "pi_secret", reference: "bad reference" } }));
  assert.deepEqual(Object.keys(normalizeOrderStatus({ ...upstream, order: { ...upstream.order, internalAccountId: "private", audit: ["private"], printfulMapping: "private" } }).order).sort(), ["amount", "currency", "fulfillmentStatus", "orderStatus", "paymentStatus", "reference"]);
});

test("success page checks the server projection and never treats the query string as payment authority", async () => {
  const source = await readFile(new URL("../src/pages/CheckoutSuccessPage.tsx", import.meta.url), "utf8");
  assert.match(source, /fetch\(`\/api\/commerce\/order-status\?session_id=/);
  assert.match(source, /payload\.order\.paymentStatus === "paid"/);
  assert.match(source, /signed webhook/);
  assert.doesNotMatch(source, /searchParams\.get\("(?:paid|payment_status|success)"\)/);
  assert.doesNotMatch(source, /api\.stripe\.com|payment_intent/);
});
