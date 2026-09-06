import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { catalogueProvider } from "../lib/catalogueProvider";
import { useCart } from "../store/cart";
import type { CatalogueProduct, CheckoutReadiness } from "../types/catalogue";
import { BagIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "./Icons";
import { CadAmount } from "./CurrencyPrice";

export function CartDrawer() {
  const cart = useCart();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [catalogueError, setCatalogueError] = useState(false);
  const [catalogueReady, setCatalogueReady] = useState(false);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [readiness, setReadiness] = useState<CheckoutReadiness>();

  useEffect(() => {
    if (!cart.isOpen) return;
    const controller = new AbortController();
    const load = async () => {
      setCatalogueReady(false);
      try {
        const snapshot = await catalogueProvider.load(controller.signal);
        if (controller.signal.aborted) return;
        setProducts(snapshot.products); setCheckoutEnabled(snapshot.checkoutEnabled === true);
        setReadiness(snapshot.checkoutReadiness); setCatalogueError(false); setCatalogueReady(true);
      } catch {
        if (!controller.signal.aborted) { setCatalogueError(true); setCatalogueReady(false); }
      }
    };
    void load();
    window.addEventListener("focus", load);
    return () => { controller.abort(); window.removeEventListener("focus", load); };
  }, [cart.isOpen]);

  useEffect(() => {
    if (!cart.isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.classList.add("drawer-open");
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cart.close();
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])'),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("drawer-open");
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [cart, cart.isOpen]);

  if (!cart.isOpen) return null;

  const rows = cart.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants?.find((candidate) => candidate.id === item.variantId);
    return product && product.available !== false && variant?.availability === "active" ? [{ item, product, variant }] : [];
  });
  const subtotal = rows.reduce((sum, row) => sum + row.variant.unitAmount * row.item.quantity, 0);
  const unavailable = catalogueReady ? cart.items.filter((item) => !rows.some((row) => row.item.productId === item.productId && row.item.variantId === item.variantId)) : [];
  const canCheckout = catalogueReady && checkoutEnabled && rows.length > 0 && !unavailable.length;
  const blocker = catalogueError ? "Current catalogue details are unavailable. Close and reopen your cart to retry." : !catalogueReady ? "Checking current checkout availability..." : !cart.items.length ? "Choose a product variant to start your order." : unavailable.length ? "Remove unavailable items before continuing." : !checkoutEnabled ? readiness?.blockers[0]?.message || "The store is not open for checkout. Please try again later." : "Selections stay on this device. Confirm delivery and shipping at checkout.";

  return (
    <div className="cart-layer">
      <button className="cart-backdrop" type="button" aria-label="Close cart" onClick={cart.close} />
      <aside ref={drawerRef} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-drawer__header">
          <div><span className="eyebrow">Commerce catalogue</span><h2 id="cart-title">Your cart</h2></div>
          <button ref={closeRef} className="icon-button" type="button" onClick={cart.close} aria-label="Close cart"><CloseIcon /></button>
        </div>
        <p className="cart-boundary" role={catalogueError ? "alert" : undefined}>{blocker}</p>
        <div className="cart-drawer__items">
          {rows.length ? rows.map(({ item, product, variant }) => (
            <article className="cart-row" key={`${product.id}:${variant.id}`}>
              <img src={variant.image || product.image} alt="" />
              <div>
                <h3>{product.name}</h3>
                <p className="cart-row__variant">{variant.label}</p>
                <div className="cart-row__price"><span>Item total</span><CadAmount minorUnits={variant.unitAmount * item.quantity} /></div>
                <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                  <button type="button" onClick={() => cart.setQuantity(product.id, variant.id, item.quantity - 1)} aria-label="Decrease quantity"><MinusIcon /></button>
                  <output>{item.quantity}</output>
                  <button type="button" onClick={() => cart.setQuantity(product.id, variant.id, item.quantity + 1)} aria-label="Increase quantity"><PlusIcon /></button>
                </div>
              </div>
              <button className="cart-remove-button cart-row__remove" type="button" onClick={() => cart.remove(product.id, variant.id)} aria-label={`Remove ${product.name} from cart`} title="Remove item"><TrashIcon /></button>
            </article>
          )) : null}
          {unavailable.map((item) => <article className="cart-row cart-row--unavailable" key={`${item.productId}:${item.variantId}`}><div className="cart-row__unavailable-mark" aria-hidden="true">!</div><div><h3>Unavailable catalogue item</h3><p className="cart-row__variant">This saved product or variant is no longer in the current catalogue.</p><small>{item.productId} · {item.variantId} · Qty {item.quantity}</small></div><button className="cart-remove-button cart-row__remove" type="button" onClick={() => cart.remove(item.productId, item.variantId)} aria-label="Remove unavailable item from cart" title="Remove item"><TrashIcon /></button></article>)}
          {!rows.length && !unavailable.length ? (
            <div className="empty-state empty-state--cart"><BagIcon /><h3>Nothing on the rail yet.</h3><p>Choose a product variant from the shop to add it here.</p></div>
          ) : null}
        </div>
        <div className="cart-drawer__footer">
          <div><span>Cart subtotal</span><CadAmount minorUnits={subtotal} /></div>
          {canCheckout ? <Link className="button button--primary" to="/checkout" onClick={cart.close}>Proceed to checkout</Link> : <button className="button button--primary" type="button" disabled>{!catalogueReady && !catalogueError ? "Checking checkout" : unavailable.length ? "Remove unavailable items" : !cart.items.length ? "Cart is empty" : readiness?.paused ? "Store paused" : "Checkout unavailable"}</button>}
          <Link className="button button--secondary" to="/cart" onClick={cart.close}>View full cart</Link>
          {cart.items.length ? <button className="text-button" type="button" onClick={cart.clear}>Clear local cart</button> : null}
        </div>
      </aside>
    </div>
  );
}
