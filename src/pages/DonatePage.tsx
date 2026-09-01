import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon, BoltIcon, CheckCircleIcon, RadioIcon } from "../components/Icons";
import { SignalField } from "../components/SignalField";
import { completedDonationFromCapture, completedDonationFromStatus, DONATION_COMPLETION_STORAGE_KEY, safeAttemptId, type CompletedDonation } from "../payments/donation-completion";
import type { PayPalCapturedPayment, PayPalCreateResult, PayPalPaymentStatus } from "../payments/paypal-types";
const PayPalPayment = lazy(() => import("../components/PayPalPayment").then((module) => ({ default: module.PayPalPayment })));
const suggestedAmounts = [5, 15, 25, 50];

export function DonatePage() {
  const [amount, setAmount] = useState("15");
  const [completed, setCompleted] = useState<CompletedDonation | null>(null);
  const [restoringCompletion, setRestoringCompletion] = useState(false);
  const donationRequestId = useRef(crypto.randomUUID());

  useEffect(() => {
    const storedAttemptId = sessionStorage.getItem(DONATION_COMPLETION_STORAGE_KEY);
    if (!safeAttemptId(storedAttemptId)) {
      if (storedAttemptId) sessionStorage.removeItem(DONATION_COMPLETION_STORAGE_KEY);
      return;
    }
    const controller = new AbortController();
    setRestoringCompletion(true);
    fetch(`/api/commerce/payment-status?attempt_id=${encodeURIComponent(storedAttemptId)}`, { headers: { Accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { ok?: boolean; payment?: PayPalPaymentStatus };
        if (!response.ok || payload.ok !== true || !payload.payment) throw new Error("Donation status is unavailable.");
        const confirmation = completedDonationFromStatus(payload.payment);
        if (confirmation) setCompleted(confirmation);
        else sessionStorage.removeItem(DONATION_COMPLETION_STORAGE_KEY);
      })
      .catch((reason) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) sessionStorage.removeItem(DONATION_COMPLETION_STORAGE_KEY);
      })
      .finally(() => setRestoringCompletion(false));
    return () => controller.abort();
  }, []);

  const amountNumber = Number(amount);
  const safeAmount = Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : 0;
  const amountMinor = Number.isSafeInteger(safeAmount * 100) ? safeAmount * 100 : 0;
  const changeAmount = (value: string) => { setAmount(value); donationRequestId.current = crypto.randomUUID(); };
  const createDonation = async (): Promise<PayPalCreateResult> => {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 1_000_000) throw new Error("Choose a whole-dollar donation between CA$1 and CA$10,000.");
    const response = await fetch("/api/commerce/paypal/donation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ donationRequestId: donationRequestId.current, amountMinor }) });
    const payload = await response.json() as PayPalCreateResult & { message?: string };
    if (!response.ok || payload.ok !== true || payload.provider !== "paypal" || payload.target !== "donation") throw new Error(payload.message || "PayPal donations are unavailable.");
    return payload;
  };
  const completeDonation = (result: PayPalCapturedPayment) => {
    const confirmation = completedDonationFromCapture(result);
    if (!confirmation) return;
    sessionStorage.setItem(DONATION_COMPLETION_STORAGE_KEY, confirmation.attemptId);
    setCompleted(confirmation);
  };
  const startAnotherDonation = () => {
    sessionStorage.removeItem(DONATION_COMPLETION_STORAGE_KEY);
    donationRequestId.current = crypto.randomUUID();
    setAmount("15");
    setCompleted(null);
  };

  return <main className="donate-page">
    <section className="donate-hero" aria-labelledby="donate-title">
      <SignalField />
      <div className="donate-hero__rails" aria-hidden="true"><i /><i /><i /></div>
      <div className="container donate-hero__layout">
        <div className="donate-hero__copy">
          <p className="eyebrow">Independent signal · Community powered</p>
          <h1 id="donate-title">Donate.<span>Power the signal.</span></h1>
          <p>Help keep Third Railify broadcasting with a direct contribution toward the independent production behind the show.</p>
          <div className="donate-availability" role="status"><span><i />Preferred payment rail</span><strong>PayPal direct merchant</strong><small>Availability is controlled by verified server-side credentials, webhook evidence, and explicit commerce gates.</small></div>
          <div className="button-row"><a className="button button--primary" href="#donation-console">Build a donation <ArrowIcon /></a><Link className="button button--secondary" to="/watch">Watch the show</Link></div>
        </div>
        <DonationSignal />
      </div>
      <div className="donate-hero__ticker" aria-hidden="true"><span>KEEP THE MICS HOT</span><i /><span>POWER THE INDEPENDENT SIGNAL</span><i /><span>COMMUNITY BACKED</span></div>
    </section>

    <section className="donate-console-section" id="donation-console" aria-labelledby="donation-console-title">
      <div className="container donate-console-heading"><div><p className="eyebrow">Donation console</p><h2 id="donation-console-title">Set your signal.</h2></div><p>Choose a one-time amount. PayPal is shown only when the direct-merchant credentials, verified webhook, and donation gate are all ready.</p></div>
      <div className="container donate-console-layout">
        {completed ? <DonationCompletion donation={completed} onStartAnother={startAnotherDonation} /> : restoringCompletion ? <section className="donation-confirmation is-checking" role="status" aria-live="polite"><div className="donation-confirmation__mark"><BoltIcon /></div><p className="eyebrow">Verifying server authority</p><h2>Checking your contribution.</h2><p>Third Railify is confirming the saved donation status before offering another payment.</p></section> : <form className="donate-form" onSubmit={(event) => event.preventDefault()}>
          <header><span>TR / DONATE 01</span><strong>Contribution setup</strong><small>CAD authoritative</small></header>
          <fieldset className="donate-frequency"><legend>How often?</legend><div><label className="is-selected"><input type="radio" name="donation-frequency" value="once" checked readOnly /><span><strong>One time</strong><small>A single contribution; recurring agreements are not offered.</small></span></label></div></fieldset>
          <fieldset className="donate-amount"><legend>Choose an amount</legend><div>{suggestedAmounts.map((value) => <label key={value} className={amount === String(value) ? "is-selected" : ""}><input type="radio" name="donation-amount" value={value} checked={amount === String(value)} onChange={(event) => changeAmount(event.target.value)} /><span><small>CAD</small><strong>${value}</strong></span></label>)}</div><label className="donate-custom-amount"><span>Custom amount</span><span><b>CAD</b><input type="number" inputMode="numeric" min="1" max="10000" step="1" value={amount} onChange={(event) => changeAmount(event.target.value)} aria-describedby="donation-payment-note" /></span></label></fieldset>
          <div className="donate-summary" aria-live="polite"><span>Prepared contribution</span><strong>{safeAmount ? `$${safeAmount.toLocaleString("en-CA", { maximumFractionDigits: 0 })} CAD` : "Enter an amount"}</strong><small>one-time donation · created only after PayPal is selected</small></div>
          <Suspense fallback={<div className="paypal-payment is-unavailable" role="status"><strong>Loading PayPal availability</strong></div>}><PayPalPayment kind="donation" disabled={!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 1_000_000} createPayment={createDonation} onCaptured={completeDonation} /></Suspense>
          <p id="donation-payment-note" className="donate-payment-note"><BoltIcon /> One-time PayPal payment only. No subscription or recurring agreement is created.</p>
        </form>}

        <aside className="donate-purpose" aria-label="About Third Railify donations">
          <p className="eyebrow">Where the energy goes</p>
          <h2>Back the work behind the broadcast.</h2>
          <p>Donation support helps sustain the production environment around Third Railify—from keeping the technical signal moving to making room for the next show.</p>
          <ol><li><span>01</span><div><strong>Production</strong><p>The tools and day-to-day work involved in preparing and delivering the show.</p></div></li><li><span>02</span><div><strong>Broadcast infrastructure</strong><p>The hosting and technical services that keep the independent signal available.</p></div></li><li><span>03</span><div><strong>Future episodes</strong><p>More room to keep covering the stories, chaos, and detours the community comes for.</p></div></li></ol>
          <small>Donations are voluntary and do not purchase merchandise, membership, editorial influence, tax treatment, or a guaranteed benefit.</small>
        </aside>
      </div>
    </section>

    <section className="donate-alternatives" aria-labelledby="donate-alternatives-title"><div className="container"><div className="donate-alternatives__heading"><p className="eyebrow">Keep riding the rail</p><h2 id="donate-alternatives-title">More ways to show up.</h2></div><div className="donate-alternatives__grid"><Link to="/watch"><span>01 / WATCH</span><strong>Catch the broadcast</strong><p>Watch the current signal and retained episodes.</p><ArrowIcon /></Link><Link to="/shop"><span>02 / SHOP</span><strong>Wear the lore</strong><p>Explore the replacement merchandise catalogue.</p><ArrowIcon /></Link><Link to="/community"><span>03 / COMMUNITY</span><strong>Join the herd</strong><p>Find the public community routes around the show.</p><ArrowIcon /></Link></div></div></section>
  </main>;
}

