import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon, BagIcon } from "./Icons";
import { FeaturedEmptySlot } from "./FeaturedMerchandising";
import { ProductPrice } from "./CurrencyPrice";
import { useMotionGate } from "../hooks/useMotionGate";
import { isShopHeroFeaturedEligible, selectFeaturedProducts, SHOP_HERO_FEATURED_CAPACITY } from "../lib/featuredMerchandising";
import type { CatalogueProduct } from "../types/catalogue";
import "../styles/shop-hero.css";

const DWELL_MS = 7000;
const TRANSITION_MS = 720;
const position = (index: number, total: number) => `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

export function ShopHero({ products, cartCount, openCart, loading, error }: { products: CatalogueProduct[]; cartCount: number; openCart: () => void; loading: boolean; error: boolean }) {
  const featured = useMemo(() => selectFeaturedProducts(products, SHOP_HERO_FEATURED_CAPACITY, isShopHeroFeaturedEligible), [products]);
  return <ShopHeroPresentation key={featured.map((product) => product.id).join("|")} products={products} featured={featured} cartCount={cartCount} openCart={openCart} loading={loading} error={error} />;
}

function ShopHeroPresentation({ products, featured, cartCount, openCart, loading, error }: { products: CatalogueProduct[]; featured: CatalogueProduct[]; cartCount: number; openCart: () => void; loading: boolean; error: boolean }) {
  const { ref, active: motionActive } = useMotionGate<HTMLElement>();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReducedMotion(media.matches); if (media.matches) { if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current); transitionTimer.current = null; setPreviousIndex(null); } };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const move = useCallback((offset: number) => {
    if (featured.length <= 1 || transitionTimer.current !== null) return;
    const current = activeIndexRef.current;
    const next = (current + offset + featured.length) % featured.length;
    setDirection(offset);
    if (!reducedMotion) {
      setPreviousIndex(current);
      transitionTimer.current = window.setTimeout(() => { setPreviousIndex(null); transitionTimer.current = null; }, TRANSITION_MS);
    }
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, [featured.length, reducedMotion]);
  const running = featured.length > 1 && motionActive && !reducedMotion && !paused && !hovered && !focused;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => move(1), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, running, move]);
  useEffect(() => () => { if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current); }, []);
  const active = featured[activeIndex];
  const state = error ? "error" : loading ? "loading" : "empty";
  return <section ref={ref} className="shop-hero shop-hero--drop shop-hero--cinema" aria-label="The official store" data-motion={motionActive ? "active" : "paused"}>
    <HeroSignalField />
    <div className="shop-hero__type" aria-hidden="true"><span>WEAR THE LORE</span></div>
    <div className="container shop-hero__grid">
      <div className="shop-hero__copy">
        <p className="eyebrow">The official store · Catalogue live</p>
        <h1>Wear the<br /><span className="hero-feature-text">lore.</span></h1>
        <p>Podcast merch with real catalogue variants and CAD pricing, with checkout held safely behind production gates.</p>
        <div className="button-row"><a className="button button--primary" href="#catalogue">Browse the store <ArrowIcon /></a>{active ? <Link className="button button--secondary" to={`/shop/${active.slug}`}>Open featured product</Link> : <button className="button button--secondary" type="button" onClick={openCart}><BagIcon /> Cart · {cartCount}</button>}</div>
        <div className="shop-facts"><span><strong>{loading || error ? "—" : products.length}</strong><small>Products</small></span><span><strong>{loading || error ? "—" : products.reduce((total, product) => total + (product.variants?.length || 0), 0)}</strong><small>Variants</small></span><span><strong>CAD</strong><small>D1 price authority</small></span></div>
      </div>
      <div className="featured-stage" role="region" aria-roledescription="carousel" aria-label="Featured products" data-running={running} style={{ "--deck-direction": direction, "--deck-dwell": `${DWELL_MS}ms`, "--deck-transition": `${TRANSITION_MS}ms` } as React.CSSProperties}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }} onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <div className="featured-stage__rails" aria-hidden="true" />
        <div className="featured-stage__caption" aria-hidden="true"><span>THIRD RAILIFY / SELECTED MERCH</span><span>EST. ON AIR</span></div>
        {active ? <>
          {previousIndex !== null ? <FeaturedFrame key={`exit-${previousIndex}`} products={featured} activeIndex={previousIndex} exiting /> : null}
          <FeaturedFrame key={active.id} products={featured} activeIndex={activeIndex} entering={previousIndex !== null} />
          <div className="featured-stage__console">
            <span className="featured-stage__index" aria-label={`Featured ${position(activeIndex, featured.length)}`}>{position(activeIndex, featured.length)}</span>
            <span className="featured-stage__progress" aria-hidden="true"><i key={`${activeIndex}-${running}`} className={running ? "is-running" : ""} /></span>
            {featured.length > 1 ? <div className="featured-stage__controls">
              <button type="button" onClick={() => move(-1)} aria-label="Previous featured product">←</button>
              <button type="button" onClick={() => setPaused((value) => !value)} disabled={reducedMotion} aria-pressed={paused || reducedMotion} aria-label={reducedMotion ? "Featured product rotation paused for reduced motion" : paused ? "Resume featured product rotation" : "Pause featured product rotation"} title={reducedMotion ? "Automatic rotation is disabled by your reduced-motion preference" : undefined}>{reducedMotion ? "Paused" : paused ? "Play" : "Pause"}</button>
              <button type="button" onClick={() => move(1)} aria-label="Next featured product">→</button>
            </div> : null}
          </div>
        </> : <div className="featured-stage__frame"><FeaturedEmptySlot variant="hero" index={0} state={state} className="featured-stage__active" />{[0, 1].map((index) => <FeaturedEmptySlot key={index} variant="support" index={index + 1} state={state} className={`featured-stage__support featured-stage__support--${index + 1}`} />)}</div>}
      </div>
    </div>
  </section>;
}

function FeaturedFrame({ products, activeIndex, entering, exiting }: { products: CatalogueProduct[]; activeIndex: number; entering?: boolean; exiting?: boolean }) {
  const active = products[activeIndex];
  const support = products.length > 1 ? [products[(activeIndex + products.length - 1) % products.length], products.length > 2 ? products[(activeIndex + 1) % products.length] : null] : [null, null];
  return <div className={`featured-stage__frame${exiting ? " featured-stage__frame--exiting" : entering ? " featured-stage__frame--entering" : ""}`} aria-hidden={exiting || undefined}>
    <Link className="featured-stage__active" to={`/shop/${active.slug}`} tabIndex={exiting ? -1 : undefined} aria-label={`Open ${active.name}, featured ${position(activeIndex, products.length)}`}>
      <DeckImage key={active.image} product={active} />
      <span className="featured-stage__details"><small>Featured {position(activeIndex, products.length)}</small><strong>{active.name}</strong><ProductPrice price={active.price} formattedPrice={active.formattedPrice} /><span className="featured-stage__open" aria-hidden="true">↗</span></span>
    </Link>
    {support.map((product, index) => product ? <div className={`featured-stage__support featured-stage__support--${index + 1}`} key={product.id} aria-hidden="true"><DeckImage key={product.image} product={product} decorative /></div> : <FeaturedEmptySlot key={index} variant="support" index={index + 1} className={`featured-stage__support featured-stage__support--${index + 1}`} />)}
  </div>;
}

function DeckImage({ product, decorative = false }: { product: CatalogueProduct; decorative?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <span className="featured-stage__image">{failed ? <span className="product-image-fallback" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : `${product.name} image unavailable`}>TR</span> : <img src={product.image} alt={decorative ? "" : product.name} width="720" height="900" onError={() => setFailed(true)} />}</span>;
}

function HeroSignalField() {
  return <div className="shop-signal" aria-hidden="true"><div className="shop-signal__light" /><svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none"><g className="shop-signal__paths"><path d="M-100 780H400Q470 780 530 720L950 300Q1010 240 1100 240H1700M-100 798H410Q480 798 540 738L960 318Q1020 258 1100 258H1700" /><path d="M200 1000 650 550Q710 490 800 490H1700M218 1000 668 550Q728 508 800 508H1700" /><circle cx="1150" cy="450" r="300" /><circle cx="1150" cy="450" r="320" /><path d="M830 450H1470M1150 130V770" /></g><g className="shop-signal__nodes"><circle cx="660" cy="588" r="5" /><circle cx="990" cy="273" r="5" /><circle cx="1150" cy="750" r="4" /></g><path className="shop-signal__pulse" d="M-100 780H400Q470 780 530 720L950 300Q1010 240 1100 240H1700" pathLength="100" /></svg></div>;
}
