// Public place names only: no customer identity, street address, or coordinates.
export async function onRequest({ request, data }) {
  if (request.method !== "GET") return json({ ok: false }, 405, { Allow: "GET" });
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") || "").trim();
  const country = (params.get("country") || "").toUpperCase();
  const region = (params.get("region") || "").trim();
  // eslint-disable-next-line no-control-regex -- Reject control characters in provider queries.
  if (!/^[A-Z]{2}$/.test(country) || query.length > 120 || region.length > 100 || /[\u0000-\u001f\u007f]/.test(query + region)) return json({ ok: false }, 400);
  if (query.length < 3) return json({ ok: true, results: [] });
  const target = new URL("https://photon.komoot.io/api/");
  target.search = new URLSearchParams({ q: [query, region].filter(Boolean).join(", "), countrycode: country, limit: "12", lang: "en" }).toString();
  for (const layer of ["city", "district", "locality"]) target.searchParams.append("layer", layer);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await (data?.localityFetch || fetch)(target.toString(), {
      headers: { Accept: "application/json" }, signal: controller.signal,
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!response.ok) throw new Error("lookup unavailable");
    const payload = await response.json();
    if (!Array.isArray(payload?.features)) throw new Error("invalid lookup");
    const results = [];
    const seen = new Set();
    for (const feature of payload.features.slice(0, 24)) {
      const p = feature?.properties || {};
      if (String(p.countrycode || "").toUpperCase() !== country) continue;
      // Keep the suburb's own name, rather than replacing it with its parent city.
      if (!["city", "district", "locality"].includes(p.type)) continue;
      if (p.osm_key !== "place" && !(p.osm_key === "boundary" && p.osm_value === "administrative" && p.type !== "locality")) continue;
      const city = clean(p.name);
      const state = clean(p.state);
      if (!city) continue;
      const key = `${city.toLowerCase()}|${state.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ city, region: state, countryCode: country });
      if (results.length === 8) break;
    }
    return json({ ok: true, results });
  } catch {
    return json({ ok: false, message: "Suggestions are unavailable. You can still enter your city or locality." }, 503);
  } finally { clearTimeout(timeout); }
}

// eslint-disable-next-line no-control-regex -- Sanitize external place labels.
function clean(value) { return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) : ""; }
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}
