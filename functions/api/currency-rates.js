const REQUEST_TIMEOUT_MS = 4500;
const CACHE_CONTROL = "public, max-age=14400, s-maxage=14400, stale-while-revalidate=86400";

export async function onRequestGet({ env, data = {} }) {
  try {
    const endpoint = configuredRatesUrl(env?.CURRENCY_RATES_API_URL);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await (data.fetchImpl || fetch)(endpoint, { headers: { Accept: "application/json" }, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("currency_upstream_http_error");
    const payload = normalizeCurrencyRates(await response.json());
    return Response.json(payload, { headers: { "Cache-Control": CACHE_CONTROL, "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const code = error instanceof Error && error.name === "AbortError" ? "currency_rates_timeout" : "currency_rates_unavailable";
    return Response.json({ ok: false, error: code }, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
}

export function configuredRatesUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 1000) throw new Error("currency_rates_not_configured");
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("currency_rates_url_invalid");
  return url.toString();
}

export function normalizeCurrencyRates(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("currency_rates_shape_invalid");
  const base = String(input.base || "").trim().toUpperCase();
  if (base !== "CAD") throw new Error("currency_rates_base_invalid");
  if (!input.rates || typeof input.rates !== "object" || Array.isArray(input.rates)) throw new Error("currency_rates_shape_invalid");
  const rates = { CAD: 1 };
  for (const [rawCode, rawRate] of Object.entries(input.rates)) {
    const code = String(rawCode).toUpperCase();
    const rate = Number(rawRate);
    if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(rate) || rate <= 0) throw new Error("currency_rate_invalid");
    rates[code] = rate;
  }
  const date = input.date == null ? null : String(input.date);
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("currency_rates_date_invalid");
  return { ok: true, base: "CAD", date, rates };
}
