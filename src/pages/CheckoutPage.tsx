import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CadAmount } from "../components/CurrencyPrice";
import { BagIcon } from "../components/Icons";
import { catalogueProvider } from "../lib/catalogueProvider";
import { useCart } from "../store/cart";
import type { CatalogueProduct } from "../types/catalogue";
import { useAuth } from "../auth/AuthProvider";
import { createAccountAddress, useAccountCommerce } from "../account/client";
import type { AccountAddress } from "../account/types";
import type { PayPalCreateResult } from "../payments/paypal-types";

const PayPalPayment = lazy(() => import("../components/PayPalPayment").then((module) => ({ default: module.PayPalPayment })));

type Delivery = { name: string; company: string; address1: string; address2: string; city: string; region: string; postalCode: string; countryCode: string; phone: string };
type Rate = { id: string; name: string; amount: number; currency: "CAD"; totalAmount: number; delivery: null | { minDays: number | null; maxDays: number | null; minDate: string | null; maxDate: string | null } };
type Quote = { id: string; expiresAt: string; currency: "CAD"; subtotalAmount: number; requiresShipping: boolean; checkoutAvailable: boolean; options: Rate[] };
type ShippingMarket = { countryCode: string; displayName: string };

const EMPTY_DELIVERY: Delivery = { name: "", company: "", address1: "", address2: "", city: "", region: "", postalCode: "", countryCode: "CA", phone: "" };
const REGION_REQUIRED = new Set(["AU", "CA", "US"]);

