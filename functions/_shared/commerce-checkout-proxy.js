const MAX_BODY_BYTES = 16 * 1024;
const TIMEOUT_MS = 15_000;

export async function proxyCommercePost(env, request, path, fetchImpl = fetch) {
  if (request.method !== "POST") return failure(405, "method_not_allowed", "This method is not allowed.", { Allow: "POST" });
  const publicOrigin = configuredOrigin(env?.THIRDRAILIFY_PUBLIC_ORIGIN, "public_origin_invalid");
  const requestOrigin = safeOrigin(request.headers.get("Origin"));
  if (!requestOrigin || requestOrigin !== publicOrigin) return failure(403, "origin_not_allowed", "This request origin is not allowed.");
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return failure(413, "request_too_large", "The checkout request is too large.");
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) return failure(413, "request_too_large", "The checkout request is too large.");
  try { JSON.parse(body); } catch { return failure(400, "invalid_json", "The request body must be valid JSON."); }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const adminOrigin = configuredOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN, "admin_origin_invalid");
    const response = await fetchImpl(`${adminOrigin}${path}`, {
      method: "POST", redirect: "manual", signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", Origin: publicOrigin }, body,
    });
    let payload;
    try { payload = await response.json(); } catch { throw new Error("upstream_json_invalid"); }
    if (!response.ok) return failure(response.status >= 400 && response.status < 500 ? response.status : 503, safeCode(payload?.error) || "commerce_unavailable", safeMessage(payload?.message) || "Commerce is temporarily unavailable.");
    const normalized = path.endsWith("shipping-quotes") ? normalizeShippingQuote(payload) : normalizeCheckout(payload);
    return Response.json(normalized, { status: response.status, headers: noStoreHeaders() });
  } catch {
    return failure(503, "commerce_unavailable", "Commerce is temporarily unavailable.");
  } finally { clearTimeout(timeout); }
}

export function normalizeShippingQuote(input) {
  const quote = input?.quote;
  const id = boundedText(quote?.id, 80);
  const expiresAt = boundedText(quote?.expiresAt, 80);
  const subtotalAmount = money(quote?.subtotalAmount, 1);
  if (input?.ok !== true || !/^shq_[0-9a-f-]{36}$/.test(id) || quote?.currency !== "CAD" || !Number.isFinite(Date.parse(expiresAt)) || typeof quote?.requiresShipping !== "boolean" || !Array.isArray(quote?.options) || !quote.options.length || quote.options.length > 20) throw new Error("quote_invalid");
  if (typeof quote.checkoutAvailable !== "boolean") throw new Error("quote_checkout_state_invalid");
  return { ok: true, quote: { id, expiresAt, currency: "CAD", subtotalAmount, requiresShipping: quote.requiresShipping, checkoutAvailable: quote.checkoutAvailable, options: quote.options.map((option) => {
    const optionId = boundedText(option?.id, 40); const name = boundedText(option?.name, 100); const amount = money(option?.amount, 0); const totalAmount = money(option?.totalAmount, 1);
    if (!/^shr_[0-9a-f]{24}$/.test(optionId) || !name || hasUnsafeText(name) || option?.currency !== "CAD" || totalAmount !== subtotalAmount + amount) throw new Error("quote_option_invalid");
    const delivery = option.delivery === null ? null : normalizeDeliveryEstimate(option.delivery);
    return { id: optionId, name, amount, currency: "CAD", totalAmount, delivery };
  }) } };
}

export function normalizeCheckout(input) {
  const orderId = boundedText(input?.orderId, 160); const sessionId = boundedText(input?.sessionId, 255); const checkoutUrl = boundedText(input?.checkoutUrl, 2048);
  if (input?.ok !== true || !/^ord_[A-Za-z0-9_-]+$/.test(orderId) || !/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("checkout_invalid");
  const url = new URL(checkoutUrl);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com" || url.username || url.password) throw new Error("checkout_url_invalid");
  return { ok: true, orderId, sessionId, checkoutUrl: url.toString() };
}

function normalizeDeliveryEstimate(value) { const result = { minDays: optionalInteger(value?.minDays, 1, 365), maxDays: optionalInteger(value?.maxDays, 1, 365), minDate: isoDate(value?.minDate), maxDate: isoDate(value?.maxDate) }; if (Object.values(result).every((item) => item === null)) throw new Error("delivery_estimate_invalid"); return result; }
function configuredOrigin(value, code) { const url = new URL(String(value || "")); if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error(code); return url.origin; }
function safeOrigin(value) { try { return new URL(String(value || "")).origin; } catch { return ""; } }
function safeCode(value) { const code = boundedText(value, 80); return /^[a-z][a-z0-9_]{1,79}$/.test(code) ? code : ""; }
function safeMessage(value) { const message = boundedText(value, 240); return message && !hasUnsafeText(message) ? message : ""; }
function hasUnsafeText(value) { return [...value].some((character) => { const code = character.charCodeAt(0); return character === "<" || character === ">" || code <= 31 || code === 127; }); }
function boundedText(value, maximum) { return String(value ?? "").trim().slice(0, maximum); }
function money(value, minimum) { const amount = Number(value); if (!Number.isSafeInteger(amount) || amount < minimum || amount > 2_147_483_647) throw new Error("money_invalid"); return amount; }
function optionalInteger(value, minimum, maximum) { if (value === null || value === undefined) return null; const number = Number(value); if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw new Error("integer_invalid"); return number; }
function isoDate(value) { if (value === null || value === undefined) return null; const date = boundedText(value, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error("date_invalid"); return date; }
function failure(status, error, message, extraHeaders = {}) { return Response.json({ ok: false, error, message }, { status, headers: { ...noStoreHeaders(), ...extraHeaders } }); }
function noStoreHeaders() { return { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }; }
