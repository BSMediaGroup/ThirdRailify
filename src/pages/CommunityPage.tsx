import { Link } from "react-router-dom";
import goatField from "../../assets/backgrounds/farm1.webp";
import discordIcon from "../../assets/icons/discord.svg";
import { DiscordCommunityWidget } from "../components/DiscordCommunityWidget";
import { ArrowIcon } from "../components/Icons";
import { THIRD_RAILIFY_DISCORD_FALLBACK_INVITE } from "../lib/discordWidget";

const communityPaths = [
  { index: "01", label: "Friends", copy: "Meet the people and projects already connected to the show.", href: "/friends", external: false },
  { index: "02", label: "GOATs in the wild", copy: "The current community gallery path for Third Railify out in the world.", href: "/goats", external: false },
  { index: "03", label: "VIP", copy: "See the current membership path while the V2 account experience remains deferred.", href: "/vip", external: false },
  { index: "04", label: "Discord", copy: "Join the official community server and step into the live conversation.", href: THIRD_RAILIFY_DISCORD_FALLBACK_INVITE, external: true },
];

export function CommunityPage() {
  return (
    <>
      <section className="community-hero" aria-labelledby="community-page-title">
        <div className="container community-hero__grid">
          <div className="community-hero__copy">
            <p className="eyebrow">Official community · The Herd</p>
            <h1 id="community-page-title">The herd runs on a live wire.</h1>
            <p>Third Railify is built with the people who show up, laugh along, and keep the conversation moving after the show leaves the rail.</p>
            <div className="button-row">
              <a className="button button--primary" href={THIRD_RAILIFY_DISCORD_FALLBACK_INVITE} target="_blank" rel="noopener noreferrer"><img src={discordIcon} alt="" /> Join Discord</a>
              <Link className="button button--secondary" to="/friends">Meet the friends <ArrowIcon /></Link>
            </div>
          </div>
          <div className="community-hero__art">
            <img src={goatField} alt="Third Railify goat community artwork" />
            <div><span>TR / HERD 01</span><strong>COMMUNITY SIGNAL</strong></div>
          </div>
        </div>
      </section>

      <section className="section community-live-section" aria-labelledby="community-live-title">
        <div className="container split-heading">
          <div><p className="eyebrow">Live from Discord</p><h2 id="community-live-title">The herd, live.</h2></div>
          <p>See only the presence and voice spaces Discord exposes through the official public server widget, then join the community when you are ready.</p>
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
      </section>

      <section className="section community-boundary-section">
        <div className="container community-boundary">
          <p className="eyebrow">What is live now</p>
          <h2>Community presence, without pretending there is more.</h2>
          <p>The Discord module shows the server name, online presence count, publicly visible voice spaces, and a bounded public member directory. Third Railify does not read private channels, messages, roles, accounts, or hidden membership data here.</p>
          <a className="text-link" href={THIRD_RAILIFY_DISCORD_FALLBACK_INVITE} target="_blank" rel="noopener noreferrer">Open Discord <ArrowIcon /></a>
        </div>
      </section>
    </>
  );
}
