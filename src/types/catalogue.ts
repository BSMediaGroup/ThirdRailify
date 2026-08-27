export type CatalogueProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  formattedPrice: string;
  currency: "CAD";
  listedAtAudit: boolean;
  optionTypes: string[];
  image: string;
  categories: string[];
  sourceUrl: string;
  featured?: boolean;
  featuredOrder?: number | null;
  images?: string[];
  description?: string;
};

export type CatalogueSnapshot = {
  source: "legacy-wix-snapshot";
  capturedAt: string;
  totalProductsReported: number;
  products: CatalogueProduct[];
};

export interface CatalogueProvider {
  load(signal?: AbortSignal): Promise<CatalogueSnapshot>;
}
