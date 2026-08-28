import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import goatField from "../../assets/backgrounds/farm1.webp";
import discordIcon from "../../assets/icons/discord.svg";
import pilledIcon from "../../assets/icons/pilled.svg";
import rumbleIcon from "../../assets/icons/rumble.svg";
import tiktokIcon from "../../assets/icons/tiktok.svg";
import twitterIcon from "../../assets/icons/twitter.svg";
import youtubeIcon from "../../assets/icons/youtube.svg";
import shawnGinaHero from "../../assets/illustrations/shawn-gina-hero.webp";
import abootNothingFeature from "../../assets/illustrations/universe-aboot-nothing.webp";
import newsHangoutFeature from "../../assets/illustrations/universe-news-hangout.webp";
import popCultureFeature from "../../assets/illustrations/universe-pop-culture-beat-down.webp";
import ginaPortrait from "../../assets/people/gina1x.webp";
import shawnPortrait from "../../assets/people/shawn1x.webp";
import { ProductCard } from "../components/ProductCard";
import { DiscordCommunityWidget } from "../components/DiscordCommunityWidget";
import { SignalField } from "../components/SignalField";
import { ArrowIcon, BoltIcon, PlayIcon, RadioIcon } from "../components/Icons";
import { BroadcastMetadata, BroadcastPlayer } from "../components/BroadcastComponents";
import { useBroadcast } from "../hooks/useBroadcast";
import { catalogueProvider } from "../lib/catalogueProvider";
import type { CatalogueProduct } from "../types/catalogue";

const platforms = [
  { label: "Rumble", note: "Primary channel", href: "https://rumble.com/ThirdRailify", icon: rumbleIcon },
  { label: "YouTube", note: "Videos + clips", href: "https://www.youtube.com/@ThirdRailify", icon: youtubeIcon },
  { label: "Pilled", note: "Live community", href: "https://pilled.net/ThirdRailify", icon: pilledIcon },
  { label: "X", note: "Posts + updates", href: "https://x.com/ThirdRailify", icon: twitterIcon },
  { label: "TikTok", note: "Short-form chaos", href: "https://www.tiktok.com/@thirdrailifyoffical", icon: tiktokIcon },
  { label: "Discord", note: "Join the herd", href: "https://discord.com/invite/Bd8hU5aFxA", icon: discordIcon },
];

