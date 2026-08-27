import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowIcon, BagIcon } from "../components/Icons";
import { CurrencyDisclaimer, CurrencySelect, ProductPrice } from "../components/CurrencyPrice";
import { ProductCard } from "../components/ProductCard";
import { wixSnapshot } from "../data/wixSnapshot";
import { catalogueProvider, categorySlug } from "../lib/catalogueProvider";
import { useCart } from "../store/cart";

export function ProductDetailPage() {
  const { slug = "" } = useParams(); const location = useLocation(); const cart = useCart();
  const [products, setProducts] = useState(wixSnapshot.products); const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { const controller = new AbortController(); catalogueProvider.load(controller.signal).then((snapshot) => setProducts(snapshot.products)).catch(() => undefined); return () => controller.abort(); }, []);
  useEffect(() => { setImageFailed(false); window.scrollTo({ top: 0, behavior: "auto" }); }, [slug]);
  const product = products.find((entry) => entry.slug === slug) || wixSnapshot.products.find((entry) => entry.slug === slug);
  const related = useMemo(() => product ? [...products].filter((entry) => entry.id !== product.id).sort((left, right) => {
    const leftShared = left.categories.some((category) => product.categories.includes(category)) ? 1 : 0; const rightShared = right.categories.some((category) => product.categories.includes(category)) ? 1 : 0;
    if (leftShared !== rightShared) return rightShared - leftShared; if (left.featured !== right.featured) return left.featured ? -1 : 1; return left.slug.localeCompare(right.slug);
  }).slice(0, 3) : [], [product, products]);

  if (!product) return <section className="route-hero route-hero--center"><div className="container"><p className="eyebrow">Product unavailable</p><h1>This product is outside the preview catalogue.</h1><p>No name, price, imagery, or availability has been invented for this route.</p><div className="button-row"><Link className="button button--primary" to={`/shop${location.search}${location.hash}`}>Back to the shop</Link><a className="button button--secondary" href="https://www.thirdrailify.com/shop" target="_blank" rel="noreferrer">Open current store <ArrowIcon /></a></div></div></section>;

  return <>
    <section className="product-detail product-detail--commerce"><div className="container product-detail__crumbs"><Link to={`/shop${location.search}`}>Shop</Link><span>/</span><Link to={`/products/${categorySlug(product.categories[0])}${location.search}`}>{product.categories[0]}</Link><span>/</span><strong>{product.name}</strong></div>
      <div className="container product-detail__grid"><div className="product-media"><div className="product-media__stage">{!imageFailed && product.image ? <img src={product.image} alt={product.name} width="900" height="1125" onError={() => setImageFailed(true)} /> : <span className="product-image-fallback" role="img" aria-label={`${product.name} image unavailable`}>TR</span>}<span className="product-media__marker">Preview catalogue</span></div></div>
        <div className="product-detail__copy"><p className="eyebrow">{product.categories.join(" · ")}</p><h1>{product.name}</h1><ProductPrice price={product.price} formattedPrice={product.formattedPrice} prominent /><CurrencySelect /><CurrencyDisclaimer />
          <p className="product-detail__truth">This product is captured from the current store. Inventory and option availability are confirmed only when you continue to the current listing.</p>
          {product.description ? <p className="product-detail__description">{product.description}</p> : null}
          {product.optionTypes.length ? <div className="option-types option-types--truthful"><span>Options available on the current listing</span>{product.optionTypes.map((option) => <b key={option}>{option}<small>Values not captured in preview</small></b>)}</div> : null}
          <div className="product-detail__actions"><button className="button button--primary" type="button" onClick={() => cart.add(product)}><BagIcon /> Add to local cart</button><a className="button button--secondary" href={product.sourceUrl} target="_blank" rel="noreferrer">View current listing <ArrowIcon /></a></div>
          <details className="product-disclosure"><summary>Preview and checkout details</summary><p>The local cart preserves the captured product identifier and CAD price. Final options, availability, taxes, and checkout remain on the current store.</p></details>
          <aside className="product-goats-cta" aria-labelledby="product-goats-title"><div>{!imageFailed && product.image ? <img src={product.image} alt="" width="92" height="92" /> : <span aria-hidden="true">GOAT</span>}</div><p><small>GOATS in the Wild</small><strong id="product-goats-title">Already own this product?</strong><span>Show us your GOATED drip and join the approved community showcase.</span></p><Link className="text-link" to={`/goats/submit?product=${encodeURIComponent(product.id)}`}>Submit your photos <ArrowIcon /></Link></aside>
        </div></div>
    </section>
    {related.length ? <section className="section related-products" aria-labelledby="related-products-title"><div className="container catalogue-heading"><div><p className="eyebrow">Same signal, different artifact</p><h2 id="related-products-title">Related products.</h2></div><Link className="text-link" to={`/shop${location.search}`}>Browse the complete store <ArrowIcon /></Link></div><div className="container product-grid product-grid--related">{related.map((entry, index) => <ProductCard key={entry.id} product={entry} index={index} />)}</div></section> : null}
  </>;
}
