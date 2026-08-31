import { Link } from "react-router-dom";
import goatField from "../../assets/backgrounds/farm1.webp";
import discordIcon from "../../assets/icons/discord-0.svg";
import { DiscordCommunityWidget } from "../components/DiscordCommunityWidget";
import { ArrowIcon, BoltIcon } from "../components/Icons";
import { VipFeatureCard } from "../components/VipFeatureCard";
import { useMotionGate } from "../hooks/useMotionGate";
import { THIRD_RAILIFY_DISCORD_FALLBACK_INVITE } from "../lib/discordWidget";

const communityPaths = [
  { index: "01", label: "Friends", copy: "Meet the people and projects already connected to the show.", href: "/friends", external: false },
  { index: "02", label: "GOATs in the wild", copy: "The current community gallery path for Third Railify out in the world.", href: "/goats", external: false },
  { index: "03", label: "Competition wheels", copy: "Demo-spin public draws or open an approved creator-controlled wheel.", href: "/wheels", external: false },
  { index: "04", label: "Live polls", copy: "Vote in audience polls and follow authoritative results across the web and live Rumble signal.", href: "/polls", external: false },
];

function CommunityHeroSignalField() {
  return (
    <div className="community-hero-signal" aria-hidden="true">
      <div className="community-hero-signal__mesh" />
      <div className="community-hero-signal__aurora"><i /><i /><i /></div>
      <svg className="community-hero-signal__routes" viewBox="0 0 1600 760" preserveAspectRatio="none">
        <defs>
          <linearGradient id="community-route-gold" x1="0" x2="1">
            <stop stopColor="#ffd12f" stopOpacity="0" />
            <stop offset=".28" stopColor="#ffd12f" stopOpacity=".72" />
            <stop offset=".68" stopColor="#fff0a8" stopOpacity=".92" />
            <stop offset="1" stopColor="#8ca9ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="community-route-blue" x1="0" x2="1">
            <stop stopColor="#5865f2" stopOpacity="0" />
            <stop offset=".42" stopColor="#8ca9ff" stopOpacity=".7" />
            <stop offset="1" stopColor="#ffd12f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="community-hero-signal__contours">
          <path d="M-80 585C122 520 230 590 396 505S640 276 856 346s303 192 510 78 238-169 340-148" />
          <path d="M-70 645C145 572 286 646 452 554s240-198 447-124 295 172 487 73 235-151 319-138" />
          <path d="M-90 492C124 430 246 488 376 412s232-209 430-158 326 188 518 70 258-188 390-164" />
          <path d="M98 82C246 152 315 242 466 264s240-91 411-22 272 194 455 128 208-152 349-126" />
        </g>
        <g className="community-hero-signal__live-routes">
          <path className="community-hero-signal__route community-hero-signal__route--one" d="M-80 585C122 520 230 590 396 505S640 276 856 346s303 192 510 78 238-169 340-148" />
          <path className="community-hero-signal__route community-hero-signal__route--two" d="M-70 645C145 572 286 646 452 554s240-198 447-124 295 172 487 73 235-151 319-138" />
          <path className="community-hero-signal__route community-hero-signal__route--three" d="M98 82C246 152 315 242 466 264s240-91 411-22 272 194 455 128 208-152 349-126" />
        </g>
        <g className="community-hero-signal__nodes">
          <g transform="translate(396 505)"><circle r="4" /><circle className="community-hero-signal__node-ring" r="15" /><text x="13" y="-12">FRIENDS</text></g>
          <g transform="translate(856 346)"><circle r="4" /><circle className="community-hero-signal__node-ring" r="15" /><text x="13" y="-12">CHAT</text></g>
          <g transform="translate(1366 424)"><circle r="4" /><circle className="community-hero-signal__node-ring" r="15" /><text x="13" y="-12">HERD</text></g>
          <g transform="translate(1332 370)"><circle r="3" /><circle className="community-hero-signal__node-ring" r="12" /></g>
        </g>
      </svg>
      <div className="community-hero-signal__core">
        <i /><i /><i />
        <div><BoltIcon /><strong>HERD</strong><small>LIVE CIRCUIT</small></div>
      </div>
      <div className="community-hero-signal__particles">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
      <div className="community-hero-signal__telemetry"><span>COMMUNITY / INPUT OPEN</span><i /><strong>THE HERD IS ON THE WIRE</strong></div>
      <div className="community-hero-signal__sweep" />
    </div>
  );
}

