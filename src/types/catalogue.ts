export type CatalogueProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  formattedPrice: string;
  currency: "CAD";
  listedAtAudit?: boolean;
  optionTypes: string[];
  image: string;
  categories: string[];
  collectionSlugs?: string[];
  sourceUrl?: string;
  featured?: boolean;
  featuredOrder?: number | null;
  images?: string[];
  description?: string;
  priceMinUnitAmount?: number;
  priceMaxUnitAmount?: number;
  maxQuantity?: number;
  available?: boolean;
  displayOrder?: number;
  tags?: string[];
  variants?: CatalogueVariant[];
};

export type CatalogueVariant = { id: string; label: string; size: string | null; color: string | null; options: Record<string, string>; unitAmount: number; currency: "CAD"; availability: "active" | "temporarily_out_of_stock" };

export type CatalogueCollection = { title: string; slug: string; description: string; displayOrder: number; productCount: number; productIds: string[] };

export type CatalogueSnapshot = {
  source: "legacy-wix-snapshot" | "commerce-d1";
  capturedAt: string;
  totalProductsReported: number;
  collections?: CatalogueCollection[];
  products: CatalogueProduct[];
};

export interface CatalogueProvider {
  load(signal?: AbortSignal): Promise<CatalogueSnapshot>;
  loadProduct(slug: string, signal?: AbortSignal): Promise<CatalogueProduct>;
}