export function HomePage() {
  const { data, loading } = useBroadcast();
  const primary = data?.primary ?? null;
  const live = Boolean(data?.liveNow.length);
  const primaryIsLive = primary?.presentationState === "live";
  const livePlatforms: ReadonlySet<string> = new Set(data?.liveNow.map((candidate) => candidate.platform) ?? []);
  const liveDestinations: ReadonlyMap<string, string> = new Map(data?.liveNow.map((candidate) => [candidate.platform, candidate.watchUrl]) ?? []);
  const [merchProducts, setMerchProducts] = useState<CatalogueProduct[]>([]);
  useEffect(() => { const controller = new AbortController(); catalogueProvider.load(controller.signal).then((snapshot) => setMerchProducts([...snapshot.products].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (a.featuredOrder ?? Infinity) - (b.featuredOrder ?? Infinity)).slice(0, 3))).catch(() => setMerchProducts([])); return () => controller.abort(); }, []);
  return (
    <>
      <section className="home-hero">
        <SignalField />
        <div className="container home-hero__grid">
          <div className="home-hero__copy">
            <p className="eyebrow"><i /> A daily podcast · Sunday—Friday</p>
            <h1>News.<br />Culture.<br /><span className="hero-feature-text">Chaos.</span></h1>
            <p className="hero-lede">News, crime, and pop culture stories filtered through Shawn and Gina—and the detours nobody planned.</p>
            <div className="button-row">
              <Link className={`button button--primary${live ? " button--live" : ""}`} to="/watch"><PlayIcon /> {live ? "Watch live now" : "Watch latest episode"}</Link>
              <Link className="button button--secondary" to="/shop">Explore merch <ArrowIcon /></Link>
            </div>
            <div className="hero-facts" aria-label="Show facts">
              <span><strong>10 PM</strong><small>Eastern</small></span>
              <span><strong>6 nights</strong><small>Sunday—Friday</small></span>
              <span><strong>Daily</strong><small>News + hangout</small></span>
            </div>
          </div>
          <div className="hero-portrait">
            <div className="hero-portrait__top"><span><RadioIcon /> Shawn + Gina</span><b>TR / SIGNAL 01</b></div>
            <div className="hero-portrait__field" aria-hidden="true">
              <span className="hero-portrait__orbit hero-portrait__orbit--outer" />
              <span className="hero-portrait__orbit hero-portrait__orbit--inner" />
              <span className="hero-portrait__rail" />
            </div>
            <img className="hero-portrait__image" src={shawnGinaHero} alt="Illustrated joined portrait of Shawn and Gina divided by the Third Railify wordmark" />
            <div className="hero-portrait__links" aria-label="Meet the hosts">
              <Link to="/shawn"><span>01 / Third Railify</span><strong>Shawn</strong></Link>
              <Link to="/gina"><span>02 / Just Gina™</span><strong>Gina</strong></Link>
            </div>
            <div className="hero-portrait__bottom"><span><i /> Signal ready</span><span>Two hosts. One live wire.</span></div>
          </div>
        </div>
        <div className="hero-ticker" aria-hidden="true"><div>THIRD RAILIFY <i>↯</i> NEWS HANGOUT <i>↯</i> ABOOT NOTHING <i>↯</i> POP CULTURE BEAT DOWN <i>↯</i> THIRD RAILIFY <i>↯</i> NEWS HANGOUT <i>↯</i> ABOOT NOTHING <i>↯</i> POP CULTURE BEAT DOWN <i>↯</i></div></div>
      </section>

      <section className="platform-strip" aria-labelledby="platform-title">
        <div className="container platform-grid">
          <div className="platform-intro"><span className="eyebrow">Transmission</span><h2 id="platform-title">Pick your signal.</h2></div>
          {platforms.slice(0, 4).map((platform) => {
            const platformKey = platform.label.toLowerCase();
            const isLive = livePlatforms.has(platformKey);
            return <a key={platform.label} className={isLive ? "is-live" : ""} href={liveDestinations.get(platformKey) ?? platform.href} target="_blank" rel="noreferrer"><i className="platform-icon" aria-hidden="true"><img src={platform.icon ?? ""} alt="" /></i><span><strong>{platform.label}</strong><small>{isLive ? "Live now" : platform.note}</small></span><ArrowIcon /></a>;
          })}
        </div>
      </section>

      <section className="section show-intro">
        <div className="container split-heading">
          <div><p className="eyebrow">Start here</p><h2>The argument is already in progress.</h2></div>
          <div><p>Third Railify is a daily podcast built around current events, crime, pop culture, community energy, and an intentionally unpredictable route through all of it.</p><Link className="text-link" to="/watch">Find the latest show <ArrowIcon /></Link></div>
        </div>
        <div className={`container broadcast-card${primaryIsLive ? " is-live" : ""}`}>
          <BroadcastPlayer candidate={primary} />
          <div className="broadcast-card__copy">
            {primary && data ? <BroadcastMetadata candidate={primary} freshness={data.freshness} /> : (
              <><p className="eyebrow">Validated signal</p><h3>{loading ? "Acquiring the latest broadcast." : "The signal is temporarily unavailable."}</h3><p>The browser does not scrape providers or invent a live state. Direct platform routes remain available on the Watch page.</p><Link className="button button--outline" to="/watch">Open Watch <ArrowIcon /></Link></>
            )}
          </div>
        </div>
      </section>

      <section className="section section--panel universe-section">
        <div className="container split-heading">
          <div><p className="eyebrow">The show universe</p><h2>Three ways off the rail.</h2></div>
          <p>Recurring live-site formats, brought forward as a cleaner editorial system.</p>
        </div>
        <div className="container universe-grid">
          <article>
            <div className="universe-card__art"><img src={abootNothingFeature} alt="" loading="lazy" decoding="async" /></div>
            <div className="universe-card__body"><span>01 / DEBATE</span><h3>Aboot Nothing</h3><p>Head-to-head arguments over the questions nobody else thought to ask.</p><b>Sunday + Wednesday</b></div>
          </article>
          <article>
            <div className="universe-card__art"><img src={popCultureFeature} alt="" loading="lazy" decoding="async" /></div>
            <div className="universe-card__body"><span>02 / CULTURE</span><h3>Pop Culture Beat Down</h3><p>Monday-night collisions with entertainment, culture, and whatever started the argument.</p><b>Monday</b></div>
          </article>
          <article>
            <div className="universe-card__art"><img src={newsHangoutFeature} alt="" loading="lazy" decoding="async" /></div>
            <div className="universe-card__body"><span>03 / CURRENT</span><h3>News Hangout</h3><p>The day's stories, live commentary, and a community that never stays in its lane.</p><b>Tuesday + Thursday + Friday</b></div>
          </article>
        </div>
      </section>

      <section className="section hosts-section">
        <div className="container section-heading"><p className="eyebrow">Meet the instigators</p><h2>Two hosts.<br />One live wire.</h2></div>
        <div className="container host-grid">
          <article className="host-card host-card--shawn">
            <div className="host-card__image"><img src={shawnPortrait} alt="Portrait of Shawn" /></div>
            <div className="host-card__body"><small>Host · @ThirdRailify</small><h3>Shawn</h3><p>Daily news, crime, and pop culture with the perspective—and detours—that define Third Railify.</p><Link className="text-link" to="/shawn">Meet Shawn <ArrowIcon /></Link></div>
          </article>
          <article className="host-card host-card--gina">
            <div className="host-card__image"><img src={ginaPortrait} alt="Portrait of Gina" /></div>
            <div className="host-card__body"><small>Host · @JustGina</small><h3>Gina</h3><p>Sass, smarts, humor, mysteries, and culture in a distinct Just Gina lane inside the shared show universe.</p><Link className="text-link" to="/gina">Meet Gina <ArrowIcon /></Link></div>
          </article>
        </div>
      </section>

      <section className="section section--panel merch-preview">
        <div className="container split-heading">
          <div><p className="eyebrow">From the replacement store</p><h2>Merch with lore attached.</h2></div>
          <div><p>Products, variants, images, and CAD prices come from the replacement commerce catalogue. Checkout remains disabled before cutover.</p><Link className="text-link" to="/shop">Explore the catalogue <ArrowIcon /></Link></div>
        </div>
        <div className="container product-grid product-grid--featured">
          {merchProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </div>
      </section>

      <section className="section community-section">
        <div className="container community-stage">
          <div className="community-grid">
            <div className="community-image"><img src={goatField} alt="Third Railify goat community artwork" /><span>THE HERD / IN THE WILD</span></div>
            <div className="community-copy"><p className="eyebrow">The herd is part of the show</p><h2>Community without the clutter.</h2><p>Find friends of the show, see GOATs in the wild, explore VIP, or donate to the production—each with a clear home.</p><div className="community-links"><Link to="/friends">Friends <ArrowIcon /></Link><Link to="/community">Wild Goats <ArrowIcon /></Link><Link to="/vip">VIP <ArrowIcon /></Link><Link to="/donate">Donate <ArrowIcon /></Link></div></div>
          </div>
          <DiscordCommunityWidget mode="compact" />
        </div>
      </section>

      <section className="section follow-section">
        <div className="container follow-grid">
          <div><p className="eyebrow">Across the signal</p><h2>Follow the rail.</h2></div>
          <div className="follow-links">
            {platforms.map((platform, index) => {
              const platformKey = platform.label.toLowerCase();
              const isLive = livePlatforms.has(platformKey);
              return <a key={platform.label} className={isLive ? "is-live" : ""} href={liveDestinations.get(platformKey) ?? platform.href} target="_blank" rel="noreferrer"><span>0{index + 1}</span><i className="follow-icon" aria-hidden="true"><img src={platform.icon} alt="" /></i><strong>{platform.label}</strong><small>{isLive ? "Live now" : platform.note}</small><ArrowIcon /></a>;
            })}
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <div className="container newsletter-grid">
          <BoltIcon />
          <div><p className="eyebrow">Newsletter migration pending</p><h2>New drops. New episodes. One signal.</h2></div>
          <div className="newsletter-pending"><span>Email signup will return when a production mail service is connected.</span><button type="button" disabled>Not connected</button></div>
        </div>
      </section>
    </>
  );
}