export function CommunityPage() {
  const heroMotion = useMotionGate<HTMLElement>();

  return (
    <>
      <section ref={heroMotion.ref} className={`community-hero${heroMotion.active ? " is-active" : ""}`} data-motion={heroMotion.active ? "active" : "static"} aria-labelledby="community-page-title">
        <CommunityHeroSignalField />
        <div className="container community-hero__grid">
          <div className="community-hero__copy">
            <p className="eyebrow">Official community · The Herd</p>
            <h1 id="community-page-title">The herd runs on a <span className="hero-feature-text">live wire.</span></h1>
            <p>Third Railify is built with the people who show up, laugh along, and keep the conversation moving after the show leaves the rail.</p>
            <div className="button-row">
              <a className="button button--primary" href={THIRD_RAILIFY_DISCORD_FALLBACK_INVITE} target="_blank" rel="noopener noreferrer"><img src={discordIcon} alt="" /> Join Discord</a>
              <Link className="button button--secondary" to="/friends">Meet the friends <ArrowIcon /></Link>
            </div>
          </div>
          <div className="community-hero__art">
            <img src={goatField} alt="Third Railify goat community artwork" />
            <div className="community-hero__radar" aria-hidden="true"><i /><i /><b /></div>
            <div className="community-hero__caption"><span>TR / HERD 01</span><strong>COMMUNITY SIGNAL</strong></div>
          </div>
        </div>
      </section>

      <section className="section community-live-section" aria-labelledby="community-live-title">
        <div className="container split-heading">
          <div><p className="eyebrow">Public community signal</p><h2 id="community-live-title">The herd, live.</h2></div>
          <p>Explore public community channels and bounded member profiles from the Third Railify bot, with Discord's basic public preview retained whenever that richer signal is unavailable.</p>
        </div>
        <div className="container"><DiscordCommunityWidget mode="full" /></div>
      </section>

      <section className="section section--panel community-paths-section" aria-labelledby="community-paths-title">
        <div className="container split-heading">
          <div><p className="eyebrow">Community paths</p><h2 id="community-paths-title">Find your way into the herd.</h2></div>
          <p>Each path points to something that exists today. No member feed, forum, chat archive, or event system is implied.</p>
        </div>
        <div className="container community-paths">
          {communityPaths.map((path) => {
            const content = <><span>{path.index}</span><div><h3>{path.label}</h3><p>{path.copy}</p></div><ArrowIcon /></>;
            return path.external
              ? <a key={path.label} href={path.href} target="_blank" rel="noopener noreferrer">{content}</a>
              : <Link key={path.label} to={path.href}>{content}</Link>;
          })}
        </div>
        <div className="container community-vip-feature"><VipFeatureCard /></div>
      </section>

      <section className="section community-boundary-section">
        <div className="container community-boundary">
          <p className="eyebrow">What is live now</p>
          <h2>Community presence, without pretending there is more.</h2>
          <p>The Discord module can show whitelisted public channels, visible voice spaces, and a bounded member directory. It never publishes messages, private channels, permissions, internal roles, moderation data, credentials, or hidden membership data.</p>
          <a className="text-link" href={THIRD_RAILIFY_DISCORD_FALLBACK_INVITE} target="_blank" rel="noopener noreferrer">Open Discord <ArrowIcon /></a>
        </div>
      </section>
    </>
  );
}
