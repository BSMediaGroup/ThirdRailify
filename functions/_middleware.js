import { episodeDetailPayload } from "./api/watch/_episodes.js";
import { readWatchArchive } from "./api/_state-backend.js";
import { proxyRead as proxyGoatsRead } from "./api/goats/[[path]].js";
import { proxyRead as proxyWheelsRead } from "./api/wheels/[[path]].js";
import { proxyCommerceCatalogue } from "./_shared/commerce-catalogue-proxy.js";
import {
  applySeoPresentationOverride,
  canonicalRedirectPath,
  episodeSeo,
  goatSeo,
  injectSeoHead,
  NOINDEX_ROBOTS,
  productSeo,
  staticSeoForPath,
  wheelSeo,
} from "../seo/site-seo.js";

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return context.next();
  const requestUrl = new URL(request.url);
  const redirectPath = canonicalRedirectPath(requestUrl.pathname);
  if (redirectPath) return canonicalRedirect(requestUrl, redirectPath);

  const response = await context.next();
  if (!String(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) return response;

  const origin = publicOrigin(context.env, requestUrl);
  const resolution = request.method === "HEAD"
    ? { document: staticSeoForPath(requestUrl.pathname, origin) }
    : await seoResolutionForRequest(context, requestUrl.pathname, origin);
  const document = isPreviewOrigin(requestUrl, origin) ? { ...resolution.document, robots: NOINDEX_ROBOTS } : resolution.document;
  const responseStatus = resolution.status || (document.key === "not-found" && response.status === 200 ? 404 : response.status);
  const headers = new Headers(response.headers);
  headers.set("Content-Language", "en-CA");
  headers.set("Link", `<${document.canonicalUrl}>; rel="canonical"`);
  headers.set("X-Robots-Tag", document.robots);
  headers.delete("Content-Length");
  headers.delete("ETag");
  const statusText = responseStatus === 404 ? "Not Found" : response.statusText;
  if (request.method === "HEAD") return new Response(null, { status: responseStatus, statusText, headers });
  const source = await response.text();
  return new Response(injectSeoHead(source, document), { status: responseStatus, statusText, headers });
}

export async function seoDocumentForRequest(context, pathname, origin) {
  return (await seoResolutionForRequest(context, pathname, origin)).document;
}

async function seoResolutionForRequest(context, pathname, origin) {
  const base = staticSeoForPath(pathname, origin);
  try {
    const slug = productSlug(pathname);
    if (slug) {
      const response = await commerceResponse(context, `/api/public/commerce/products/${encodeURIComponent(slug)}`);
      if (response.status === 404) return { document: staticSeoForPath("/not-found", origin), status: 404 };
      const payload = response.ok ? await response.json() : null;
      return { document: productSeo(payload?.product, origin) || base };
    }
    if (pathname === "/shop" || /^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(pathname)) {
      const payload = await commerceJson(context, "/api/public/commerce/catalogue");
      const category = pathname.startsWith("/products/") ? pathname.split("/")[2] : "";
      const products = Array.isArray(payload?.products) ? payload.products : [];
      const candidate = products.find((product) => (!category || product?.collectionSlugs?.includes(category)) && product?.featured && product?.images?.[0])
        || products.find((product) => (!category || product?.collectionSlugs?.includes(category)) && product?.images?.[0]);
      return { document: candidate ? applySeoPresentationOverride(base, { imageUrl: candidate.images[0], imageAlt: `${candidate.title || "Third Railify"} product image` }) : base };
    }
    const episodeId = pathname.match(/^\/watch\/v\/(ep_[a-f0-9]{64})\/?$/)?.[1];
    if (episodeId) {
      const archive = context.data?.seoWatchArchive || await readWatchArchive(context.env);
      const detail = episodeDetailPayload(archive, episodeId);
      return detail ? { document: episodeSeo(detail, origin) || base } : { document: staticSeoForPath("/not-found", origin), status: 404 };
    }
    const goatSlug = pathname.match(/^\/goats\/([a-z0-9][a-z0-9-]{1,118}[a-z0-9])\/?$/)?.[1];
    if (goatSlug && goatSlug !== "submit") {
      const detailRequest = new Request(new URL(`/api/goats/listings/${encodeURIComponent(goatSlug)}`, context.request.url), { headers: { Accept: "application/json" } });
      const response = await proxyGoatsRead(detailRequest, context.env, `listings/${goatSlug}`, context.data?.goatsFetch || fetch);
      if (response.status === 404) return { document: staticSeoForPath("/not-found", origin), status: 404 };
      if (response.ok) return { document: goatSeo((await response.json())?.item, origin) || base };
    }
    const wheelMatch = pathname.match(/^\/wheels\/([a-z0-9][a-z0-9-]{1,78}[a-z0-9])(?:\/(edit|present))?\/?$/);
    if (wheelMatch && wheelMatch[1] !== "new") {
      const slug = wheelMatch[1];
      const mode = wheelMatch[2] || "view";
      const detailRequest = new Request(new URL(`/api/wheels/${encodeURIComponent(slug)}`, context.request.url), { headers: context.request.headers });
      const response = await proxyWheelsRead(detailRequest, context.env, slug, context.data?.wheelsFetch || fetch);
      if (response.status === 404) return { document: staticSeoForPath("/not-found", origin), status: 404 };
      if (response.ok) return { document: wheelSeo((await response.json())?.wheel, origin, mode) || base };
    }
  } catch { /* Fail soft to truthful route metadata. */ }
  return { document: base };
}

async function commerceJson(context, path) {
  const response = await commerceResponse(context, path);
  return response.ok ? response.json() : null;
}

function commerceResponse(context, path) { return proxyCommerceCatalogue(context.env, path, context.data?.commerceFetch || fetch); }

function canonicalRedirect(requestUrl, pathname) {
  const location = new URL(pathname, requestUrl.origin);
  location.search = requestUrl.search;
  return new Response(null, { status: 301, headers: { Location: location.href, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}

function productSlug(pathname) {
  return pathname.match(/^\/shop\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1]
    || pathname.match(/^\/product-page\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1]
    || pathname.match(/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1]
    || "";
}

function publicOrigin(env, requestUrl) {
  for (const value of [env?.THIRDRAILIFY_PUBLIC_ORIGIN, requestUrl.origin]) {
    try {
      const url = new URL(String(value || ""));
      if (url.protocol === "https:" || new Set(["localhost", "127.0.0.1"]).has(url.hostname)) return url.origin;
    } catch { /* try the request origin */ }
  }
  return "https://thirdrailify.pages.dev";
}

function isPreviewOrigin(requestUrl, canonicalOrigin) {
  return !new Set(["localhost", "127.0.0.1"]).has(requestUrl.hostname) && requestUrl.origin !== canonicalOrigin;
}
