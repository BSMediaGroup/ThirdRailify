const TIMEOUT_MS = 3500;

export async function onRequestGet({ env, data = {} }) {
  try {
    const origin = adminOrigin(env?.THIRDRAILIFY_ADMIN_ORIGIN); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response; try { response = await (data.fetchImpl || fetch)(`${origin}/api/gaming/rotation`, { headers: { Accept: "application/json" }, signal: controller.signal }); } finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error("upstream_unavailable"); const payload = normalizeGamingRotation(await response.json());
    return Response.json(payload, { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=600", "X-Content-Type-Options": "nosniff" } });
  } catch { return Response.json({ ok: false, error: "gaming_rotation_unavailable", message: "Current Rotation is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
}

export function normalizeGamingRotation(input) {
  if (!input || input.ok !== true || input.schema !== "thirdrailify-gaming-rotation-v1" || !Array.isArray(input.items)) throw new Error("gaming_rotation_invalid");
  const items = input.items.map((item, index) => normalizeItem(item, index)); const ids = new Set(); const positions = new Set();
  for (const item of items) { if (ids.has(item.id) || positions.has(item.position)) throw new Error("gaming_rotation_duplicate"); ids.add(item.id); positions.add(item.position); }
  items.sort((a, b) => a.position - b.position);
  return { ok: true, schema: input.schema, items, updatedAt: typeof input.updatedAt === "string" ? input.updatedAt.slice(0, 40) : null };
}
function normalizeItem(item, index) { const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : ""; const id = text(item?.id, 120); const title = text(item?.title, 120); const position = Number(item?.position); if (!id || !title || !Number.isInteger(position) || position < 1 || position > 1000) throw new Error(`gaming_item_invalid_${index}`); const artworkUrl = httpsUrl(item.artworkUrl); let steam = null; if (item.steam) { const appId = text(item.steam.appId, 20); const storeUrl = httpsUrl(item.steam.storeUrl); if (!/^\d{1,12}$/.test(appId) || !storeUrl || new URL(storeUrl).hostname !== "store.steampowered.com" || !new URL(storeUrl).pathname.startsWith(`/app/${appId}/`)) throw new Error("gaming_steam_invalid"); steam = { appId, storeUrl }; } return { id, title, platform: text(item.platform, 80), description: text(item.description, 600), genre: text(item.genre, 120), artworkUrl, steam, position }; }
function httpsUrl(value) { if (!value) return null; try { const url = new URL(String(value)); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null; } catch { return null; } }
function adminOrigin(value) { const url = new URL(String(value || "")); if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("admin_origin_invalid"); return url.origin; }
