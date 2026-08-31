export type GameSuggestionInput = {
  gameTitle: string;
  steamUrl: string;
  pitch: string;
  website: string;
  turnstileToken: string;
};

export type GameSuggestionReceipt = {
  ok: true;
  reference: string;
  message: string;
};

export function normalizeSteamStoreUrl(value: string): string {
  const source = value.trim();
  if (!source) return "";
  try {
    const url = new URL(source);
    const match = url.pathname.match(/^\/app\/(\d{1,10})(?:\/[A-Za-z0-9_-]+)?\/?$/);
    if (url.protocol !== "https:" || url.hostname !== "store.steampowered.com" || url.username || url.password || url.port || !match) return "";
    return `https://store.steampowered.com/app/${match[1]}/`;
  } catch {
    return "";
  }
}

export function steamSearchUrl(title: string) {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(title.trim())}`;
}

export async function submitGameSuggestion(input: GameSuggestionInput, csrfToken = "") {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch("/api/gaming/suggestions", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers,
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null) as (GameSuggestionReceipt & { error?: string }) | null;
  if (!response.ok || !body?.ok) throw new Error(body?.message || "The request signal could not be sent. Try again.");
  return body;
}

