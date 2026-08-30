export type PayPalConfig = {
  ok: true; provider: "paypal"; preferred: boolean; environment: "sandbox" | "live"; currency: "CAD"; intent: "CAPTURE";
  clientId: string | null; configured: boolean; webhookConfigured: boolean; storeCheckoutEnabled: boolean; donationsEnabled: boolean;
  emergencyPaused: boolean; stripe: { configured: boolean; enabled: boolean; preferred: false }; message: string | null;
};

export type PayPalCreateResult = {
  ok: true; provider: "paypal"; attemptId: string; orderId: string; target: "store" | "donation"; reference: string;
  environment: "sandbox" | "live"; currency: "CAD"; amount: number;
};

export type PayPalCaptureResult = {
  ok: true; attemptId: string; kind: "store" | "donation"; reference: string; status: "completed" | "pending" | "failed";
};
