import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CadAmount } from "../components/CurrencyPrice";
import { BagIcon } from "../components/Icons";
import { catalogueProvider } from "../lib/catalogueProvider";
import { useCart } from "../store/cart";
import type { CatalogueProduct } from "../types/catalogue";
import { useAuth } from "../auth/AuthProvider";

type Delivery = { name: string; address1: string; address2: string; city: string; region: string; postalCode: string; countryCode: string };
type Rate = { id: string; name: string; amount: number; currency: "CAD"; totalAmount: number; delivery: null | { minDays: number | null; maxDays: number | null; minDate: string | null; maxDate: string | null } };
type Quote = { id: string; expiresAt: string; currency: "CAD"; subtotalAmount: number; requiresShipping: boolean; checkoutAvailable: boolean; options: Rate[] };

const EMPTY_DELIVERY: Delivery = { name: "", address1: "", address2: "", city: "", region: "", postalCode: "", countryCode: "CA" };
const REGION_REQUIRED = new Set(["AU", "CA", "US"]);

export function CheckoutPage() {
  const cart = useCart();
  const { account, loading: authLoading, openAuth } = useAuth();
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [catalogueError, setCatalogueError] = useState("");
  const [delivery, setDelivery] = useState<Delivery>(EMPTY_DELIVERY);
  const [customerMode, setCustomerMode] = useState<"guest" | "account" | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [message, setMessage] = useState("Shipping calculation is not available yet.");
  const checkoutRequestId = useRef(crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    catalogueProvider.load(controller.signal).then((snapshot) => { setProducts(snapshot.products); setCatalogueError(""); }).catch(() => setCatalogueError("Current catalogue details are unavailable."));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (account) {
      setCustomerMode("account");
      setDelivery((current) => current.name ? current : { ...current, name: account.displayName || "" });
      if (account.emailVerified && account.email) setCustomerEmail((current) => current || account.email || "");
    } else {
      setCustomerMode((current) => current === "account" ? null : current);
    }
  }, [account]);

  const rows = cart.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants?.find((candidate) => candidate.id === item.variantId);
    return product && variant ? [{ item, product, variant }] : [];
  });
  const cartKey = JSON.stringify(cart.items);
  useEffect(() => { setQuote(null); setSelectedRateId(""); setMessage("Cart changed. Request current shipping methods when delivery details are complete."); checkoutRequestId.current = crypto.randomUUID(); }, [cartKey]);

  const errors = useMemo(() => ({ ...validateDelivery(delivery), ...validateCustomer(customerEmail, customerMode) }), [customerEmail, customerMode, delivery]);
  const selectedRate = quote?.options.find((rate) => rate.id === selectedRateId) || null;
  const displayedSubtotal = quote?.subtotalAmount ?? rows.reduce((sum, row) => sum + row.variant.unitAmount * row.item.quantity, 0);

  const change = (field: keyof Delivery, value: string) => {
    setDelivery((current) => ({ ...current, [field]: field === "countryCode" || field === "region" ? value.toUpperCase() : value }));
    setQuote(null); setSelectedRateId(""); setMessage("Delivery details changed. Request current shipping methods again."); checkoutRequestId.current = crypto.randomUUID();
  };

  const requestRates = async (event: FormEvent) => {
    event.preventDefault(); setTouched(true); setMessage("");
    if (Object.keys(errors).length || !rows.length || rows.length !== cart.items.length) return;
    setQuoteBusy(true);
    try {
      const response = await fetch("/api/commerce/shipping-quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.items, recipient: delivery }) });
      const payload = await response.json() as { ok?: boolean; quote?: Quote; message?: string };
      if (!response.ok || payload.ok !== true || !payload.quote) throw new Error(payload.message || "Shipping calculation is unavailable.");
      setQuote(payload.quote); setSelectedRateId(payload.quote.options[0]?.id || ""); setMessage("");
    } catch (reason) { setQuote(null); setSelectedRateId(""); setMessage(reason instanceof Error ? reason.message : "Shipping calculation is unavailable."); }
    finally { setQuoteBusy(false); }
  };

  const continueToPayment = async () => {
    if (!quote || !selectedRate || !quote.checkoutAvailable || checkoutBusy) return;
    setCheckoutBusy(true); setMessage("");
    try {
      const response = await fetch("/api/commerce/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkoutRequestId: checkoutRequestId.current, items: cart.items, recipient: delivery, quoteId: quote.id, shippingOptionId: selectedRate.id, customer: { mode: customerMode, name: delivery.name, email: customerEmail } }) });
      const payload = await response.json() as { ok?: boolean; checkoutUrl?: string; message?: string };
      if (!response.ok || payload.ok !== true || !payload.checkoutUrl) throw new Error(payload.message || "Checkout is unavailable.");
      window.location.assign(payload.checkoutUrl);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Checkout is unavailable."); setCheckoutBusy(false); }
  };

  if (!cart.items.length) return <section className="checkout-page"><div className="container"><div className="empty-state empty-state--cart-page"><BagIcon /><p className="eyebrow">Checkout</p><h1>Your cart is empty.</h1><p>Add a product variant before entering delivery details.</p><Link className="button button--primary" to="/shop">Browse the shop</Link></div></div></section>;

  return <section className="checkout-page"><div className="container">
    <header className="checkout-heading"><div><p className="eyebrow">Secure checkout foundation · CAD</p><h1>Delivery &amp; checkout.</h1><p>Enter delivery details to request server-authoritative shipping. Details stay in this page only and are not saved in browser storage.</p></div><Link className="button button--secondary" to="/cart">Back to cart</Link></header>
    {catalogueError ? <div className="admin-alert" role="alert">{catalogueError}</div> : null}
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={requestRates} noValidate>
        <section className="checkout-panel checkout-identity" aria-labelledby="checkout-identity-title"><p className="eyebrow">01 · Customer</p><h2 id="checkout-identity-title">How would you like to purchase?</h2>
          {authLoading ? <div className="shipping-unavailable" role="status"><strong>Checking your account…</strong></div> : account ? <div className="checkout-account-identity"><div><span className="checkout-account-identity__mark" aria-hidden="true">{account.displayName.trim().charAt(0).toUpperCase() || "T"}</span><p><strong>Purchasing as {account.displayName}</strong><span>{account.emailVerified && account.email ? account.email : "A checkout email is still required"}</span></p></div><small>Your signed-in Account will be linked server-side. Checkout edits do not change your Account profile.</small></div> : <div className="checkout-choice" role="group" aria-label="Choose guest or account checkout"><button type="button" className={customerMode === "guest" ? "is-selected" : ""} aria-pressed={customerMode === "guest"} onClick={() => setCustomerMode("guest")}><strong>Continue as guest</strong><span>No Account required. Your order remains available to commerce operations only.</span></button><button type="button" aria-pressed="false" onClick={() => openAuth("signin")}><strong>Sign in to purchase</strong><span>Use your Third Railify Account and return here with this cart intact.</span></button></div>}
          {customerMode && <div className="checkout-fields checkout-contact-fields"><CheckoutEmailField value={customerEmail} change={setCustomerEmail} error={touched ? errors.email : undefined} /><p className="checkout-panel__note">This email is protected commerce contact identity. Editing it here does not change your Account profile.</p></div>}
        </section>
        <section className="checkout-panel" aria-labelledby="delivery-title"><p className="eyebrow">02 · Delivery details</p><h2 id="delivery-title">Where should it go?</h2><p className="checkout-panel__note">Formatting is checked; this does not claim external postal verification.</p>
          <div className="checkout-fields">
            <CheckoutField label="Recipient name" name="name" value={delivery.name} change={change} error={touched ? errors.name : undefined} autoComplete="name" />
            <CheckoutField label="Address line 1" name="address1" value={delivery.address1} change={change} error={touched ? errors.address1 : undefined} autoComplete="address-line1" />
            <CheckoutField label="Address line 2 (optional)" name="address2" value={delivery.address2} change={change} autoComplete="address-line2" />
            <CheckoutField label="City / locality" name="city" value={delivery.city} change={change} error={touched ? errors.city : undefined} autoComplete="address-level2" />
            <CheckoutField label="State / province / region" name="region" value={delivery.region} change={change} error={touched ? errors.region : undefined} autoComplete="address-level1" />
            <CheckoutField label="Postal / ZIP code" name="postalCode" value={delivery.postalCode} change={change} error={touched ? errors.postalCode : undefined} autoComplete="postal-code" />
            <CheckoutField label="Destination country code" name="countryCode" value={delivery.countryCode} change={change} error={touched ? errors.countryCode : undefined} autoComplete="country" maxLength={2} hint="Two-letter ISO code, such as CA, US, AU, GB, or NZ." />
          </div>
          <button className="button button--primary checkout-rate-button" type="submit" disabled={quoteBusy || !rows.length || !customerMode}>{quoteBusy ? "Requesting current methods…" : customerMode ? "Request shipping methods" : "Choose guest or sign in first"}</button>
        </section>
        <section className="checkout-panel" aria-labelledby="shipping-title"><p className="eyebrow">03 · Shipping method</p><h2 id="shipping-title">Server-issued options.</h2>
          {quote?.options.length ? <div className="shipping-options">{quote.options.map((rate) => <label key={rate.id} className={selectedRateId === rate.id ? "is-selected" : ""}><input type="radio" name="shipping-rate" value={rate.id} checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} /><span><strong>{rate.name}</strong><small>{deliveryLabel(rate.delivery)}</small></span><CadAmount minorUnits={rate.amount} /></label>)}</div> : <div className="shipping-unavailable" role="status"><strong>Shipping calculation is not available yet.</strong><p>{message || "Complete delivery details and request current methods."}</p></div>}
        </section>
      </form>
      <aside className="checkout-summary" aria-labelledby="checkout-summary-title"><p className="eyebrow">Order summary</p><h2 id="checkout-summary-title">Your order.</h2><div className="checkout-summary__items">{rows.map(({ item, product, variant }) => <article key={`${product.id}:${variant.id}`}><div><strong>{product.name}</strong><span>{variant.label} · Qty {item.quantity}</span></div><CadAmount minorUnits={variant.unitAmount * item.quantity} /></article>)}</div>
        <dl><div><dt>Product subtotal</dt><dd><CadAmount minorUnits={displayedSubtotal} /></dd></div><div><dt>Shipping</dt><dd>{selectedRate ? <CadAmount minorUnits={selectedRate.amount} /> : "Pending"}</dd></div><div><dt>Tax</dt><dd>Not calculated</dd></div><div className="checkout-summary__total"><dt>Order total</dt><dd>{selectedRate ? <CadAmount minorUnits={selectedRate.totalAmount} /> : "Pending shipping"}</dd></div></dl>
        <button className="button button--primary" type="button" onClick={() => void continueToPayment()} disabled={!quote || !selectedRate || !quote.checkoutAvailable || checkoutBusy}>{checkoutBusy ? "Opening secure payment…" : "Continue to payment"}</button>
        <p className="checkout-gate-message">{quote?.checkoutAvailable ? "Payment becomes available only with this current server-issued quote." : "Checkout remains closed. No order or payment can be created."}</p>
        {message && quote ? <div className="checkout-error" role="alert">{message}</div> : null}
      </aside>
    </div>
  </div></section>;
}

function CheckoutField({ label, name, value, change, error, autoComplete, maxLength, hint }: { label: string; name: keyof Delivery; value: string; change: (name: keyof Delivery, value: string) => void; error?: string; autoComplete: string; maxLength?: number; hint?: string }) {
  const errorId = `checkout-${name}-error`; const hintId = `checkout-${name}-hint`;
  return <label className={`checkout-field ${error ? "has-error" : ""}`}><span>{label}</span><input name={name} value={value} onChange={(event) => change(name, event.target.value)} autoComplete={autoComplete} inputMode={name === "postalCode" ? "text" : undefined} maxLength={maxLength || (name === "address1" || name === "address2" ? 180 : 120)} aria-invalid={Boolean(error)} aria-describedby={[error ? errorId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined} />{hint ? <small id={hintId}>{hint}</small> : null}{error ? <strong id={errorId}>{error}</strong> : null}</label>;
}

function CheckoutEmailField({ value, change, error }: { value: string; change: (value: string) => void; error?: string }) { const errorId = "checkout-customer-email-error"; return <label className={`checkout-field ${error ? "has-error" : ""}`}><span>Customer email</span><input type="email" name="email" value={value} onChange={(event) => change(event.target.value)} autoComplete="email" inputMode="email" maxLength={254} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />{error ? <strong id={errorId}>{error}</strong> : null}</label>; }

function validateDelivery(value: Delivery) { const errors: Partial<Record<keyof Delivery, string>> = {}; if (!value.name.trim()) errors.name = "Enter the recipient name."; if (!value.address1.trim()) errors.address1 = "Enter the delivery street address."; if (!value.city.trim()) errors.city = "Enter the city or locality."; if (!value.postalCode.trim()) errors.postalCode = "Enter the postal or ZIP code."; const country = value.countryCode.trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(country)) errors.countryCode = "Enter a two-letter country code."; if (REGION_REQUIRED.has(country) && !value.region.trim()) errors.region = "State, province, or region is required for this country."; return errors; }
function validateCustomer(email: string, mode: "guest" | "account" | null) { const errors: { email?: string; mode?: string } = {}; if (!mode) errors.mode = "Choose guest checkout or sign in."; const normalized = email.trim(); if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) errors.email = "Enter a valid customer email address."; return errors; }
function deliveryLabel(value: Rate["delivery"]) { if (!value) return "Delivery estimate not supplied"; if (value.minDays && value.maxDays) return `${value.minDays}–${value.maxDays} business days`; if (value.maxDays) return `Up to ${value.maxDays} business days`; if (value.minDate && value.maxDate) return `${value.minDate}–${value.maxDate}`; return "Provider-estimated delivery"; }
