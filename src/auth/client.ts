import { AuthClientError, type AuthConfig, type SessionPayload } from "./types";

const OAUTH_ORIGINS = new Set(["https://discord.com", "https://accounts.google.com", "https://github.com", "https://x.com"]);

export function adminAuthOrigin() {
  const configured = String(import.meta.env.VITE_THIRDRAILIFY_ADMIN_ORIGIN || "").trim();
  const candidate = configured || inferredAdminOrigin();
  const url = new URL(candidate);
  const local = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  const known = url.protocol === "https:" && (url.hostname === "admin.thirdrailify.com" || url.hostname === "thirdrailify-admin.pages.dev");
  if (!local && !known) throw new AuthClientError(503, "auth_origin_invalid", "The account service origin is not configured safely.");
  return url.origin;
}

function inferredAdminOrigin() {
  if (window.location.hostname === "thirdrailify.com" || window.location.hostname === "www.thirdrailify.com") {
    return "https://admin.thirdrailify.com";
  }
  if (window.location.hostname.endsWith(".pages.dev")) return "https://thirdrailify-admin.pages.dev";
  return "http://127.0.0.1:5174";
}

export async function fetchAuthConfig(signal?: AbortSignal) {
  return fetchJson<AuthConfig>(`${adminAuthOrigin()}/api/auth/config`, { method: "GET", credentials: "omit", signal });
}

export async function fetchSession(signal?: AbortSignal) {
  return fetchJson<SessionPayload>("/api/auth/session", { method: "GET", credentials: "include", signal });
}

export async function submitAuthority(path: string, body: Record<string, unknown>) {
  return fetchJson<SessionPayload & { authorizationUrl?: string }>(`${adminAuthOrigin()}/api/auth/${path}`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function consumePublicHandoff(code: string) {
  return fetchJson<SessionPayload>("/api/auth/handoff", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export async function endSession(csrfToken: string) {
  return fetchJson<SessionPayload>("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: "{}",
  });
}

export async function createAdminTransfer(csrfToken: string, returnTo = "/") {
  return fetchJson<{ ok: true; handoffUrl: string; returnTo: string }>("/api/auth/transfer", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ returnTo }),
  });
}

export function validatedAdminTransferUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== adminAuthOrigin() || !url.searchParams.get("handoff")) {
    throw new AuthClientError(502, "handoff_url_invalid", "The account service returned an invalid Admin handoff.");
  }
  return url.toString();
}

export async function updateDisplayName(csrfToken: string, displayName: string) {
  return fetchJson<SessionPayload>("/api/auth/profile", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ displayName }),
  });
}

export async function uploadAvatar(csrfToken: string, file: File) {
  const body = new FormData();
  body.set("avatar", file);
  return fetchJson<SessionPayload>("/api/auth/avatar", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken },
    body,
  });
}

export async function importAvatarUrl(csrfToken: string, imageUrl: string) {
  return fetchJson<SessionPayload>("/api/auth/avatar", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ imageUrl }),
  });
}

export function validatedAuthorizationUrl(value: string) {
  const url = new URL(value);
  if (!OAUTH_ORIGINS.has(url.origin) || url.protocol !== "https:") {
    throw new AuthClientError(502, "oauth_url_invalid", "The account provider returned an invalid authorization URL.");
  }
  return url.toString();
}

async function fetchJson<T>(input: RequestInfo | URL, init: RequestInit) {
  const response = await fetch(input, { ...init, cache: "no-store", redirect: "error" });
  const payload = await response.json().catch(() => null) as (T & { error?: string; message?: string }) | null;
  if (!response.ok || !payload) {
    throw new AuthClientError(response.status, payload?.error || "auth_unavailable", payload?.message || "The account service is unavailable.");
  }
  return payload;
}
