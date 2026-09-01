import type { PayPalCapturedPayment, PayPalPaymentStatus } from "./paypal-types";

export const DONATION_COMPLETION_STORAGE_KEY = "thirdrailify.paypal-donation.completed-attempt";

export type CompletedDonation = {
  attemptId: string;
  donationReference: string;
  currency: "CAD";
  amount: number;
};

export function completedDonationFromCapture(result: PayPalCapturedPayment): CompletedDonation | null {
  if (result.ok !== true || result.kind !== "donation" || result.status !== "completed") return null;
  if (!safeAttemptId(result.attemptId) || !safeDonationReference(result.reference) || result.currency !== "CAD" || !safeAmount(result.amount)) return null;
  return { attemptId: result.attemptId, donationReference: result.reference, currency: "CAD", amount: result.amount };
}

export function completedDonationFromStatus(payment: PayPalPaymentStatus): CompletedDonation | null {
  if (payment.kind !== "donation" || payment.status !== "completed") return null;
  if (!safeAttemptId(payment.reference) || !safeDonationReference(payment.donationReference) || payment.currency !== "CAD" || !safeAmount(payment.amount)) return null;
  return { attemptId: payment.reference, donationReference: payment.donationReference, currency: "CAD", amount: payment.amount };
}

export function safeAttemptId(value: unknown): value is string {
  return typeof value === "string" && /^pat_[A-Za-z0-9_-]+$/.test(value) && value.length <= 80;
}

function safeDonationReference(value: unknown): value is string {
  return typeof value === "string" && /^don_[A-Za-z0-9_-]+$/.test(value) && value.length <= 80;
}

function safeAmount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 100 && Number(value) <= 1_000_000;
}
