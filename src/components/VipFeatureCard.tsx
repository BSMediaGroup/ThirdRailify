import { Link } from "react-router-dom";
import { ArrowIcon, CrownIcon } from "./Icons";

export function VipFeatureCard({ compact = false }: { compact?: boolean }) {
  return <article className={`vip-feature-card${compact ? " vip-feature-card--compact" : ""}`}>
    <div className="vip-feature-card__prism" aria-hidden="true"><i /><i /><i /></div>
    <div className="vip-feature-card__field" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
    <div className="vip-feature-card__mark"><div className="vip-feature-card__pulse" aria-hidden="true"><i /><i /><i /></div><CrownIcon /><span>VIP</span></div>
    <div className="vip-feature-card__content"><p className="eyebrow">THIRD RAILIFY / INNER RAIL</p><h2>The next member experience is being built properly.</h2><p>VIP remains gated while account entitlements, billing, and purchase authority are rebuilt. Nothing on this route creates a membership or charge.</p></div>
    <Link className="button button--primary" to="/vip">Enter the VIP preview <ArrowIcon /></Link>
  </article>;
}
