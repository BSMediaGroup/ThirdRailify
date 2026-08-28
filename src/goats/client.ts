import type { GoatComment, GoatConfig, GoatListing, GoatListingsPayload, GoatMapFeatureCollection, GoatProduct } from "./types";

export class GoatsClientError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.name = "GoatsClientError"; this.status = status; this.code = code; }
}

export async function getGoatListings(search = "", signal?: AbortSignal) {
  return getJson<GoatListingsPayload>(`/api/goats/listings${search}`, signal);
}
export async function getGoatMap(search = "", signal?: AbortSignal) {
  return getJson<GoatMapFeatureCollection>(`/api/goats/map${search}`, signal);
}
export async function getGoatConfig(signal?: AbortSignal) { return getJson<GoatConfig>("/api/goats/config", signal); }
export async function getGoatProducts(signal?: AbortSignal) { return (await getJson<{ ok: true; products: GoatProduct[] }>("/api/goats/products", signal)).products; }
export async function getGoatListing(slug: string, signal?: AbortSignal) { return (await getJson<{ ok: true; item: GoatListing }>(`/api/goats/listings/${encodeURIComponent(slug)}`, signal)).item; }
export async function getGoatComments(slug: string, sort = "newest", page = 1, signal?: AbortSignal) { return getJson<{ ok: true; items: GoatComment[]; page: number; pageSize: number; total: number }>(`/api/goats/listings/${encodeURIComponent(slug)}/comments?sort=${encodeURIComponent(sort)}&page=${page}&pageSize=20`, signal); }

export async function createGoatDraft(input: Record<string, unknown>) { return writeJson<{ ok: true; draftToken: string; reference: string; expiresAt: string }>("/api/goats/drafts", "POST", input); }
export async function uploadGoatMedia(draftToken: string, file: File, role: "main" | "profile" | "gallery", order = 0) {
  const response = await fetch("/api/goats/drafts/media", { method: "POST", credentials: "include", headers: { "Content-Type": file.type, "X-Goats-Draft-Token": draftToken, "X-Goats-Media-Role": role, "X-Goats-Media-Order": String(order) }, body: file, cache: "no-store" });
  return responseJson<{ ok: true; media: { id: string } }>(response);
}
export async function finaliseGoatDraft(input: Record<string, unknown>) { return writeJson<{ ok: true; reference: string; status: "pending"; emailQueued: boolean }>("/api/goats/drafts/finalise", "POST", input); }
export async function reactToGoat(slug: string, value: -1 | 1, csrfToken: string) { return writeJson<{ ok: true; likes: number; dislikes: number; currentReaction: number; pendingApproval?: boolean }>(`/api/goats/listings/${encodeURIComponent(slug)}/reaction`, "POST", { value }, csrfToken); }
export async function postGoatComment(slug: string, body: string, csrfToken: string) { return writeJson<{ ok: true; item: GoatComment | null; pendingApproval?: boolean }>(`/api/goats/listings/${encodeURIComponent(slug)}/comments`, "POST", { body }, csrfToken); }
export async function deleteGoatComment(id: string, csrfToken: string) { return writeJson<{ ok: true }>(`/api/goats/comments/${encodeURIComponent(id)}`, "DELETE", {}, csrfToken); }

async function getJson<T>(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, credentials: "include", signal });
  return responseJson<T>(response);
}
async function writeJson<T>(url: string, method: "POST" | "DELETE", body: Record<string, unknown>, csrfToken = "") {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(url, { method, credentials: "include", headers, body: JSON.stringify(body), cache: "no-store" });
  return responseJson<T>(response);
}
async function responseJson<T>(response: Response) {
  const payload = await response.json().catch(() => null) as (T & { error?: string; message?: string }) | null;
  if (!response.ok || !payload) throw new GoatsClientError(response.status, payload?.error || "community_unavailable", payload?.message || "The GOATS service is unavailable.");
  return payload;
}
