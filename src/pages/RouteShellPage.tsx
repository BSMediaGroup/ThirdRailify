import { Link } from "react-router-dom";
import { ArrowIcon, BoltIcon } from "../components/Icons";
import { SignalField } from "../components/SignalField";

type RouteKey = "friends" | "community" | "vip" | "giftCards";

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
  friends: {
    eyebrow: "Friends of the show",
    title: "Help the wider herd grow.",
    description: "The current directory highlights creators across entertainment, news, law, gaming, finance, outdoor content, and more.",
    status: "The creator directory and its individual deep links remain on Wix until a verified content source is connected.",
    sourceHref: "https://www.thirdrailify.com/friends",
    sourceLabel: "Browse current Friends directory",
    points: ["Creator profiles", "External channel destinations", "Community discovery without Admin links"],
  },
  community: {
    eyebrow: "GOATs in the wild",
    title: "The merch has left the station.",
    description: "The current community gallery lets viewers share Third Railify and Just Gina merch in the wild.",
    status: "Uploads, comments, likes, locations, and member identity are not implemented in this public scaffold.",
    sourceHref: "https://www.thirdrailify.com/goats",
    sourceLabel: "See the current gallery",
    points: ["Community gallery route preserved", "Submission flow deferred", "No member data copied into V2"],
  },
  vip: {
    eyebrow: "Community + membership",
    title: "Discover the GOAT within.",
    description: "The current Wix plan surface lists four monthly tiers in CAD: Baby GOAT, Blossom GOAT, Mega GOAT, and Improbable GOAT.",
    status: "Membership purchase, benefits, identity, entitlement, and billing are not connected in V2.",
    sourceHref: "https://www.thirdrailify.com/pricing-plans/list",
    sourceLabel: "Review current VIP plans",
    points: ["Baby GOAT · CA$3/month", "Blossom GOAT · CA$9/month", "Mega GOAT · CA$18/month · Improbable GOAT · CA$99/month"],
  },
  giftCards: {
    eyebrow: "Current Wix commerce",
    title: "Gift cards need a real handoff.",
    description: "The current store offers a Third Railify™ gift card in CAD with preset and custom amounts.",
    status: "Gift-card issuance, balance, delivery, and payment remain entirely on Wix for this milestone.",
    sourceHref: "https://www.thirdrailify.com/gift",
    sourceLabel: "Open current gift cards",
    points: ["Current presets start at CA$15", "Scheduled or immediate delivery", "No V2 purchase flow"],
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
          <div className="route-status"><BoltIcon /><span><strong>Migration-stage route</strong>{route.status}</span></div>
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
