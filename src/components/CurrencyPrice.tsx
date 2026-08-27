import { useCurrency } from "../currency/CurrencyProvider";
import { convertCad, formatMoney } from "../currency/math.js";

export function CurrencySelect({ compact = false }: { compact?: boolean }) {
  const { currency, currencies, setCurrency, status, date } = useCurrency();
  return <label className={`currency-select${compact ? " currency-select--compact" : ""}`}><span>Display currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)} aria-describedby="currency-rate-status">{currencies.map((code) => <option key={code} value={code}>{code}</option>)}</select><small id="currency-rate-status">{status === "loading" ? "Loading reference rates" : status === "unavailable" ? "Conversions unavailable" : `${status === "stale" ? "Cached" : "Reference"} rates${date ? ` · ${date}` : ""}`}</small></label>;
}

export function ProductPrice({ price, formattedPrice, prominent = false }: { price: number; formattedPrice: string; prominent?: boolean }) {
  const { currency, rates, status } = useCurrency();
  const converted = currency === "CAD" ? null : convertCad(price, currency, rates);
  return <div className={`commerce-price${prominent ? " commerce-price--prominent" : ""}`}><strong>{Number.isFinite(price) && price >= 0 ? `${formattedPrice} CAD` : "Price unavailable"}</strong>{converted !== null ? <span>≈ {formatMoney(converted, currency)} {currency}</span> : currency !== "CAD" && status === "unavailable" ? <span>Approximate conversion unavailable</span> : null}</div>;
}

export function CurrencyDisclaimer() { return <p className="currency-disclaimer">Approximate conversion using reference exchange rates. Base prices and checkout remain in CAD. Taxes, provider conversion rates, and card fees may differ.</p>; }
