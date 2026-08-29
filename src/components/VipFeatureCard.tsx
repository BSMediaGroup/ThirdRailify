import { Link } from "react-router-dom";
import { ArrowIcon, CrownIcon } from "./Icons";

export function VipFeatureCard({ compact = false }: { compact?: boolean }) {
  return <article className={`vip-feature-card${compact ? " vip-feature-card--compact" : ""}`}>
    <div className="vip-feature-card__field" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
    <div className="vip-feature-card__mark"><CrownIcon /><span>VIP</span></div>
    <div><p className="eyebrow">THIRD RAILIFY / INNER RAIL</p><h2>The next member experience is being built properly.</h2><p>VIP V2 is still gated while account entitlements, billing, and purchase authority are rebuilt. Nothing on this staging route creates a membership or charge.</p></div>
    <Link className="button button--primary" to="/vip">Enter the VIP preview <ArrowIcon /></Link>
  </article>;
}
