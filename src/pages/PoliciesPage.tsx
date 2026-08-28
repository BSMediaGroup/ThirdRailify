import { Link } from "react-router-dom";
import { ArrowIcon, BoltIcon } from "../components/Icons";
import { SignalField } from "../components/SignalField";
import { policyList } from "../content/policies";

export function PoliciesPage() {
  return (
    <div className="policies-page">
      <section className="policies-hero" aria-labelledby="policies-title">
        <SignalField />
        <div className="policies-hero__grid" aria-hidden="true" />
        <div className="container policies-hero__layout">
          <div>
            <p className="eyebrow"><i /> Third Railify document register</p>
            <h1 id="policies-title">Policy<br /><span className="hero-feature-text">library.</span></h1>
            <p>Clear rules, real data boundaries, and direct routes into every current Third Railify policy.</p>
          </div>
          <div className="policies-register" aria-label="Current policy register">
            <span><strong>{String(policyList.length).padStart(2, "0")}</strong><small>Current documents</small></span>
            <span><strong>2026</strong><small>V2 policy edition</small></span>
            <span><strong>CAD</strong><small>Store authority</small></span>
          </div>
        </div>
      </section>

      <section className="policies-gallery section" aria-labelledby="policy-gallery-title">
        <div className="container policies-gallery__heading">
          <div><p className="eyebrow">Current register</p><h2 id="policy-gallery-title">Choose a document.</h2></div>
          <p>Each page includes deep links, readable section navigation, and a clear revision date. Future membership-specific policies will join this register when they are published.</p>
        </div>
        <div className="container policies-grid">
          {policyList.map((policy) => (
            <Link className={`policy-card policy-card--${policy.tone}`} to={policy.slug} key={policy.key}>
              <PolicyCardSignal order={policy.order} />
              <div className="policy-card__body">
                <p><span>POL / {policy.order}</span><span>{policy.sections.length} sections</span></p>
                <h3>{policy.title}</h3>
                <small>{policy.summary}</small>
                <strong>Read document <ArrowIcon /></strong>
              </div>
            </Link>
          ))}
          <article className="policy-card policy-card--future" aria-label="Future membership policies are not yet published">
            <PolicyCardSignal order="05+" />
            <div className="policy-card__body">
              <p><span>FUTURE REGISTER</span><span>Reserved</span></p>
              <h3>Membership policies</h3>
              <small>Plan-specific terms and benefit rules will appear here only when those offerings are ready to publish.</small>
              <strong><BoltIcon /> Awaiting publication</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="container policies-contact" aria-labelledby="policies-contact-title">
        <div><p className="eyebrow">Questions or access needs</p><h2 id="policies-contact-title">Need a clearer signal?</h2></div>
        <div><p>Privacy requests, accessibility barriers, and policy questions each have a direct route.</p><a className="button button--primary" href="mailto:support@thirdrailify.com">Contact support <ArrowIcon /></a></div>
      </section>
    </div>
  );
}

function PolicyCardSignal({ order }: { order: string }) {
  return (
    <div className="policy-card__signal" aria-hidden="true">
      <span>{order}</span><i /><i /><i /><BoltIcon />
    </div>
  );
}
