export type AccountAddress = {
  id: string;
  label: string;
  recipientName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  region: string | null;
  postalCode: string;
  countryCode: string;
  phone: string | null;
  isDefault: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
  externallyVerified: false;
};

export type AccountContact = {
  name: string;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  revision: number | null;
};

export type AccountOrderSummary = {
  id: string;
  reference: string;
  environment: "test" | "live";
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  itemCount: number;
  totalAmount: number;
  refundAmount: number;
  currencyCode: "CAD";
  createdAt: string;
  updatedAt: string;
  paymentConfirmedAt: string | null;
  trackingAvailable: boolean;
};

export type AccountCommerceOverview = {
  ok: true;
  authority: string;
  linked: boolean;
  contact: AccountContact;
  addresses: AccountAddress[];
  orders: AccountOrderSummary[];
  summary: { savedAddressCount: number; orderCount: number; liveOrderCount: number; testOrderCount: number };
  checkout: {
    enabled: boolean;
    livePaymentCaptureEnabled: boolean;
    fulfillmentSubmissionEnabled: boolean;
    shippingConfigured: boolean;
    message: string;
  };
};

export type AccountOrderDetail = {
  id: string;
  reference: string;
  environment: "test" | "live";
  checkoutStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currencyCode: "CAD";
  createdAt: string;
  updatedAt: string;
  paymentConfirmedAt: string | null;
  items: Array<{
    id: string; productId: string; variantId: string | null; title: string; variant: string | null;
    options: Record<string, string>; image: string | null; unitAmount: number; quantity: number; lineTotalAmount: number; currencyCode: "CAD";
  }>;
  financial: { subtotalAmount: number; shippingAmount: number | null; taxAmount: null; totalAmount: number; refundAmount: number; netAmount: number | null; currencyCode: "CAD" };
  delivery: null | {
    address: Omit<AccountAddress, "id" | "label" | "isDefault" | "revision" | "createdAt" | "updatedAt" | "externallyVerified"> | null;
    method: string; amount: number; currencyCode: "CAD"; capturedAt: string; historicalSnapshot: true; externallyVerified: false;
  };
  shipments: Array<{ id: string; state: string; carrier: string | null; service: string | null; trackingAvailable: boolean; trackingReference: string | null; trackingUrl: string | null; shippedAt: string | null; deliveredAt: string | null }>;
  timeline: Array<{ at: string; label: string; state: string }>;
};

export type AddressInput = {
  label: string; recipientName: string; company: string; address1: string; address2: string;
  city: string; region: string; postalCode: string; countryCode: string; phone: string; isDefault: boolean; revision?: number;
};

