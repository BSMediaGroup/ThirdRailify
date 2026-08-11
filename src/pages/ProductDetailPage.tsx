import { Link, useParams } from "react-router-dom";
import { ArrowIcon, BagIcon } from "../components/Icons";
import { wixSnapshot } from "../data/wixSnapshot";
import { useCart } from "../store/cart";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const cart = useCart();
  const product = wixSnapshot.products.find((entry) => entry.slug === slug);

  if (!product) {
    return (
      <section className="route-hero route-hero--center">
        <div className="container"><p className="eyebrow">Product not captured</p><h1>This product is outside the bounded snapshot.</h1><p>No name, price, imagery, or availability has been invented for this route.</p><div className="button-row"><Link className="button button--primary" to="/shop">Back to captured products</Link><a className="button button--secondary" href="https://www.thirdrailify.com/shop" target="_blank" rel="noreferrer">Open current Wix shop <ArrowIcon /></a></div></div>
      </section>
    );
  }

  return (
    <section className="product-detail">
      <div className="container product-detail__crumbs"><Link to="/shop">Shop</Link><span>/</span><span>{product.categories[0]}</span><span>/</span><strong>{product.name}</strong></div>
      <div className="container product-detail__grid">
        <div className="product-detail__image"><span>Captured from current Wix listing</span><img src={product.image} alt={product.name} /></div>
        <div className="product-detail__copy">
          <p className="eyebrow">{product.categories.join(" · ")}</p>
          <h1>{product.name}</h1>
          <div className="product-detail__price"><strong>{product.formattedPrice}</strong><span>CAD · excluding applicable sales tax on the current Wix listing</span></div>
          <p className="product-detail__truth">This is a dated migration snapshot. Wix reported the item as listed when audited on 11 August 2026; live inventory has not been connected to V2.</p>
          <div className="option-types"><span>Option types visible on Wix</span>{product.optionTypes.map((option) => <b key={option}>{option}</b>)}</div>
          <p className="product-description-pending">Detailed description and option values were not captured, so this scaffold does not fabricate them.</p>
          <div className="product-detail__actions"><button className="button button--primary" type="button" onClick={() => cart.add(product)}><BagIcon /> Add to local cart</button><a className="button button--secondary" href={product.sourceUrl} target="_blank" rel="noreferrer">View current Wix listing <ArrowIcon /></a></div>
          <dl className="product-facts"><div><dt>Snapshot source</dt><dd>Current Wix storefront API</dd></div><div><dt>Currency</dt><dd>CAD</dd></div><div><dt>Provider status</dt><dd>Not connected in V2</dd></div><div><dt>Checkout</dt><dd>Not enabled in V2</dd></div></dl>
        </div>
      </div>
    </section>
  );
}
