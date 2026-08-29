import { useCallback, useEffect, useState } from "react";
import type { AccountCommerceOverview, AccountOrderDetail, AddressInput } from "./types";

export class AccountCommerceError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) { super(message); this.name = "AccountCommerceError"; this.status = status; this.code = code; }
}

export function useAccountCommerce(enabled: boolean) {
  const [data, setData] = useState<AccountCommerceOverview | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!enabled) { setData(null); setLoading(false); return; }
    setLoading(true);
    try { setData(await fetchAccountCommerce()); setError(""); }
    catch (reason) { setData(null); setError(reason instanceof Error ? reason.message : "Account commerce is unavailable."); }
    finally { setLoading(false); }
  }, [enabled]);
  useEffect(() => { const controller = new AbortController(); if (!enabled) { setData(null); setLoading(false); return () => controller.abort(); } setLoading(true); fetchAccountCommerce(controller.signal).then((value) => { setData(value); setError(""); }).catch((reason) => { if (reason?.name !== "AbortError") { setData(null); setError(reason instanceof Error ? reason.message : "Account commerce is unavailable."); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [enabled]);
  return { data, loading, error, refresh };
}

export function fetchAccountCommerce(signal?: AbortSignal) {
  return accountFetch<AccountCommerceOverview>("/api/account/commerce", { method: "GET", signal });
}

export function fetchAccountOrders(signal?: AbortSignal) {
  return accountFetch<{ ok: true; orders: AccountCommerceOverview["orders"]; total: number; liveCount: number; testCount: number }>("/api/account/commerce/orders", { method: "GET", signal });
}

export function fetchAccountOrder(orderId: string, signal?: AbortSignal) {
  return accountFetch<{ ok: true; order: AccountOrderDetail }>(`/api/account/commerce/orders/${encodeURIComponent(orderId)}`, { method: "GET", signal });
}

export function updateAccountContact(csrfToken: string, input: { name: string; phone: string; revision: number }) {
  return mutation("/api/account/commerce/contact", "PATCH", csrfToken, input);
}

export function createAccountAddress(csrfToken: string, input: AddressInput) {
  return mutation("/api/account/commerce/addresses", "POST", csrfToken, input);
}

export function updateAccountAddress(csrfToken: string, addressId: string, input: AddressInput & { revision: number }) {
  return mutation(`/api/account/commerce/addresses/${encodeURIComponent(addressId)}`, "PATCH", csrfToken, input);
}

export function deleteAccountAddress(csrfToken: string, addressId: string) {
  return mutation(`/api/account/commerce/addresses/${encodeURIComponent(addressId)}`, "DELETE", csrfToken, {});
}

export function setDefaultAccountAddress(csrfToken: string, addressId: string) {
  return mutation(`/api/account/commerce/addresses/${encodeURIComponent(addressId)}/default`, "POST", csrfToken, {});
}

function mutation(path: string, method: "POST" | "PATCH" | "DELETE", csrfToken: string, input: object) {
  return accountFetch<AccountCommerceOverview>(path, { method, credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(input) });
}

async function accountFetch<T>(input: RequestInfo | URL, init: RequestInit) {
  const response = await fetch(input, { ...init, cache: "no-store", credentials: "include" });
  const payload = await response.json().catch(() => null) as (T & { error?: string; message?: string }) | null;
  if (!response.ok || !payload) throw new AccountCommerceError(response.status, payload?.error || "account_commerce_unavailable", payload?.message || "Account commerce is unavailable.");
  return payload;
}
