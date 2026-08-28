export type SeoJsonLd = { "@context": "https://schema.org"; "@graph": Array<Record<string, unknown>> };

export type SeoDocument = {
  key: string;
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  imageAlt: string;
  pageType: string;
  robots: string;
  jsonLd: SeoJsonLd;
  publishedTime?: string;
};

export type SeoPresentationOverride = {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export const SITE_NAME: string;
export const BRAND_NAME: string;
export const SITE_LANGUAGE: string;
export const DEFAULT_DESCRIPTION: string;
export const DEFAULT_SOCIAL_IMAGE_PATH: string;
export const INDEX_ROBOTS: string;
export const NOINDEX_ROBOTS: string;

export function staticSeoForPath(pathname: string, origin?: string): SeoDocument;
export function productSeo(product: unknown, origin?: string): SeoDocument | null;
export function episodeSeo(detail: unknown, origin?: string): SeoDocument | null;
export function goatSeo(item: unknown, origin?: string): SeoDocument | null;
export function applySeoPresentationOverride(document: SeoDocument, override?: SeoPresentationOverride | null): SeoDocument;
export function renderSeoHead(document: SeoDocument): string;
export function injectSeoHead(htmlSource: string, document: SeoDocument): string;
export function canonicalRedirectPath(pathname: string): string | null;
export function staticSitemapPaths(): string[];
