import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SITE_NAME, staticSeoForPath, type SeoDocument } from "../../seo/site-seo.js";

type PublishedSeo = { pathname: string; document: SeoDocument };
type SeoPublisher = { publish: (value: PublishedSeo) => void; clear: (pathname: string, key: string) => void };

const SeoContext = createContext<SeoPublisher | null>(null);

export function SeoProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [published, setPublished] = useState<PublishedSeo | null>(null);
  const publish = useCallback((value: PublishedSeo) => setPublished(value), []);
  const clear = useCallback((pathname: string, key: string) => setPublished((current) => current?.pathname === pathname && current.document.key === key ? null : current), []);
  const value = useMemo(() => ({ publish, clear }), [clear, publish]);
  const fallback = useMemo(() => staticSeoForPath(location.pathname, window.location.origin), [location.pathname]);
  const active = published?.pathname === location.pathname ? published.document : fallback;
  useEffect(() => applySeoDocument(active), [active]);
  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePageSeo(document: SeoDocument | null) {
  const publisher = useContext(SeoContext);
  const location = useLocation();
  const signature = document ? JSON.stringify(document) : "";
  useEffect(() => {
    if (!publisher || !document) return;
    publisher.publish({ pathname: location.pathname, document });
    return () => publisher.clear(location.pathname, document.key);
    // The serialized document makes callers safe even when a builder returns a new object per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, publisher, signature]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function applySeoDocument(seo: SeoDocument) {
  document.title = seo.title;
  document.documentElement.lang = "en-CA";
  document.head.querySelectorAll('[data-thirdrailify-seo="true"]').forEach((node) => node.remove());
  const metaTags: Array<["name" | "property", string, string | undefined]> = [
    ["name", "description", seo.description],
    ["name", "author", SITE_NAME],
    ["name", "robots", seo.robots],
    ["name", "googlebot", seo.robots],
    ["property", "og:locale", "en_CA"],
    ["property", "og:type", seo.pageType],
    ["property", "og:site_name", SITE_NAME],
    ["property", "og:title", seo.title],
    ["property", "og:description", seo.description],
    ["property", "og:url", seo.canonicalUrl],
    ["property", "og:image", seo.imageUrl],
    ["property", "og:image:secure_url", seo.imageUrl],
    ["property", "og:image:alt", seo.imageAlt],
    ["property", "og:image:type", imageMime(seo.imageUrl)],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:site", "@ThirdRailify"],
    ["name", "twitter:title", seo.title],
    ["name", "twitter:description", seo.description],
    ["name", "twitter:image", seo.imageUrl],
    ["name", "twitter:image:alt", seo.imageAlt],
    ["property", "article:published_time", seo.publishedTime],
  ];
  for (const [attribute, key, content] of metaTags) {
    if (!content) continue;
    const meta = document.createElement("meta");
    meta.dataset.thirdrailifySeo = "true";
    meta.setAttribute(attribute, key);
    meta.content = content;
    document.head.append(meta);
  }
  const canonical = document.createElement("link");
  canonical.dataset.thirdrailifySeo = "true";
  canonical.rel = "canonical";
  canonical.href = seo.canonicalUrl;
  document.head.append(canonical);
  const sitemap = document.createElement("link");
  sitemap.dataset.thirdrailifySeo = "true";
  sitemap.rel = "sitemap";
  sitemap.type = "application/xml";
  sitemap.href = new URL("/sitemap.xml", seo.canonicalUrl).href;
  document.head.append(sitemap);
  const structured = document.createElement("script");
  structured.dataset.thirdrailifySeo = "true";
  structured.type = "application/ld+json";
  structured.textContent = JSON.stringify(seo.jsonLd);
  document.head.append(structured);
}

function imageMime(value: string) {
  let path = value.toLowerCase();
  try { path = new URL(value).pathname.toLowerCase(); } catch { /* retain the original value */ }
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "";
}
