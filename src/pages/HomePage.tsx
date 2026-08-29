import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useOutletContext } from "react-router-dom";
import goatField from "../../assets/backgrounds/farm1.webp";
import tripleZapMark from "../../assets/icons/trzap-0.svg";
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
import { VipFeatureCard } from "../components/VipFeatureCard";
import { SignalField } from "../components/SignalField";
import { ArrowIcon, BoltIcon, MailIcon, PlayIcon, RadioIcon } from "../components/Icons";
import { BroadcastMetadata, BroadcastPlayer } from "../components/BroadcastComponents";
import { ContactDialog } from "../contact/ContactDialog";
import { useAuth } from "../auth/AuthProvider";
import { useBroadcast } from "../hooks/useBroadcast";
import { catalogueProvider } from "../lib/catalogueProvider";
import type { CatalogueProduct } from "../types/catalogue";
import { DEFAULT_HOME_RAIL, type BannerConfig } from "../lib/banner";
import { effectiveLiveCandidates } from "../lib/liveBanner";
import type { SiteShellOutletContext } from "../components/SiteShell";

const platforms = [
  { label: "Rumble", note: "Primary channel", href: "https://rumble.com/ThirdRailify", icon: rumbleIcon },
  { label: "YouTube", note: "Videos + clips", href: "https://www.youtube.com/@ThirdRailify", icon: youtubeIcon },
  { label: "Pilled", note: "Live community", href: "https://pilled.net/ThirdRailify", icon: pilledIcon },
  { label: "X", note: "Posts + updates", href: "https://x.com/ThirdRailify", icon: twitterIcon },
  { label: "TikTok", note: "Short-form chaos", href: "https://www.tiktok.com/@thirdrailifyoffical", icon: tiktokIcon },
  { label: "Discord", note: "Join the herd", href: "https://discord.com/invite/Bd8hU5aFxA", icon: discordIcon },
];

const tripleZapMask = { "--triple-zap-mask": `url("${tripleZapMark}")` } as CSSProperties;

export function HomePage() {
  const { bannerConfig } = useOutletContext<SiteShellOutletContext>();
  const { config } = useAuth();
  const { data, loading } = useBroadcast();
  const primary = data?.primary ?? null;
  const confirmedLive = effectiveLiveCandidates(data);
  const live = confirmedLive.length > 0;
  const primaryIsLive = Boolean(primary && confirmedLive.some((candidate) => candidate.key === primary.key));
  const livePlatforms: ReadonlySet<string> = new Set(confirmedLive.map((candidate) => candidate.platform));
  const liveDestinations: ReadonlyMap<string, string> = new Map(confirmedLive.map((candidate) => [candidate.platform, candidate.watchUrl]));
  const [merchProducts, setMerchProducts] = useState<CatalogueProduct[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const contactTrigger = useRef<HTMLButtonElement>(null);
  const closeContact = useCallback(() => { setContactOpen(false); window.requestAnimationFrame(() => contactTrigger.current?.focus()); }, []);
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
        <HomeContentRail config={bannerConfig?.homeRail ?? DEFAULT_HOME_RAIL} />
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
        <div className={`container broadcast-card${primaryIsLive ? " is-live live-event-perimeter" : ""}`}>
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

      <section className="section home-vip-section" aria-label="Third Railify VIP preview"><div className="container"><VipFeatureCard compact /></div></section>

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

      <section className="contact-band" aria-labelledby="contact-band-title">
        <div className="container contact-band__grid">
          <BoltIcon />
          <div><p className="eyebrow">Direct line / community powered</p><h2 id="contact-band-title">Reach the rail.<br />Power the signal.</h2></div>
          <div className="contact-band__actions"><p>Send a secure message to Third Railify, or help sustain the independent production behind the show.</p><div><button ref={contactTrigger} className="button contact-band__contact" type="button" onClick={() => setContactOpen(true)}><MailIcon /> Contact</button><Link className="button contact-band__donate" to="/donate">Donate <ArrowIcon /></Link></div></div>
        </div>
      </section>
      {contactOpen && <ContactDialog siteKey={config?.turnstileSiteKey ?? null} onClose={closeContact} />}
    </>
  );
}

function HomeContentRail({ config }: { config: BannerConfig["homeRail"] }) {
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [repetitions, setRepetitions] = useState(2);
  const railRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (config.mode !== "crossfade" || reducedMotion || config.items.length < 2) return;
    const delay = config.speed === "slow" ? 6500 : config.speed === "fast" ? 2600 : 4200;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % config.items.length), delay);
    return () => window.clearInterval(timer);
  }, [config.items.length, config.mode, config.speed, reducedMotion]);
  useEffect(() => { setActive(0); }, [config.items]);
  const mode = reducedMotion ? "static" : config.mode;
  const itemsKey = config.items.join("\u0000");
  useLayoutEffect(() => {
    if (mode !== "marquee" || !railRef.current || !measureRef.current) return;
    const update = () => {
      const cycleWidth = measureRef.current?.scrollWidth || 1;
      const viewportWidth = railRef.current?.clientWidth || 1;
      setRepetitions((current) => {
        const next = Math.max(2, Math.ceil(viewportWidth / cycleWidth) + 1);
        return current === next ? current : next;
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(railRef.current);
    observer.observe(measureRef.current);
    return () => observer.disconnect();
  }, [config.glyph, itemsKey, mode]);
  if (!config.enabled || !config.items.length) return null;
  const cycleSeconds = config.speed === "slow" ? 42 : config.speed === "fast" ? 18 : 28;
  return <aside ref={railRef} className={`hero-ticker hero-ticker--${mode} is-${config.speed} is-${config.easing}`} aria-label="Homepage topics">
    {mode === "marquee" ? <><div ref={measureRef} className="hero-ticker__measure" aria-hidden="true"><RailSegment items={config.items} glyph={config.glyph} /></div><div className="hero-ticker__track" style={{ animationDuration: `${cycleSeconds * repetitions}s` }}><RailSegment items={config.items} glyph={config.glyph} repetitions={repetitions} /><RailSegment items={config.items} glyph={config.glyph} repetitions={repetitions} duplicate /></div></>
      : mode === "crossfade" ? <div className="hero-ticker__crossfade" key={`${active}-${config.items[active]}`}>{config.items[active]}</div>
      : <RailSegment items={config.items} glyph={config.glyph} />}
  </aside>;
}

function RailSegment({ items, glyph, repetitions = 1, duplicate = false }: { items: string[]; glyph: BannerConfig["homeRail"]["glyph"]; repetitions?: number; duplicate?: boolean }) {
  return <div className="hero-ticker__segment" aria-hidden={duplicate || undefined}>{Array.from({ length: repetitions }, (_, cycle) => items.map((item, index) => <span key={`${cycle}-${item}-${index}`}>{item}<RailGlyph glyph={glyph} /></span>))}</div>;
}

function RailGlyph({ glyph }: { glyph: BannerConfig["homeRail"]["glyph"] }) {
  if (glyph === "zap") return <i className="hero-ticker__zap" style={tripleZapMask} aria-hidden="true" />;
  return <i aria-hidden="true">{glyph === "arrow" ? "↯" : glyph === "diamond" ? "◆" : "•"}</i>;
}
