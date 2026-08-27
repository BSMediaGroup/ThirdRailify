import { useState } from "react";
import { Link } from "react-router-dom";
import type { CatalogueProduct } from "../types/catalogue";
import { ArrowIcon } from "./Icons";
import { ProductPrice } from "./CurrencyPrice";

export function ProductCard({ product, index = 0 }: { product: CatalogueProduct; index?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const detailUrl = `/products/all/${product.slug}`;
  return (
    <article className="product-card product-card--commerce" style={{ "--card-index": index } as React.CSSProperties}>
      <Link className="product-card__image" to={detailUrl} aria-label={`View ${product.name}`}>
        {!imageFailed && product.image ? <img src={product.image} alt={product.name} loading="lazy" width="720" height="900" onError={() => setImageFailed(true)} /> : <span className="product-image-fallback" role="img" aria-label={`${product.name} image unavailable`}>TR</span>}
        <span className="product-card__badges">{product.featured ? <b>Featured</b> : null}<b>Preview</b></span>
      </Link>
      <div className="product-card__body">
        <div className="product-card__meta"><span>{product.categories[0] || "Collection"}</span><span>{product.optionTypes.length ? `${product.optionTypes.length} option ${product.optionTypes.length === 1 ? "type" : "types"}` : "Details captured"}</span></div>
        <h3><Link to={detailUrl}>{product.name}</Link></h3>
        <div className="product-card__footer"><ProductPrice price={product.price} formattedPrice={product.formattedPrice} /><Link className="product-card__view" to={detailUrl}>View product <ArrowIcon /></Link></div>
      </div>
    </article>
  );
}
