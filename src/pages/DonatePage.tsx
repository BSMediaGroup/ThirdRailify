import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon, BoltIcon, RadioIcon } from "../components/Icons";
import { SignalField } from "../components/SignalField";
import type { PayPalCreateResult } from "../payments/paypal-types";
const PayPalPayment = lazy(() => import("../components/PayPalPayment").then((module) => ({ default: module.PayPalPayment })));
const suggestedAmounts = [5, 15, 25, 50];

export function DonatePage() {
  const [amount, setAmount] = useState("15");
  const [completedReference, setCompletedReference] = useState("");
  const donationRequestId = useRef(crypto.randomUUID());

  const amountNumber = Number(amount);
  const safeAmount = Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : 0;
  const amountMinor = Number.isSafeInteger(safeAmount * 100) ? safeAmount * 100 : 0;
  const changeAmount = (value: string) => { setAmount(value); donationRequestId.current = crypto.randomUUID(); setCompletedReference(""); };
  const createDonation = async (): Promise<PayPalCreateResult> => {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 1_000_000) throw new Error("Choose a whole-dollar donation between CA$1 and CA$10,000.");
    const response = await fetch("/api/commerce/paypal/donation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ donationRequestId: donationRequestId.current, amountMinor }) });
    const payload = await response.json() as PayPalCreateResult & { message?: string };
    if (!response.ok || payload.ok !== true || payload.provider !== "paypal" || payload.target !== "donation") throw new Error(payload.message || "PayPal donations are unavailable.");
    return payload;
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
        <form className="donate-form" onSubmit={(event) => event.preventDefault()}>
          <header><span>TR / DONATE 01</span><strong>Contribution setup</strong><small>CAD authoritative</small></header>
          <fieldset className="donate-frequency"><legend>How often?</legend><div><label className="is-selected"><input type="radio" name="donation-frequency" value="once" checked readOnly /><span><strong>One time</strong><small>A single contribution; recurring agreements are not offered.</small></span></label></div></fieldset>
          <fieldset className="donate-amount"><legend>Choose an amount</legend><div>{suggestedAmounts.map((value) => <label key={value} className={amount === String(value) ? "is-selected" : ""}><input type="radio" name="donation-amount" value={value} checked={amount === String(value)} onChange={(event) => changeAmount(event.target.value)} /><span><small>CAD</small><strong>${value}</strong></span></label>)}</div><label className="donate-custom-amount"><span>Custom amount</span><span><b>CAD</b><input type="number" inputMode="numeric" min="1" max="10000" step="1" value={amount} onChange={(event) => changeAmount(event.target.value)} aria-describedby="donation-payment-note" /></span></label></fieldset>
          <div className="donate-summary" aria-live="polite"><span>Prepared contribution</span><strong>{safeAmount ? `$${safeAmount.toLocaleString("en-CA", { maximumFractionDigits: 0 })} CAD` : "Enter an amount"}</strong><small>one-time donation · created only after PayPal is selected</small></div>
          <Suspense fallback={<div className="paypal-payment is-unavailable" role="status"><strong>Loading PayPal availability</strong></div>}><PayPalPayment kind="donation" disabled={!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 1_000_000 || Boolean(completedReference)} createPayment={createDonation} onCaptured={(result) => { if (result.status === "completed") setCompletedReference(result.reference); }} /></Suspense>
          {completedReference ? <p className="donate-payment-note" role="status"><BoltIcon /> Donation confirmed. Reference {completedReference}.</p> : <p id="donation-payment-note" className="donate-payment-note"><BoltIcon /> One-time PayPal payment only. No subscription or recurring agreement is created.</p>}
        </form>

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

function DonationSignal() {
  return <div className="donate-signal" aria-label="Third Railify community-powered donation signal"><div className="donate-signal__meta"><span>TR / POWER BUS</span><strong>STANDBY</strong></div><div className="donate-signal__scope" aria-hidden="true"><i className="donate-signal__orbit donate-signal__orbit--outer" /><i className="donate-signal__orbit donate-signal__orbit--inner" /><span className="donate-signal__node donate-signal__node--one">MIC</span><span className="donate-signal__node donate-signal__node--two">HOST</span><span className="donate-signal__node donate-signal__node--three">EDIT</span><div className="donate-signal__core"><BoltIcon /><small>COMMUNITY</small><strong>POWER</strong></div></div><div className="donate-signal__wave" aria-hidden="true">{Array.from({ length: 19 }, (_, index) => <i key={index} />)}</div><footer><span><RadioIcon /> Independent broadcast</span><strong>PAYPAL / PENDING</strong></footer></div>;
}
