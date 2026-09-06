import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BagIcon, MinusIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { CadAmount, ProductCurrencyComparison } from "../components/CurrencyPrice";
import { catalogueProvider } from "../lib/catalogueProvider";
import { useCart } from "../store/cart";
import type { CatalogueProduct, CheckoutReadiness } from "../types/catalogue";
import { useAuth } from "../auth/AuthProvider";
import { useAccountCommerce } from "../account/client";
import { formatGeography } from "../address/geography";

export function CartPage() {
  const cart = useCart();
  const { account } = useAuth();
  const commerce = useAccountCommerce(Boolean(account));
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [readiness, setReadiness] = useState<CheckoutReadiness>();
  const [catalogueReady, setCatalogueReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const load = () => catalogueProvider.load(controller.signal)
      .then((snapshot) => { setProducts(snapshot.products); setCheckoutEnabled(snapshot.checkoutEnabled === true); setReadiness(snapshot.checkoutReadiness); setCatalogueReady(true); setError(""); })
      .catch(() => { setCatalogueReady(false); setError("Current catalogue details are unavailable."); });
    void load();
    window.addEventListener("focus", load);
    return () => { controller.abort(); window.removeEventListener("focus", load); };
  }, []);

  const rows = cart.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants?.find((candidate) => candidate.id === item.variantId);
    return product && product.available !== false && variant?.availability === "active" ? [{ item, product, variant }] : [];
  });
  const subtotal = rows.reduce((sum, row) => sum + row.variant.unitAmount * row.item.quantity, 0);
  const unavailable = catalogueReady ? cart.items.filter((item) => !rows.some((row) => row.item.productId === item.productId && row.item.variantId === item.variantId)) : [];
  const defaultAddress = commerce.data?.addresses.find((address) => address.isDefault) || null;
  const destinationBlocked = Boolean(defaultAddress && readiness && !readiness.destinations.includes(defaultAddress.countryCode));
  const blocker = !catalogueReady ? "Checking current catalogue and checkout availability..." : unavailable.length ? "An item in your cart is no longer available. Remove it to continue." : destinationBlocked ? "Shipping is not currently available for your saved destination. Choose another delivery address." : !checkoutEnabled ? readiness?.blockers[0]?.message || "The store is not open for checkout. Please try again later." : "";
  const canCheckout = catalogueReady && checkoutEnabled && !unavailable.length && !destinationBlocked;

  return <section className="cart-page"><div className="container">
    <header className="cart-page__heading"><div><p className="eyebrow">Cart · CAD authority</p><h1>Your cart.</h1><p>Review the exact catalogue variants in this device cart. Prices and checkout readiness are resolved again by the server.</p></div><strong>{cart.count} {cart.count === 1 ? "item" : "items"}</strong></header>
    {error ? <div className="admin-alert" role="alert">{error}</div> : null}
    {cart.items.length ? <div className="cart-page__layout">
      <div className="cart-page__items">{rows.map(({ item, product, variant }) => <article className="cart-page-row" key={`${product.id}:${variant.id}`}>
        <div className="cart-page-row__image">{(variant.image || product.image) ? <img src={variant.image || product.image} alt="" /> : <span aria-hidden="true">TR</span>}</div>
        <div className="cart-page-row__copy"><h2><Link to={`/shop/${product.slug}`}>{product.name}</Link></h2><p>{variant.label}</p><span>Unit price <CadAmount showFlag={false} minorUnits={variant.unitAmount} /></span><div className="quantity-control" aria-label={`Quantity for ${product.name}`}><button type="button" onClick={() => cart.setQuantity(product.id, variant.id, item.quantity - 1)} aria-label="Decrease quantity"><MinusIcon /></button><output>{item.quantity}</output><button type="button" onClick={() => cart.setQuantity(product.id, variant.id, item.quantity + 1)} aria-label="Increase quantity"><PlusIcon /></button></div></div>
        <div className="cart-page-row__total"><span>Line total</span><CadAmount minorUnits={variant.unitAmount * item.quantity} /><button className="cart-remove-button cart-page-row__remove" type="button" onClick={() => cart.remove(product.id, variant.id)} aria-label={`Remove ${product.name} from cart`} title="Remove item"><TrashIcon /></button></div>
      </article>)}{unavailable.map((item) => <article className="cart-page-row cart-page-row--unavailable" key={`${item.productId}:${item.variantId}`}><div className="cart-row__unavailable-mark" aria-hidden="true">!</div><div className="cart-page-row__copy"><h2>Unavailable catalogue item</h2><p>This product or variant is no longer present in the current catalogue. Remove it before checkout.</p><span>{item.productId} · {item.variantId} · Qty {item.quantity}</span></div><div className="cart-page-row__total"><button className="cart-remove-button cart-page-row__remove" type="button" onClick={() => cart.remove(item.productId, item.variantId)} aria-label="Remove unavailable item from cart" title="Remove item"><TrashIcon /></button></div></article>)}</div>
      <aside className="cart-summary" aria-labelledby="cart-summary-title"><p className="eyebrow">Order summary</p><h2 id="cart-summary-title">Subtotal</h2><CadAmount minorUnits={subtotal} className="cart-summary__amount" /><ProductCurrencyComparison cadPrice={subtotal / 100} />{unavailable.length ? <div className="checkout-error" role="alert"><strong>{unavailable.length} unavailable cart item{unavailable.length === 1 ? "" : "s"}</strong><p>Remove stale items before checkout. They are excluded from the subtotal.</p></div> : null}<dl className="cart-summary__costs"><div><dt>Shipping</dt><dd>Calculated at checkout</dd></div><div><dt>Taxes</dt><dd>Calculated before payment</dd></div></dl>{account && <section className="cart-delivery-summary"><span>Delivery</span>{commerce.loading ? <p>Loading your default address…</p> : defaultAddress ? <><strong>{defaultAddress.label}</strong><p>{formatGeography(defaultAddress.city, defaultAddress.region, defaultAddress.countryCode)}</p><Link to="/account/delivery">Change address</Link></> : <><strong>No saved address</strong><Link to="/account/delivery">Add delivery address</Link></>}</section>}<p>{canCheckout ? "The server will confirm delivery, tax, and payment prerequisites before handoff." : blocker}</p>{canCheckout ? <Link className="button button--primary" to="/checkout">Proceed to checkout</Link> : <button className="button button--primary" type="button" disabled>{unavailable.length ? "Remove unavailable items" : destinationBlocked ? "Choose another destination" : readiness?.paused ? "Store paused" : "Checkout unavailable"}</button>}{!canCheckout && <Link className="button button--secondary" to="/checkout">Review delivery readiness</Link>}<Link className="button button--secondary" to="/shop">Continue shopping</Link><button className="text-button" type="button" onClick={cart.clear}>Clear cart</button></aside>
    </div> : <div className="empty-state empty-state--cart-page"><BagIcon /><p className="eyebrow">The rail is clear</p><h2>Your cart is empty.</h2><p>Choose a real catalogue variant to start a local cart.</p><Link className="button button--primary" to="/shop">Continue shopping</Link></div>}
  </div></section>;
}
