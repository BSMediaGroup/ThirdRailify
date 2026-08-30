import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type SafeOrderStatus = {
  reference: string;
  paymentStatus: "pending" | "paid" | "not_confirmed";
  orderStatus: string;
  fulfillmentStatus: "disabled";
  amount: number;
  currency: "CAD";
};

type ViewState = "checking" | "confirmed" | "not_confirmed";
type PayPalStatus = { reference: string; kind: "store" | "donation"; orderReference: string | null; donationReference: string | null; environment: "sandbox" | "live"; currency: "CAD"; amount: number; status: "created" | "approved" | "pending" | "completed" | "failed" | "refunded" | "reversed"; updatedAt: string };

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const attemptId = searchParams.get("attempt_id") || "";
  const [state, setState] = useState<ViewState>("checking");
  const [order, setOrder] = useState<SafeOrderStatus | null>(null);
  const [paypal, setPayPal] = useState<PayPalStatus | null>(null);

  useEffect(() => {
    const isPayPal = /^pat_[A-Za-z0-9_-]+$/.test(attemptId);
    const isLegacyStripe = /^cs_test_[A-Za-z0-9_]+$/.test(sessionId);
    if (!isPayPal && !isLegacyStripe) {
      setState("not_confirmed");
      return;
    }
    const controller = new AbortController();
    let timer = 0;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(isPayPal ? `/api/commerce/payment-status?attempt_id=${encodeURIComponent(attemptId)}` : `/api/commerce/order-status?session_id=${encodeURIComponent(sessionId)}`, {
          headers: { Accept: "application/json" }, signal: controller.signal,
        });
        const payload = await response.json() as { ok?: boolean; order?: SafeOrderStatus; payment?: PayPalStatus };
        if (!active) return;
        if (response.ok && payload.ok === true && payload.payment) {
          setPayPal(payload.payment);
          if (payload.payment.status === "completed") { setState("confirmed"); return; }
          if (["failed", "refunded", "reversed"].includes(payload.payment.status)) { setState("not_confirmed"); return; }
          setState("checking");
        }
        if (response.ok && payload.ok === true && payload.order) {
          setOrder(payload.order);
          if (payload.order.paymentStatus === "paid") {
            setState("confirmed");
            return;
          }
          setState(payload.order.paymentStatus === "pending" ? "checking" : "not_confirmed");
        } else if (response.status === 404 || response.status === 400) {
          setState("not_confirmed");
          return;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
      if (active) timer = window.setTimeout(() => void check(), 2000);
    };
    void check();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [attemptId, sessionId]);

  const heading = state === "confirmed" ? "Payment confirmed" : state === "not_confirmed" ? "Payment not confirmed" : "Payment processing";
  const detail = state === "confirmed"
    ? paypal ? "The server has confirmed PayPal capture against the local payment authority." : "Stripe's signed webhook has confirmed this preserved TEST payment in the local commerce authority. Fulfillment remains disabled."
    : state === "not_confirmed"
      ? "The local commerce authority has not confirmed this payment. A return URL by itself is never treated as payment authority."
      : paypal ? "We are checking the local payment authority for provider-confirmed capture. This page does not infer payment from the URL." : "We are checking the local order record for Stripe's signed webhook. This page does not call Stripe or infer payment from the URL.";

  return <main className="checkout-result"><section className={`checkout-result__card is-${state}`} aria-live="polite">
    <p className="eyebrow">{paypal ? `${paypal.environment.toUpperCase()} · PAYPAL · SERVER AUTHORITY` : "LEGACY TEST CHECKOUT · STRIPE SANDBOX"}</p>
    <h1>{heading}</h1><p>{detail}</p>
    {order ? <dl><div><dt>Order reference</dt><dd>{order.reference}</dd></div><div><dt>Total</dt><dd>{new Intl.NumberFormat("en-CA", { style: "currency", currency: order.currency }).format(order.amount / 100)} CAD</dd></div><div><dt>Payment</dt><dd>{order.paymentStatus === "paid" ? "Confirmed" : "Pending"}</dd></div><div><dt>Fulfillment</dt><dd>Disabled / not started</dd></div></dl> : null}
    {paypal ? <dl><div><dt>{paypal.kind === "store" ? "Order" : "Donation"} reference</dt><dd>{paypal.orderReference || paypal.donationReference}</dd></div><div><dt>Total</dt><dd>{new Intl.NumberFormat("en-CA", { style: "currency", currency: paypal.currency }).format(paypal.amount / 100)} CAD</dd></div><div><dt>Payment</dt><dd>{paypal.status === "completed" ? "Confirmed" : paypal.status}</dd></div></dl> : null}
    <div className="button-row"><Link className="button button--primary" to="/shop">Return to shop</Link></div>
  </section></main>;
}
