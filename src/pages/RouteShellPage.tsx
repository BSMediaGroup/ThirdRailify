import { Link } from "react-router-dom";
import { ArrowIcon, BoltIcon } from "../components/Icons";
import { SignalField } from "../components/SignalField";

type RouteKey = "community" | "giftCards";

type RouteContent = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  sourceHref?: string;
  sourceLabel?: string;
  points: string[];
};

const content: Record<RouteKey, RouteContent> = {
  community: {
    eyebrow: "GOATs in the wild",
    title: "The merch has left the station.",
    description: "The current community gallery lets viewers share Third Railify and Just Gina merch in the wild.",
    status: "The current GOATS experience is available from the main community route.",
    sourceHref: "/goats",
    sourceLabel: "Open GOATS",
    points: ["Approved public gallery", "Policy-aware submissions", "Account and media boundaries enforced"],
  },
  giftCards: {
    eyebrow: "Gift cards",
    title: "Gift cards need a real handoff.",
    description: "The current store offers a Third Railify™ gift card in CAD with preset and custom amounts.",
    status: "Gift cards are not currently available. No purchase, payment, or delivery action is exposed here.",
    points: ["Issuance disabled", "Payments disabled", "No balance or delivery workflow"],
  },
};

export function RouteShellPage({ routeKey }: { routeKey: RouteKey }) {
  const route = content[routeKey];
  return (
    <section className="route-hero">
      <SignalField />
      <div className="route-hero__signal" aria-hidden="true"><span /><span /><span /></div>
      <div className="container route-hero__grid">
        <div className="route-hero__copy">
          <p className="eyebrow">{route.eyebrow}</p>
          <h1>{route.title}</h1>
          <p className="route-lede">{route.description}</p>
          <div className="route-status"><BoltIcon /><span><strong>Current status</strong>{route.status}</span></div>
          <div className="button-row">
            {route.sourceHref ? <a className="button button--primary" href={route.sourceHref} target="_blank" rel="noreferrer">{route.sourceLabel} <ArrowIcon /></a> : null}
            <Link className="button button--secondary" to="/">Back home</Link>
          </div>
        </div>
        <div className="route-card">
          <div className="route-card__mark"><BoltIcon /><span>TR / V2</span></div>
          <div className="route-card__list">{route.points.map((point, index) => <div key={point}><span>0{index + 1}</span><strong>{point}</strong></div>)}</div>
        </div>
      </div>
    </section>
  );
}
