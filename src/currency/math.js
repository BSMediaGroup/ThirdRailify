/** @param {number} cadAmount @param {string} currency @param {Record<string, number> | null} rates */
export function convertCad(cadAmount, currency, rates) {
  if (!Number.isFinite(cadAmount) || cadAmount < 0 || !rates || !Number.isFinite(rates[currency]) || rates[currency] <= 0) return null;
  const cents = Math.round(cadAmount * 100);
  return (cents * rates[currency]) / 100;
}

/** @param {number} amount @param {string} currency */
export function formatMoney(amount, currency) {
  return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
}

/** @param {string | null} queryValue @param {string | null} storedValue */
export function resolveInitialCurrency(queryValue, storedValue) {
  const query = String(queryValue || "").toUpperCase();
  if (/^[A-Z]{3}$/.test(query)) return query;
  const stored = String(storedValue || "").toUpperCase();
  return /^[A-Z]{3}$/.test(stored) ? stored : "USD";
}
