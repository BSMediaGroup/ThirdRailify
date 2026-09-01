import assert from "node:assert/strict";
import test from "node:test";
import { completedDonationFromCapture, completedDonationFromStatus, safeAttemptId } from "../src/payments/donation-completion.ts";

const completedCapture = {
  ok: true,
  attemptId: "pat_fixture-completed",
  kind: "donation",
  reference: "don_fixture-completed",
  status: "completed",
  currency: "CAD",
  amount: 1500,
  payerEmail: "private@example.test",
  providerCaptureId: "CAPTURE_PRIVATE",
};

test("only an authoritative completed donation capture becomes terminal UI data", () => {
  const expected = { attemptId: "pat_fixture-completed", donationReference: "don_fixture-completed", currency: "CAD", amount: 1500 };
  assert.deepEqual(completedDonationFromCapture(completedCapture), expected);
  assert.deepEqual(completedDonationFromCapture(completedCapture), expected, "replayed completed evidence is deterministic");
  assert.equal(completedDonationFromCapture({ ...completedCapture, status: "pending" }), null);
  assert.equal(completedDonationFromCapture({ ...completedCapture, status: "failed" }), null);
  assert.equal(completedDonationFromCapture({ ...completedCapture, kind: "store" }), null);
  assert.equal(completedDonationFromCapture({ ...completedCapture, amount: 1500.5 }), null);
  assert.doesNotMatch(JSON.stringify(expected), /private@example|CAPTURE_PRIVATE/);
});

test("reload restoration accepts only completed server status for the same safe donation shape", () => {
  const payment = {
    reference: "pat_fixture-completed",
    kind: "donation",
    orderReference: null,
    donationReference: "don_fixture-completed",
    environment: "sandbox",
    currency: "CAD",
    amount: 1500,
    status: "completed",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  assert.deepEqual(completedDonationFromStatus(payment), { attemptId: payment.reference, donationReference: payment.donationReference, currency: "CAD", amount: 1500 });
  for (const status of ["created", "approved", "pending", "failed", "refunded", "reversed", "canceled"]) assert.equal(completedDonationFromStatus({ ...payment, status }), null, status);
  assert.equal(completedDonationFromStatus({ ...payment, donationReference: "ord_not-a-donation" }), null);
  assert.equal(safeAttemptId("pat_safe-reference"), true);
  assert.equal(safeAttemptId("PAYPALORDER001"), false);
});
