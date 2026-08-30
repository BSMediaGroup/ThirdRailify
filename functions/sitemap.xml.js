import { proxyCommerceCatalogue } from "./_shared/commerce-catalogue-proxy.js";
import { readWatchArchive } from "./api/_state-backend.js";
import { episodeListPayload } from "./api/watch/_episodes.js";
import { proxyRead as proxyGoatsRead } from "./api/goats/[[path]].js";
import { proxyRead as proxyWheelsRead } from "./api/wheels/[[path]].js";
import { staticSitemapPaths } from "../seo/site-seo.js";

export async function onRequest(context) {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  const origin = publicOrigin(context.env, new URL(context.request.url));
  const dynamic = context.data?.seoSitemapData || await loadDynamicEntries(context);
  const entries = [
    ...staticSitemapPaths().map((path) => ({ path })),
    ...(dynamic.collections || []).map((collection) => ({ path: `/products/${collection.slug}`, lastmod: collection.updatedAt })),
    ...(dynamic.products || []).map((product) => ({ path: `/shop/${product.slug}`, lastmod: product.updatedAt, image: product.images?.[0], imageTitle: product.title })),
    ...(dynamic.episodes || []).map((episode) => ({ path: `/watch/v/${episode.id}`, lastmod: episode.archiveDate, image: episode.thumbnailUrl, imageTitle: episode.title })),
    ...(dynamic.goats || []).map((goat) => ({ path: `/goats/${goat.slug}`, lastmod: goat.publishedAt, image: goat.media?.main?.url || goat.media?.profile?.url || goat.product?.image, imageTitle: `${goat.displayName} · GOATS in the Wild` })),
  ];
  entries.push(...(dynamic.wheels || []).map((wheel) => ({ path: `/wheels/${wheel.slug}` })));
  entries.push(...(dynamic.stages || []).map((stage) => ({ path: `/wheels/stages/${stage.slug}`, lastmod: stage.updatedAt })));
  const xml = renderSitemap(origin, entries);
  return new Response(context.request.method === "HEAD" ? null : xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600", "X-Content-Type-Options": "nosniff" } });
}

export function renderSitemap(originValue, entries) {
  const origin = new URL(originValue).origin;
  const unique = new Map();
  for (const entry of entries) {
    const path = validPath(entry?.path);
    if (!path || unique.has(path)) continue;
    unique.set(path, { ...entry, path });
  }
  const urls = [...unique.values()].map((entry) => {
    const location = new URL(entry.path, `${origin}/`).href;
    const lastmod = validDate(entry.lastmod);
    const image = safeImage(entry.image, origin);
    return [
      "  <url>",
      `    <loc>${xml(location)}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
      image ? `    <image:image><image:loc>${xml(image)}</image:loc>${entry.imageTitle ? `<image:title>${xml(String(entry.imageTitle).slice(0, 180))}</image:title>` : ""}</image:image>` : "",
      "  </url>",
    ].filter(Boolean).join("\n");
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;
}

async function loadDynamicEntries(context) {
  const [commerce, episodes, goats, wheels, stages] = await Promise.allSettled([
    loadCommerce(context),
    loadEpisodes(context),
    loadGoats(context),
    loadWheels(context),
    loadStages(context),
  ]);
  return {
    collections: commerce.status === "fulfilled" ? commerce.value.collections : [],
    products: commerce.status === "fulfilled" ? commerce.value.products : [],
    episodes: episodes.status === "fulfilled" ? episodes.value : [],
    goats: goats.status === "fulfilled" ? goats.value : [],
    wheels: wheels.status === "fulfilled" ? wheels.value : [],
    stages: stages.status === "fulfilled" ? stages.value : [],
  };
}

async function loadCommerce(context) {
  const response = await proxyCommerceCatalogue(context.env, "/api/public/commerce/catalogue", context.data?.commerceFetch || fetch);
  if (!response.ok) throw new Error("commerce_unavailable");
  const payload = await response.json();
  return { collections: Array.isArray(payload.collections) ? payload.collections : [], products: Array.isArray(payload.products) ? payload.products : [] };
}

async function loadEpisodes(context) {
  return episodeListPayload(context.data?.seoWatchArchive || await readWatchArchive(context.env)).items;
}

async function loadGoats(context) {
  const items = [];
  for (let page = 1; page <= 20; page += 1) {
    const request = new Request(new URL(`/api/goats/listings?page=${page}&pageSize=100`, context.request.url), { headers: { Accept: "application/json" } });
    const response = await proxyGoatsRead(request, context.env, "listings", context.data?.goatsFetch || fetch);
    if (!response.ok) throw new Error("goats_unavailable");
    const payload = await response.json();
    const next = Array.isArray(payload.items) ? payload.items : [];
    items.push(...next);
    if (!next.length || items.length >= Number(payload.total || 0)) break;
  }
  return items;
}

async function loadWheels(context) {
  const request = new Request(new URL("/api/wheels?sort=recent", context.request.url), { headers: { Accept: "application/json" } });
  const response = await proxyWheelsRead(request, context.env, "", context.data?.wheelsFetch || fetch);
  if (!response.ok) throw new Error("wheels_unavailable");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

async function loadStages(context) {
  const request = new Request(new URL("/api/wheels/stages?view=public&sort=recent", context.request.url), { headers: { Accept: "application/json" } });
  const response = await proxyWheelsRead(request, context.env, "stages", context.data?.wheelsFetch || fetch);
  if (!response.ok) throw new Error("stages_unavailable");
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

function publicOrigin(env, requestUrl) {
  try {
    const configured = new URL(String(env?.THIRDRAILIFY_PUBLIC_ORIGIN || ""));
    if (configured.protocol === "https:") return configured.origin;
  } catch { /* use request origin */ }
  return requestUrl.origin;
}
function validPath(value) { const text = String(value || ""); return /^\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(text) || text === "/" ? text : ""; }
function validDate(value) { const time = Date.parse(String(value || "")); return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : ""; }
function safeImage(value, origin) { try { const url = new URL(String(value || ""), `${origin}/`); return url.protocol === "https:" || url.origin === origin ? url.href : ""; } catch { return ""; } }
function xml(value) { return String(value).replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]); }