export function CheckoutPage() {
  const cart = useCart();
  const { account, loading: authLoading, openAuth, csrfToken } = useAuth();
  const accountCommerce = useAccountCommerce(Boolean(account));
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [shippingMarkets, setShippingMarkets] = useState<ShippingMarket[]>([]);
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueReady, setCatalogueReady] = useState(false);
  const [delivery, setDelivery] = useState<Delivery>(EMPTY_DELIVERY);
  const [customerMode, setCustomerMode] = useState<"guest" | "account" | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [touched, setTouched] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [message, setMessage] = useState("Shipping calculation is not available yet.");
  const checkoutRequestId = useRef(crypto.randomUUID());
  const addressInitialized = useRef(false);
  const savedAddressFingerprint = useRef("");

  useEffect(() => {
    const controller = new AbortController();
    catalogueProvider.load(controller.signal).then((snapshot) => { setProducts(snapshot.products); setCatalogueReady(true); setCatalogueError(""); }).catch(() => { setCatalogueReady(false); setCatalogueError("Current catalogue details are unavailable."); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/commerce/shipping-markets", { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() as { ok?: boolean; markets?: ShippingMarket[] } }))
      .then(({ response, payload }) => {
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.markets) || !payload.markets.length) throw new Error("shipping_markets_unavailable");
        setShippingMarkets(payload.markets);
        setDelivery((current) => payload.markets!.some((market) => market.countryCode === current.countryCode) ? current : { ...current, countryCode: payload.markets![0].countryCode });
      })
      .catch(() => setMessage("Eligible shipping destinations are temporarily unavailable."));
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

  useEffect(() => {
    if (!account || addressInitialized.current || !accountCommerce.data) return;
    const defaultAddress = accountCommerce.data.addresses.find((address) => address.isDefault);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
      setDelivery(deliveryFromAddress(defaultAddress));
    } else {
      setDelivery((current) => ({ ...current, name: current.name || accountCommerce.data!.contact.name || account.displayName, phone: current.phone || accountCommerce.data!.contact.phone || "" }));
    }
    addressInitialized.current = true;
  }, [account, accountCommerce.data]);

  const rows = cart.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = product?.variants?.find((candidate) => candidate.id === item.variantId);
    return product && variant ? [{ item, product, variant }] : [];
  });
  const unavailable = catalogueReady ? cart.items.filter((item) => !rows.some((row) => row.item.productId === item.productId && row.item.variantId === item.variantId)) : [];
  const cartKey = JSON.stringify(cart.items);
  useEffect(() => { setQuote(null); setSelectedRateId(""); setMessage("Cart changed. Request current shipping methods when delivery details are complete."); checkoutRequestId.current = crypto.randomUUID(); }, [cartKey]);

  const errors = useMemo(() => ({ ...validateDelivery(delivery), ...validateCustomer(customerEmail, customerMode) }), [customerEmail, customerMode, delivery]);
  const selectedRate = quote?.options.find((rate) => rate.id === selectedRateId) || null;
  const displayedSubtotal = quote?.subtotalAmount ?? rows.reduce((sum, row) => sum + row.variant.unitAmount * row.item.quantity, 0);

  const change = (field: keyof Delivery, value: string) => {
    setDelivery((current) => ({ ...current, [field]: field === "countryCode" || field === "region" ? value.toUpperCase() : value }));
    setSelectedAddressId("");
    setQuote(null); setSelectedRateId(""); setMessage("Delivery details changed. Request current shipping methods again."); checkoutRequestId.current = crypto.randomUUID();
  };

  const chooseSavedAddress = (address: AccountAddress) => {
    setSelectedAddressId(address.id); setDelivery(deliveryFromAddress(address)); setSaveAddress(false);
    setQuote(null); setSelectedRateId(""); setMessage("Saved address selected. Request current shipping methods."); checkoutRequestId.current = crypto.randomUUID();
  };

  const requestRates = async (event: FormEvent) => {
    event.preventDefault(); setTouched(true); setMessage("");
    if (Object.keys(errors).length || !rows.length || rows.length !== cart.items.length) return;
    setQuoteBusy(true);
    try {
      if (account && saveAddress) {
        const fingerprint = JSON.stringify({ addressLabel, delivery });
        if (savedAddressFingerprint.current !== fingerprint) {
          await createAccountAddress(csrfToken, { label: addressLabel.trim() || "Delivery", recipientName: delivery.name, company: delivery.company, address1: delivery.address1, address2: delivery.address2, city: delivery.city, region: delivery.region, postalCode: delivery.postalCode, countryCode: delivery.countryCode, phone: delivery.phone, isDefault: accountCommerce.data?.addresses.length === 0 });
          savedAddressFingerprint.current = fingerprint; setSaveAddress(false); await accountCommerce.refresh();
        }
      }
      const response = await fetch("/api/commerce/shipping-quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.items, recipient: delivery }) });
      const payload = await response.json() as { ok?: boolean; quote?: Quote; message?: string };
      if (!response.ok || payload.ok !== true || !payload.quote) throw new Error(payload.message || "Shipping calculation is unavailable.");
      setQuote(payload.quote); setSelectedRateId(payload.quote.options[0]?.id || ""); setMessage("");
    } catch (reason) { setQuote(null); setSelectedRateId(""); setMessage(reason instanceof Error ? reason.message : "Shipping calculation is unavailable."); }
    finally { setQuoteBusy(false); }
  };

  const createPayPalPayment = async (): Promise<PayPalCreateResult> => {
    setTouched(true); setMessage("");
    if (unavailable.length) throw new Error("Remove unavailable catalogue items before payment.");
    if (!quote || !selectedRate || !quote.checkoutAvailable || Object.keys(errors).length || !customerMode) throw new Error("Complete the customer, delivery, and current shipping selections before payment.");
    const response = await fetch("/api/commerce/paypal/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkoutRequestId: checkoutRequestId.current, items: cart.items, recipient: delivery, quoteId: quote.id, shippingOptionId: selectedRate.id, customer: { mode: customerMode, name: delivery.name, email: customerEmail } }) });
    const payload = await response.json() as PayPalCreateResult & { message?: string };
    if (!response.ok || payload.ok !== true || payload.provider !== "paypal") throw new Error(payload.message || "PayPal checkout is unavailable.");
    return payload;
  };

  if (!cart.items.length) return <section className="checkout-page"><div className="container"><div className="empty-state empty-state--cart-page"><BagIcon /><p className="eyebrow">Checkout</p><h1>Your cart is empty.</h1><p>Add a product variant before entering delivery details.</p><Link className="button button--primary" to="/shop">Browse the shop</Link></div></div></section>;

  return <section className="checkout-page"><div className="container">
    <header className="checkout-heading"><div><p className="eyebrow">Secure checkout · CAD authority</p><h1>Delivery &amp; checkout.</h1><p>Confirm contact and delivery details, review server-issued shipping, then approve the server-created order with PayPal when every checkout gate is enabled.</p></div><Link className="button button--secondary" to="/cart">Back to cart</Link></header>
    {catalogueError ? <div className="admin-alert" role="alert">{catalogueError}</div> : null}
    {unavailable.length ? <div className="checkout-error" role="alert"><strong>Checkout blocked by unavailable catalogue items.</strong><p>These saved variants are no longer in the current catalogue. Remove them before requesting shipping or payment.</p>{unavailable.map((item) => <p key={`${item.productId}:${item.variantId}`}><code>{item.productId} · {item.variantId}</code> <button className="text-button" type="button" onClick={() => cart.remove(item.productId, item.variantId)}>Remove</button></p>)}</div> : null}
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={requestRates} noValidate>
        <section className="checkout-panel checkout-identity" aria-labelledby="checkout-identity-title"><p className="eyebrow">01 · Customer</p><h2 id="checkout-identity-title">How would you like to purchase?</h2>
          {authLoading ? <div className="shipping-unavailable" role="status"><strong>Checking your account…</strong></div> : account ? <div className="checkout-account-identity"><div><span className="checkout-account-identity__mark" aria-hidden="true">{account.displayName.trim().charAt(0).toUpperCase() || "T"}</span><p><strong>Purchasing as {account.displayName}</strong><span>{account.emailVerified && account.email ? account.email : "A checkout email is still required"}</span></p></div><small>Your signed-in Account will be linked server-side. Checkout edits do not change your Account profile.</small></div> : <div className="checkout-choice" role="group" aria-label="Choose guest or account checkout"><button type="button" className={customerMode === "guest" ? "is-selected" : ""} aria-pressed={customerMode === "guest"} onClick={() => setCustomerMode("guest")}><strong>Continue as guest</strong><span>No Account required. Your order remains available to commerce operations only.</span></button><button type="button" aria-pressed="false" onClick={() => openAuth("signin")}><strong>Sign in to purchase</strong><span>Use your Third Railify Account and return here with this cart intact.</span></button></div>}
          {customerMode && <div className="checkout-fields checkout-contact-fields"><CheckoutEmailField value={customerEmail} change={setCustomerEmail} error={touched ? errors.email : undefined} readOnly={Boolean(account?.emailVerified && account.email)} /><p className="checkout-panel__note">{account?.emailVerified && account.email ? "Your verified primary account email is used for this purchase." : "This email is protected commerce contact identity. Editing it here does not change your Account profile."}</p></div>}
        </section>
        <section className="checkout-panel" aria-labelledby="delivery-title"><p className="eyebrow">02 · Delivery details</p><h2 id="delivery-title">Where should it go?</h2><p className="checkout-panel__note">Formatting is checked; this does not claim external postal verification.</p>
          {account && accountCommerce.loading && <div className="shipping-unavailable" role="status"><strong>Loading saved addresses…</strong></div>}
          {account && accountCommerce.data?.addresses.length ? <div className="checkout-address-chooser" role="radiogroup" aria-label="Saved delivery addresses">{accountCommerce.data.addresses.map((address) => <button key={address.id} type="button" role="radio" aria-checked={selectedAddressId === address.id} className={selectedAddressId === address.id ? "is-selected" : ""} onClick={() => chooseSavedAddress(address)}><span><strong>{address.label}</strong>{address.isDefault && <small>Default</small>}</span><b>{address.recipientName}</b><em>{address.city}{address.region ? `, ${address.region}` : ""} · {address.countryCode}</em></button>)}<button type="button" role="radio" aria-checked={!selectedAddressId} className={!selectedAddressId ? "is-selected" : ""} onClick={() => { setSelectedAddressId(""); setDelivery({ ...EMPTY_DELIVERY, name: accountCommerce.data?.contact.name || account.displayName, phone: accountCommerce.data?.contact.phone || "" }); setSaveAddress(false); }}><span><strong>Add another address</strong></span><em>Use once or save it to your account</em></button></div> : null}
          <div className="checkout-fields">
            <CheckoutField label="Recipient name" name="name" value={delivery.name} change={change} error={touched ? errors.name : undefined} autoComplete="name" />
            <CheckoutField label="Company (optional)" name="company" value={delivery.company} change={change} autoComplete="organization" />
            <CheckoutField label="Address line 1" name="address1" value={delivery.address1} change={change} error={touched ? errors.address1 : undefined} autoComplete="address-line1" />
            <CheckoutField label="Address line 2 (optional)" name="address2" value={delivery.address2} change={change} autoComplete="address-line2" />
            <CheckoutField label="City / locality" name="city" value={delivery.city} change={change} error={touched ? errors.city : undefined} autoComplete="address-level2" />
            <CheckoutField label="State / province / region" name="region" value={delivery.region} change={change} error={touched ? errors.region : undefined} autoComplete="address-level1" />
            <CheckoutField label="Postal / ZIP code" name="postalCode" value={delivery.postalCode} change={change} error={touched ? errors.postalCode : undefined} autoComplete="postal-code" />
            <label className={`checkout-field ${touched && errors.countryCode ? "has-error" : ""}`}><span>Destination country</span><select name="countryCode" value={delivery.countryCode} onChange={(event) => change("countryCode", event.target.value)} autoComplete="country" disabled={!shippingMarkets.length}>{shippingMarkets.length ? shippingMarkets.map((market) => <option key={market.countryCode} value={market.countryCode}>{market.displayName} ({market.countryCode})</option>) : <option value="">No destinations available</option>}</select>{touched && errors.countryCode ? <strong>{errors.countryCode}</strong> : <small>Only destinations enabled by commerce operations are shown.</small>}</label>
            <CheckoutField label="Telephone (optional)" name="phone" value={delivery.phone} change={change} autoComplete="tel" maxLength={32} />
          </div>
          {account && !selectedAddressId && <div className="checkout-save-address"><label><input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} /><span>Save this address to my account</span></label>{saveAddress && <label><span>Address label</span><input value={addressLabel} maxLength={40} onChange={(event) => setAddressLabel(event.target.value)} /></label>}</div>}
          <button className="button button--primary checkout-rate-button" type="submit" disabled={quoteBusy || !rows.length || unavailable.length > 0 || !customerMode}>{quoteBusy ? "Requesting current methods…" : unavailable.length ? "Remove unavailable items" : customerMode ? "Request shipping methods" : "Choose guest or sign in first"}</button>
        </section>
        <section className="checkout-panel" aria-labelledby="shipping-title"><p className="eyebrow">03 · Shipping method</p><h2 id="shipping-title">Server-issued options.</h2>
          {quote?.options.length ? <div className="shipping-options">{quote.options.map((rate) => <label key={rate.id} className={selectedRateId === rate.id ? "is-selected" : ""}><input type="radio" name="shipping-rate" value={rate.id} checked={selectedRateId === rate.id} onChange={() => setSelectedRateId(rate.id)} /><span><strong>{rate.name}</strong><small>{deliveryLabel(rate.delivery)}</small></span><CadAmount minorUnits={rate.amount} /></label>)}</div> : <div className="shipping-unavailable" role="status"><strong>Shipping calculation is not available yet.</strong><p>{message || "Complete delivery details and request current methods."}</p></div>}
        </section>
      </form>
      <aside className="checkout-summary" aria-labelledby="checkout-summary-title"><p className="eyebrow">04 · Order review & secure payment</p><h2 id="checkout-summary-title">Your order.</h2><div className="checkout-summary__items">{rows.map(({ item, product, variant }) => <article key={`${product.id}:${variant.id}`}>{product.image ? <img src={product.image} alt="" /> : <span className="checkout-summary__placeholder">TR</span>}<div><strong>{product.name}</strong><span>{variant.label} · Qty {item.quantity}</span></div><CadAmount minorUnits={variant.unitAmount * item.quantity} /></article>)}</div>
        {delivery.address1 && <div className="checkout-summary__delivery"><span>Delivery</span><strong>{delivery.name}</strong><small>{delivery.city}{delivery.region ? `, ${delivery.region}` : ""} · {delivery.countryCode}</small></div>}
        <dl><div><dt>Product subtotal</dt><dd><CadAmount minorUnits={displayedSubtotal} /></dd></div><div><dt>Shipping</dt><dd>{selectedRate ? <CadAmount minorUnits={selectedRate.amount} /> : "Calculated at checkout"}</dd></div><div><dt>Tax</dt><dd>Calculated before payment</dd></div><div className="checkout-summary__total"><dt>Order total</dt><dd>{selectedRate ? <CadAmount minorUnits={selectedRate.totalAmount} /> : "Pending authoritative amounts"}</dd></div></dl>
        <Suspense fallback={<div className="paypal-payment is-unavailable" role="status"><strong>Loading PayPal availability</strong></div>}><PayPalPayment kind="store" disabled={unavailable.length > 0 || !quote || !selectedRate || !quote.checkoutAvailable || Object.keys(errors).length > 0 || !customerMode} createPayment={createPayPalPayment} onCaptured={(result) => window.location.assign(`/checkout/success?attempt_id=${encodeURIComponent(result.attemptId)}`)} /></Suspense>
        <p className="checkout-gate-message">{quote?.checkoutAvailable ? "PayPal handles payment approval. Third Railify creates and captures the order on the server and never stores raw payment credentials." : "Checkout is currently unavailable. No order or payment can be created."}</p>
        <p className="checkout-policy-links">Review the <Link to="/terms">Terms of Use &amp; Sale</Link>, <Link to="/privacy">Privacy Policy</Link>, <Link to="/terms">shipping terms</Link>, and <Link to="/refunds">Returns &amp; Refund Policy</Link> before payment.</p>
        {message && quote ? <div className="checkout-error" role="alert">{message}</div> : null}
      </aside>
    </div>
  </div></section>;
}

