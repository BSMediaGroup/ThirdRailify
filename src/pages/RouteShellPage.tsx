import { Link } from "react-router-dom";
import ginaPortrait from "../../assets/people/pfp-gina.webp";
import shawnPortrait from "../../assets/people/PFPXTRO2F.webp";
import { ArrowIcon, BoltIcon, PlayIcon } from "../components/Icons";

type RouteKey = "watch" | "shawn" | "gina" | "about" | "friends" | "community" | "vip" | "support" | "giftCards" | "policies" | "terms" | "privacy" | "refunds" | "accessibility";

type RouteContent = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  sourceHref?: string;
  sourceLabel?: string;
  points: string[];
  image?: string;
  accent?: "gina" | "gold";
};

const content: Record<RouteKey, RouteContent> = {
  watch: {
    eyebrow: "Live + latest",
    title: "The show is already in progress.",
    description: "The V2 watch hub is staged for migration. Rumble remains the verified primary channel today.",
    status: "Archive and live-status integration are not connected in this milestone.",
    sourceHref: "https://rumble.com/ThirdRailify",
    sourceLabel: "Watch on Rumble",
    points: ["Sunday—Friday", "10 PM Eastern", "News Hangout · Aboot Nothing · Pop Culture Beat Down"],
  },
  shawn: {
    eyebrow: "Host · @ThirdRailify",
    title: "Shawn",
    description: "Daily news, crime, pop culture, and very ADHD commentary from the stay-at-home dad at the centre of Third Railify.",
    status: "The complete host archive and submission flows remain on the current site while this page is migrated.",
    sourceHref: "https://www.thirdrailify.com/shawn",
    sourceLabel: "Open current Shawn page",
    points: ["Third Railify host", "Sunday—Friday at 10 PM Eastern", "Rumble · YouTube · Pilled · X · TikTok · Pickax"],
    image: shawnPortrait,
  },
  gina: {
    eyebrow: "Host · @JustGina",
    title: "Gina",
    description: "Sass, smarts, humor, conspiracies, and culture—plus a distinct Just Gina identity inside the Third Railify universe.",
    status: "The dedicated live Gina route was intermittently unreadable during audit; only facts visible on the home surface are carried here.",
    sourceHref: "https://www.thirdrailify.com/gina",
    sourceLabel: "Open current Gina page",
    points: ["Just Gina™ host", "Third Railify co-host", "Just Gina currently lists a Saturday 9 PM Eastern show"],
    image: ginaPortrait,
    accent: "gina",
  },
  about: {
    eyebrow: "About the show",
    title: "A proper story belongs here.",
    description: "The current About page still contains generic Wix FAQ placeholders. V2 will replace them with verified show history, format, host context, and contact information.",
    status: "Placeholder copy has deliberately not been reproduced or embellished.",
    sourceHref: "https://www.thirdrailify.com/about",
    sourceLabel: "Review current About page",
    points: ["Show history pending", "Media and contact context pending", "No generic FAQ filler"],
  },
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
  support: {
    eyebrow: "Support the production",
    title: "Keep the mics hot.",
    description: "The current Wix surface accepts one-time, monthly, and yearly CAD donations.",
    status: "No donation or payment flow is implemented here. V2 will not accept or simulate a transaction.",
    sourceHref: "https://www.thirdrailify.com/donate-1",
    sourceLabel: "Open current support page",
    points: ["One-time support", "Monthly support", "Yearly support"],
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
  policies: {
    eyebrow: "Legal migration index",
    title: "Policies stay visible during the move.",
    description: "The current policy index links terms, privacy, refunds, accessibility, and VIP plan policies.",
    status: "These V2 shells preserve route intent; the authoritative legal copy has not yet been migrated.",
    sourceHref: "https://www.thirdrailify.com/policies",
    sourceLabel: "Open current policy index",
    points: ["Terms & Conditions", "Privacy + Refund policy", "Accessibility + VIP plan policies"],
  },
  terms: legal("Terms & Conditions", "https://www.thirdrailify.com/terms"),
  privacy: legal("Privacy Policy", "https://www.thirdrailify.com/privacy"),
  refunds: legal("Refund Policy", "https://www.thirdrailify.com/refunds"),
  accessibility: legal("Accessibility Statement", "https://www.thirdrailify.com/accessibility"),
};

function legal(title: string, sourceHref: string): RouteContent {
  return {
    eyebrow: "Legal route preserved",
    title,
    description: `The current ${title} remains available on Wix while its reviewed V2 migration is pending.`,
    status: "No legal text has been paraphrased, shortened, or invented in this scaffold.",
    sourceHref,
    sourceLabel: `Read current ${title}`,
    points: ["Deep-link intent preserved", "Current Wix copy remains authoritative", "Reviewed migration required before cutover"],
  };
}

export function RouteShellPage({ routeKey }: { routeKey: RouteKey }) {
  const route = content[routeKey];
  return (
    <section className={`route-hero${route.accent === "gina" ? " route-hero--gina" : ""}`}>
      <div className="route-hero__signal" aria-hidden="true"><span /><span /><span /></div>
      <div className="container route-hero__grid">
        <div className="route-hero__copy">
          <p className="eyebrow">{route.eyebrow}</p>
          <h1>{route.title}</h1>
          <p className="route-lede">{route.description}</p>
          <div className="route-status"><BoltIcon /><span><strong>Migration-stage route</strong>{route.status}</span></div>
          <div className="button-row">
            {route.sourceHref ? <a className="button button--primary" href={route.sourceHref} target="_blank" rel="noreferrer">{routeKey === "watch" ? <PlayIcon /> : null}{route.sourceLabel} <ArrowIcon /></a> : null}
            <Link className="button button--secondary" to="/">Back home</Link>
          </div>
        </div>
        <div className="route-card">
          {route.image ? <img src={route.image} alt="" /> : <div className="route-card__mark"><BoltIcon /><span>TR / V2</span></div>}
          <div className="route-card__list">{route.points.map((point, index) => <div key={point}><span>0{index + 1}</span><strong>{point}</strong></div>)}</div>
        </div>
      </div>
    </section>
  );
}
