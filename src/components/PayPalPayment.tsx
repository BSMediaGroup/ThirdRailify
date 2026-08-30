import { useEffect, useRef, useState } from "react";
import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";
import type { PayPalCaptureResult, PayPalConfig, PayPalCreateResult } from "../payments/paypal-types";

type Props = {
  kind: "store" | "donation";
  disabled?: boolean;
  createPayment: () => Promise<PayPalCreateResult>;
  onCaptured: (result: PayPalCaptureResult) => void;
};

function usePayPalConfiguration() {
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/commerce/payment-config", { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as PayPalConfig & { message?: string };
        if (!response.ok || payload.ok !== true || payload.provider !== "paypal") throw new Error(payload.message || "Payment configuration is unavailable.");
        setConfig(payload); setError("");
      })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Payment configuration is unavailable."); });
    return () => controller.abort();
  }, []);
  return { config, error };
}

export function PayPalPayment({ kind, disabled = false, createPayment, onCaptured }: Props) {
  const { config, error: configError } = usePayPalConfiguration();
  const attempt = useRef<PayPalCreateResult | null>(null);
  const [state, setState] = useState<"idle" | "creating" | "approved" | "capturing" | "completed" | "pending" | "canceled" | "failed">("idle");
  const [message, setMessage] = useState("");
  const enabled = Boolean(config?.clientId && config.preferred && config.configured && config.webhookConfigured && !config.emergencyPaused && (kind === "store" ? config.storeCheckoutEnabled : config.donationsEnabled));

  const createOrder = async () => {
    if (!enabled || disabled || state === "creating" || state === "capturing") throw new Error("PayPal is not available for this payment.");
    setState("creating"); setMessage("");
    try {
      const created = await createPayment();
      if (!created.attemptId || !created.orderId || created.target !== kind) throw new Error("The server returned invalid PayPal order evidence.");
      attempt.current = created; setState("idle");
      return { orderId: created.orderId };
    } catch (reason) {
      setState("failed"); setMessage(reason instanceof Error ? reason.message : "PayPal order creation failed.");
      throw reason;
    }
  };

  const approve = async ({ orderId }: { orderId: string }) => {
    const created = attempt.current;
    if (!created || orderId !== created.orderId) { setState("failed"); setMessage("PayPal approval did not match the server-created order."); return; }
    setState("approved"); setMessage("PayPal approved the order. Confirming the server-side capture…");
    setState("capturing");
    try {
      const response = await fetch("/api/commerce/paypal/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: created.attemptId }) });
      const payload = await response.json() as PayPalCaptureResult & { message?: string };
      if (!response.ok || payload.ok !== true || payload.attemptId !== created.attemptId) throw new Error(payload.message || "PayPal capture could not be confirmed.");
      setState(payload.status); setMessage(payload.status === "completed" ? "Payment confirmed." : payload.status === "pending" ? "Payment is pending provider confirmation." : "Payment was not completed.");
      onCaptured(payload);
    } catch (reason) {
      setState("failed"); setMessage(reason instanceof Error ? reason.message : "PayPal capture could not be confirmed.");
      throw reason;
    }
  };

  const unavailable = configError || config?.message || (!config ? "Loading PayPal availability…" : "PayPal is currently unavailable.");
  if (!enabled || !config?.clientId) return <div className="paypal-payment is-unavailable" role="status"><strong>PayPal unavailable</strong><span>{unavailable}</span><small>Card payments temporarily unavailable</small></div>;

  return <div className={`paypal-payment is-${state}`}>
    <PayPalProvider clientId={config.clientId} environment={config.environment === "live" ? "production" : "sandbox"} components={["paypal-payments"]} pageType="checkout">
      <PayPalOneTimePaymentButton type={kind === "donation" ? "donate" : "checkout"} disabled={disabled || state === "creating" || state === "capturing" || state === "completed"} createOrder={createOrder} onApprove={approve} onCancel={() => { setState("canceled"); setMessage("PayPal checkout was canceled. No payment was confirmed."); }} onError={(reason) => { setState("failed"); setMessage(reason?.message || "PayPal checkout could not be opened."); }} />
    </PayPalProvider>
    <p className="paypal-payment__status" aria-live="polite">{message || (config.environment === "sandbox" ? "PayPal sandbox — no real charge" : "Secure PayPal payment")}</p>
    <p className="paypal-payment__card-note">Card payments temporarily unavailable</p>
  </div>;
}