function DonationCompletion({ donation, onStartAnother }: { donation: CompletedDonation; onStartAnother: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    sectionRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => {
      const section = sectionRef.current;
      if (!section) return;
      const headerHeight = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().height || 0;
      window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - headerHeight - 12, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const amount = new Intl.NumberFormat("en-CA", { style: "currency", currency: donation.currency }).format(donation.amount / 100);
  return <section ref={sectionRef} className="donation-confirmation" tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" aria-labelledby="donation-confirmation-title">
    <div className="donation-confirmation__mark" aria-hidden="true"><CheckCircleIcon /><BoltIcon /></div>
    <p className="eyebrow">Contribution received · Server confirmed</p>
    <h2 id="donation-confirmation-title">Thank you for supporting Third Railify</h2>
    <p className="donation-confirmation__copy">Your contribution has been received successfully.</p>
    <dl className="donation-confirmation__summary">
      <div><dt>Amount</dt><dd>{amount} <small>CAD</small></dd></div>
      <div><dt>Status</dt><dd><span>Payment confirmed</span></dd></div>
    </dl>
    <p className="donation-confirmation__reference">Third Railify reference <code>{donation.donationReference}</code></p>
    <button className="button button--secondary" type="button" onClick={onStartAnother}>Make another donation</button>
    <small>A new contribution starts with a distinct donation intent. No recurring agreement was created.</small>
  </section>;
}

function DonationSignal() {
  return <div className="donate-signal" aria-label="Third Railify community-powered donation signal"><div className="donate-signal__meta"><span>TR / POWER BUS</span><strong>STANDBY</strong></div><div className="donate-signal__scope" aria-hidden="true"><i className="donate-signal__orbit donate-signal__orbit--outer" /><i className="donate-signal__orbit donate-signal__orbit--inner" /><span className="donate-signal__node donate-signal__node--one">MIC</span><span className="donate-signal__node donate-signal__node--two">HOST</span><span className="donate-signal__node donate-signal__node--three">EDIT</span><div className="donate-signal__core"><BoltIcon /><small>COMMUNITY</small><strong>POWER</strong></div></div><div className="donate-signal__wave" aria-hidden="true">{Array.from({ length: 19 }, (_, index) => <i key={index} />)}</div><footer><span><RadioIcon /> Independent broadcast</span><strong>PAYPAL / PENDING</strong></footer></div>;
}
