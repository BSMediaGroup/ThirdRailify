import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BagIcon, MinusIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { CadAmount, ProductCurrencyComparison } from "../components/CurrencyPrice";
import { catalogueProvider } from "../lib/catalogueProvider";
import { useCart } from "../store/cart";
import type { CatalogueProduct } from "../types/catalogue";

export function CartPage() {
  const cart = useCart();
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    catalogueProvider.load(controller.signal)
      .then((snapshot) => { setProducts(snapshot.products); setError(""); })
      .catch(() => setError("Current catalogue details are unavailable."));
    return () => controller.abort();
  }, []);

  const rows = cart.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants?.find((candidate) => candidate.id === item.variantId);
    return product && variant ? [{ item, product, variant }] : [];
  });
  const subtotal = rows.reduce((sum, row) => sum + row.variant.unitAmount * row.item.quantity, 0);

  return <section className="cart-page"><div className="container">
    <header className="cart-page__heading"><div><p className="eyebrow">Local cart · CAD authority</p><h1>Your cart.</h1><p>Review selected products and variants. Checkout remains disabled while the permanent store migration is staged.</p></div><strong>{cart.count} {cart.count === 1 ? "item" : "items"}</strong></header>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    {rows.length ? <div className="cart-page__layout">
      <div className="cart-page__items">{rows.map(({ item, product, variant }) => <article className="cart-page-row" key={`${product.id}:${variant.id}`}>
        <div className="cart-page-row__image">{product.image ? <img src={product.image} alt="" /> : <span aria-hidden="true">TR</span>}</div>
        <div className="cart-page-row__copy"><h2><Link to={`/shop/${product.slug}`}>{product.name}</Link></h2><p>{variant.label}</p><span>Unit price <CadAmount minorUnits={variant.unitAmount} /></span><div className="quantity-control" aria-label={`Quantity for ${product.name}`}><button type="button" onClick={() => cart.setQuantity(product.id, variant.id, item.quantity - 1)} aria-label="Decrease quantity"><MinusIcon /></button><output>{item.quantity}</output><button type="button" onClick={() => cart.setQuantity(product.id, variant.id, item.quantity + 1)} aria-label="Increase quantity"><PlusIcon /></button></div></div>
        <div className="cart-page-row__total"><span>Line total</span><CadAmount minorUnits={variant.unitAmount * item.quantity} /><button className="cart-remove-button cart-page-row__remove" type="button" onClick={() => cart.remove(product.id, variant.id)} aria-label={`Remove ${product.name} from cart`} title="Remove item"><TrashIcon /></button></div>
      </article>)}</div>
      <aside className="cart-summary" aria-labelledby="cart-summary-title"><p className="eyebrow">Cart summary</p><h2 id="cart-summary-title">Subtotal</h2><CadAmount minorUnits={subtotal} className="cart-summary__amount" /><ProductCurrencyComparison cadPrice={subtotal / 100} /><p>Prices are authoritative CAD values from Commerce D1. Taxes and shipping are not calculated because checkout is disabled.</p><button className="button button--disabled" type="button" disabled>Checkout coming online during store migration</button><Link className="button button--secondary" to="/shop">Continue shopping</Link><button className="text-button" type="button" onClick={cart.clear}>Clear cart</button></aside>
    </div> : <div className="empty-state empty-state--cart-page"><BagIcon /><p className="eyebrow">The rail is clear</p><h2>Your cart is empty.</h2><p>Choose a real catalogue variant to start a local cart.</p><Link className="button button--primary" to="/shop">Continue shopping</Link></div>}
  </div></section>;
}
