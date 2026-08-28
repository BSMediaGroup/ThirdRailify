import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { resolveInitialCurrency } from "./math.js";
import { usePrivacy } from "../privacy/PrivacyProvider";

type RatesPayload = { ok: true; base: "CAD"; date: string | null; rates: Record<string, number> };
type CurrencyContextValue = {
  currency: string; currencies: string[]; rates: Record<string, number> | null; date: string | null;
  status: "loading" | "ready" | "stale" | "unavailable"; setCurrency: (currency: string) => void;
};

const STORAGE_KEY = "thirdrailify.storefront.currency.v1";
const CACHE_KEY = "thirdrailify.storefront.currency-rates.v1";
const COMMON = ["USD", "AUD", "EUR", "GBP", "NZD", "JPY", "CAD"];
const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function cleanCode(value: string | null) { const code = String(value || "").toUpperCase(); return /^[A-Z]{3}$/.test(code) ? code : ""; }
function initialCurrency(allowStoredPreference: boolean) {
  const query = new URL(window.location.href).searchParams.get("currency");
  try { return resolveInitialCurrency(query, allowStoredPreference ? localStorage.getItem(STORAGE_KEY) : null); } catch { return resolveInitialCurrency(query, null); }
}
function cachedRates(allowStoredPreference: boolean): RatesPayload | null {
  if (!allowStoredPreference) return null;
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "null") as RatesPayload;
    return validPayload(value) ? value : null;
  } catch { return null; }
}
function validPayload(value: unknown): value is RatesPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<RatesPayload>;
  return payload.ok === true && payload.base === "CAD" && Boolean(payload.rates) && Object.entries(payload.rates || {}).every(([code, rate]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) && payload.rates?.CAD === 1;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { categories } = usePrivacy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currency, setCurrencyState] = useState(() => initialCurrency(categories.preferences));
  const cached = useMemo(() => cachedRates(categories.preferences), [categories.preferences]);
  const [payload, setPayload] = useState<RatesPayload | null>(cached);
  const [status, setStatus] = useState<CurrencyContextValue["status"]>(cached ? "stale" : "loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/currency-rates", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => { if (!response.ok) throw new Error("rates unavailable"); return response.json(); })
      .then((value: unknown) => {
        if (!validPayload(value)) throw new Error("rates invalid");
        setPayload(value); setStatus("ready");
        if (categories.preferences) try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch { /* preference cache is optional */ }
      })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setStatus(cached ? "stale" : "unavailable"); });
    return () => controller.abort();
  }, [cached, categories.preferences]);

  const currencies = useMemo(() => {
    const available = payload ? Object.keys(payload.rates) : COMMON;
    return [...COMMON.filter((code) => available.includes(code)), ...available.filter((code) => !COMMON.includes(code)).sort()];
  }, [payload]);
  useEffect(() => {
    if (payload && !payload.rates[currency]) setCurrencyState(payload.rates.USD ? "USD" : "CAD");
  }, [currency, payload]);
  useEffect(() => {
    const queryCurrency = cleanCode(searchParams.get("currency"));
    if (queryCurrency && queryCurrency !== currency && (!payload || payload.rates[queryCurrency])) {
      setCurrencyState(queryCurrency);
      if (categories.preferences) try { localStorage.setItem(STORAGE_KEY, queryCurrency); } catch { /* preference persistence is optional */ }
    }
  }, [categories.preferences, currency, payload, searchParams]);

  const setCurrency = useCallback((nextValue: string) => {
    const next = cleanCode(nextValue);
    if (!next || (payload && !payload.rates[next])) return;
    setCurrencyState(next);
    if (categories.preferences) try { localStorage.setItem(STORAGE_KEY, next); } catch { /* preference persistence is optional */ }
    const nextSearch = new URLSearchParams(searchParams); nextSearch.set("currency", next);
    setSearchParams(nextSearch, { replace: true });
  }, [categories.preferences, payload, searchParams, setSearchParams]);
  const value = useMemo(() => ({ currency, currencies, rates: payload?.rates || null, date: payload?.date || null, status, setCurrency }), [currency, currencies, payload, setCurrency, status]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// The provider and its consumer hook intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() { const value = useContext(CurrencyContext); if (!value) throw new Error("useCurrency must be used inside CurrencyProvider"); return value; }
