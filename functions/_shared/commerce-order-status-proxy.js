const TIMEOUT_MS = 5000;

export async function proxyCommerceOrderStatus(env, rawSessionId, fetchImpl = fetch) {
  const sessionId = safeSessionId(rawSessionId);
  if (!sessionId) return failure(400, "checkout_session_id_invalid", "A valid Stripe TEST Checkout Session identifier is required.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const adminOrigin = configuredAdminOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN);
    const response = await fetchImpl(`${adminOrigin}/api/public/commerce/order-status?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Accept: "application/json" },
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status === 404) return failure(404, "checkout_order_not_found", "Payment has not been confirmed for this Session.");
    if (!response.ok) throw new Error("status_upstream_unavailable");
    return Response.json(normalizeOrderStatus(await response.json()), { headers: noStoreHeaders() });
  } catch {
    return failure(503, "checkout_status_unavailable", "Checkout status is temporarily unavailable.");
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeOrderStatus(input) {
  const order = input?.order;
  const reference = boundedText(order?.reference, 160);
  const paymentStatus = new Set(["pending", "paid", "not_confirmed"]).has(order?.paymentStatus) ? order.paymentStatus : "";
  const orderStatus = boundedText(order?.orderStatus, 40);
  const fulfillmentStatus = boundedText(order?.fulfillmentStatus, 40);
  const amount = Number(order?.amount);
  if (input?.ok !== true || !/^ord_[A-Za-z0-9_-]+$/.test(reference) || !paymentStatus || !orderStatus || fulfillmentStatus !== "disabled" || !Number.isSafeInteger(amount) || amount < 1 || order?.currency !== "CAD") {
    throw new Error("checkout_status_invalid");
  }
  return { ok: true, order: { reference, paymentStatus, orderStatus, fulfillmentStatus: "disabled", amount, currency: "CAD" } };
}

function safeSessionId(value) {
  const id = boundedText(value, 255);
  return /^cs_test_[A-Za-z0-9_]+$/.test(id) ? id : "";
}

function configuredAdminOrigin(value) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("admin_origin_invalid");
  return url.origin;
}

function boundedText(value, maximum) {
  return String(value ?? "").trim().slice(0, maximum);
}

function failure(status, error, message) {
  return Response.json({ ok: false, error, message }, { status, headers: noStoreHeaders() });
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
}
