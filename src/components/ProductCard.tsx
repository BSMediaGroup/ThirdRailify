import { Link } from "react-router-dom";
import type { CatalogueProduct } from "../types/catalogue";
import { ArrowIcon } from "./Icons";

export function ProductCard({ product, index = 0 }: { product: CatalogueProduct; index?: number }) {
  return (
    <article className="product-card" style={{ "--card-index": index } as React.CSSProperties}>
      <Link className="product-card__image" to={`/products/all/${product.slug}`} aria-label={`View ${product.name}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="product-card__status">Wix snapshot</span>
      </Link>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.categories[0]}</span>
          <span>{product.optionTypes.join(" + ")}</span>
        </div>
        <h3><Link to={`/products/all/${product.slug}`}>{product.name}</Link></h3>
        <div className="product-card__footer">
          <strong>{product.formattedPrice} <small>CAD</small></strong>
          <Link className="icon-link" to={`/products/all/${product.slug}`} aria-label={`View ${product.name}`}><ArrowIcon /></Link>
        </div>
      </div>
    </article>
  );
}