function CheckoutField({ label, name, value, change, error, autoComplete, maxLength, hint }: { label: string; name: keyof Delivery; value: string; change: (name: keyof Delivery, value: string) => void; error?: string; autoComplete: string; maxLength?: number; hint?: string }) {
  const errorId = `checkout-${name}-error`; const hintId = `checkout-${name}-hint`;
  return <label className={`checkout-field ${error ? "has-error" : ""}`}><span>{label}</span><input name={name} value={value} onChange={(event) => change(name, event.target.value)} autoComplete={autoComplete} inputMode={name === "postalCode" ? "text" : undefined} maxLength={maxLength || (name === "address1" || name === "address2" ? 180 : 120)} aria-invalid={Boolean(error)} aria-describedby={[error ? errorId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined} />{hint ? <small id={hintId}>{hint}</small> : null}{error ? <strong id={errorId}>{error}</strong> : null}</label>;
}

function CheckoutEmailField({ value, change, error, readOnly = false }: { value: string; change: (value: string) => void; error?: string; readOnly?: boolean }) { const errorId = "checkout-customer-email-error"; return <label className={`checkout-field ${error ? "has-error" : ""}`}><span>Customer email</span><input type="email" name="email" value={value} readOnly={readOnly} aria-readonly={readOnly} onChange={(event) => change(event.target.value)} autoComplete="email" inputMode="email" maxLength={254} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />{error ? <strong id={errorId}>{error}</strong> : null}</label>; }

function validateDelivery(value: Delivery) { const errors: Partial<Record<keyof Delivery, string>> = {}; if (!value.name.trim()) errors.name = "Enter the recipient name."; if (!value.address1.trim()) errors.address1 = "Enter the delivery street address."; if (!value.city.trim()) errors.city = "Enter the city or locality."; if (!value.postalCode.trim()) errors.postalCode = "Enter the postal or ZIP code."; const country = value.countryCode.trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(country)) errors.countryCode = "Enter a two-letter country code."; if (REGION_REQUIRED.has(country) && !value.region.trim()) errors.region = "State, province, or region is required for this country."; return errors; }
function validateCustomer(email: string, mode: "guest" | "account" | null) { const errors: { email?: string; mode?: string } = {}; if (!mode) errors.mode = "Choose guest checkout or sign in."; const normalized = email.trim(); if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) errors.email = "Enter a valid customer email address."; return errors; }
function deliveryLabel(value: Rate["delivery"]) { if (!value) return "Delivery estimate not supplied"; if (value.minDays && value.maxDays) return `${value.minDays}–${value.maxDays} business days`; if (value.maxDays) return `Up to ${value.maxDays} business days`; if (value.minDate && value.maxDate) return `${value.minDate}–${value.maxDate}`; return "Provider-estimated delivery"; }
function deliveryFromAddress(address: AccountAddress): Delivery { return { name: address.recipientName, company: address.company || "", address1: address.address1, address2: address.address2 || "", city: address.city, region: address.region || "", postalCode: address.postalCode, countryCode: address.countryCode, phone: address.phone || "" }; }
