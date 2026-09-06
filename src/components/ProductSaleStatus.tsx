import type { CatalogueProduct } from "../types/catalogue";

export function ProductSaleStatus({ product, compact = false }: { product: CatalogueProduct; compact?: boolean }) {
  if (!product.saleRestriction?.enabled) return null;
  const prize = product.saleRestriction.reason === "competition_prize";
  return <div className={`product-special-status${compact ? " product-special-status--compact" : ""}`}>
    <span className="product-special-status__emblem" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M10 5h12v8a6 6 0 0 1-12 0V5Zm0 3H5v3a6 6 0 0 0 6 6M22 8h5v3a6 6 0 0 1-6 6M16 19v6m-6 3h12m-10-3h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="m16 8 1.1 2.2 2.4.4-1.8 1.7.4 2.4-2.1-1.1-2.1 1.1.4-2.4-1.8-1.7 2.4-.4L16 8Z" fill="currentColor"/></svg></span>
    <span className="product-special-status__copy"><small>{prize ? "Beyond the shop" : "From the collection"}</small><strong>{prize ? "Competition prize" : "Display only"}</strong>{!compact && <span>{prize ? "Reserved for competition prizes. This item is not available to purchase." : "A special item on display. This item is not available to purchase."}</span>}</span>
    <span className="product-special-status__seal">Not for sale</span>
  </div>;
}
