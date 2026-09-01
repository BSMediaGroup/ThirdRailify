import type { ReactNode } from "react";

type Approval = { orderId: string };
type FixtureWindow = Window & { __THIRDRAILIFY_REPEAT_APPROVAL__?: boolean };

export function PayPalProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PayPalOneTimePaymentButton({ disabled, createOrder, onApprove }: {
  disabled?: boolean;
  createOrder: () => Promise<Approval>;
  onApprove: (approval: Approval) => Promise<void>;
}) {
  const complete = async () => {
    const approval = await createOrder();
    await onApprove(approval);
    if ((window as FixtureWindow).__THIRDRAILIFY_REPEAT_APPROVAL__) await onApprove(approval);
  };
  return <button type="button" data-testid="synthetic-paypal-approval" disabled={disabled} onClick={() => void complete()}>Complete synthetic payment approval</button>;
}
