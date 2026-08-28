import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import goatHeroArtwork from "../../assets/illustrations/mountain-goat-cc0.svg";
import { ArrowIcon } from "../components/Icons";
import { CountryFlag } from "../goats/CountryFlag";
import { GoatProfileAvatar } from "../goats/GoatProfileAvatar";
import { getGoatListings, getGoatMap, getGoatProducts } from "../goats/client";
import type { GoatListing, GoatListingsPayload, GoatMapFeatureCollection, GoatProduct } from "../goats/types";

const GoatsMap = lazy(() => import("../goats/GoatsMap"));
const emptyPayload: GoatListingsPayload = { ok: true, items: [], page: 1, pageSize: 12, total: 0, stats: { listings: 0, countries: 0, products: 0 }, facets: { countries: [] } };
const emptyMap: GoatMapFeatureCollection = { type: "FeatureCollection", features: [] };

export function GoatsPage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = useState(emptyPayload);
  const [mapData, setMapData] = useState(emptyMap);
  const [products, setProducts] = useState<GoatProduct[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mapDataRef = useRef(mapData); mapDataRef.current = mapData;
  const pageRef = useRef(payload.page); pageRef.current = payload.page;
  const paramsRef = useRef(params); paramsRef.current = params;
  const query = useMemo(() => {
    const next = new URLSearchParams(params);
    next.set("pageSize", "12");
    return `?${next.toString()}`;
  }, [params]);

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    Promise.all([getGoatListings(query, controller.signal), getGoatMap(query, controller.signal), getGoatProducts(controller.signal)])
      .then(([next, geo, productOptions]) => { setPayload(next); setMapData(geo); setProducts(productOptions); setSelectedId((current) => current && next.items.some((item) => item.id === current) ? current : next.items[0]?.id || ""); })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "GOATS are unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const selected = payload.items.find((item) => item.id === selectedId) || null;
  const select = useCallback((id: string) => {
    setSelectedId(id);
    const targetPage = Number(mapDataRef.current.features.find((feature) => feature.properties.id === id)?.properties.galleryPage || pageRef.current);
    if (targetPage !== pageRef.current) {
      const next = new URLSearchParams(paramsRef.current); if (targetPage <= 1) next.delete("page"); else next.set("page", String(targetPage)); setParams(next, { replace: false });
    }
  }, [setParams]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.delete("page"); setParams(next, { replace: false });
  };
  const clear = () => setParams({}, { replace: false });
  const totalPages = Math.max(1, Math.ceil(payload.total / payload.pageSize));
  const goToPage = (page: number) => {
    const next = new URLSearchParams(params);
    if (page <= 1) next.delete("page"); else next.set("page", String(page));
    setParams(next, { replace: false });
    document.getElementById("goats-gallery-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <div className="goats-page">
    <section className="goats-hero">
      <div className="goats-hero__grid" aria-hidden="true" />
      <div className="goats-hero__goat-motif" aria-hidden="true" style={{ "--goats-hero-art": `url("${goatHeroArtwork}")` } as CSSProperties} />
      <div className="container goats-hero__content"><div><p className="eyebrow">Community signal · Worldwide</p><h1>GOATS <span>in the Wild</span></h1><p className="goats-hero__lead">Real people. Real merch. Approximate pins, approved stories, and the community wearing the lore beyond the rail.</p><div className="button-row"><Link className="button button--primary" to="/goats/submit">Submit your GOATED drip <ArrowIcon /></Link><a className="button button--secondary" href="#goats-map">Explore the map</a></div></div>
        <div className="goats-hero__telemetry">
          <div className="goats-hero__orbital" aria-hidden="true">
            <span className="goats-hero__sweep" />
            <span className="goats-hero__orbit goats-hero__orbit--outer" />
            <span className="goats-hero__orbit goats-hero__orbit--inner" />
            <span className="goats-hero__node goats-hero__node--sydney"><i />SYD</span>
            <span className="goats-hero__node goats-hero__node--toronto"><i />YYZ</span>
            <span className="goats-hero__node goats-hero__node--los-angeles"><i />LAX</span>
            <span className="goats-hero__node goats-hero__node--london"><i />LHR</span>
            <span className="goats-hero__axis goats-hero__axis--horizontal" />
            <span className="goats-hero__axis goats-hero__axis--vertical" />
            <div className="goats-hero__core"><small>Live map signal</small><strong>{String(payload.stats.listings).padStart(2, "0")}</strong><span>Approved coordinates</span></div>
            <div className="goats-hero__coordinates"><span>33.8688° S</span><span>43.6532° N</span></div>
          </div>
          <div className="goats-hero__signal" aria-label="Current approved community totals"><span><strong>{payload.stats.listings}</strong><small>Approved GOATS</small></span><span><strong>{payload.stats.countries}</strong><small>Countries</small></span><span><strong>{payload.stats.products}</strong><small>Products represented</small></span></div>
        </div>
      </div>
    </section>

    <main id="goats-discovery" className="container goats-discovery">
      <header className="goats-section-heading"><div><p className="eyebrow">Find the herd</p><h2>Stories with coordinates.</h2></div><p>Map positions show city-level approximations only. The list remains the complete, accessible way to browse.</p></header>
      <section className="goats-controls" aria-label="Filter approved GOATS">
        <label>Search<input type="search" value={params.get("search") || ""} onChange={(event) => update("search", event.target.value)} placeholder="Name, story, or location" /></label>
        <label>Product<select value={params.get("product") || ""} onChange={(event) => update("product", event.target.value)}><option value="">All products</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label>Country<select value={params.get("country") || ""} onChange={(event) => update("country", event.target.value)}><option value="">All countries</option>{payload.facets.countries.map((country) => <option key={country.code} value={country.code}>{country.code} ({country.count})</option>)}</select></label>
        <label>Minimum rating<select value={params.get("rating") || ""} onChange={(event) => update("rating", event.target.value)}><option value="">Any rating</option>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating}+ stars</option>)}</select></label>
        <label>Sort<select value={params.get("sort") || "newest"} onChange={(event) => update("sort", event.target.value)}><option value="newest">Newest</option><option value="most-liked">Most liked</option><option value="highest-rated">Highest rated</option></select></label>
        <button type="button" className="goats-clear" onClick={clear} disabled={!params.toString()}>Clear filters</button>
      </section>
      <p className="goats-result-count" role="status">{loading ? "Acquiring approved listings…" : `${payload.total} approved ${payload.total === 1 ? "listing" : "listings"}`}</p>
      {error ? <div className="goats-error" role="alert"><strong>The community signal is unavailable.</strong><p>{error}</p><button type="button" className="button button--secondary" onClick={() => window.location.reload()}>Retry</button></div> : null}

      {!error && <section id="goats-map" className="goats-map-stage" aria-labelledby="goats-map-title"><div className="goats-map-stage__top"><div><p className="eyebrow">Approximate by design</p><h2 id="goats-map-title">The GOATED family map.</h2></div><p>No street addresses. No device location. Just a coarse city-level signal confirmed before publication.</p></div>
        {loading ? <div className="goats-map-loading" aria-busy="true">Loading the map projection…</div> : mapData.features.length ? <div className="goats-map-stage__grid"><Suspense fallback={<div className="goats-map-loading">Loading the map engine…</div>}><GoatsMap data={mapData} selectedId={selectedId} onSelect={select} /></Suspense><SelectedListing item={selected} /></div> : <div className="goats-empty goats-empty--map"><span>00</span><div><strong>No approved map points yet.</strong><p>The initial V2 gallery is intentionally empty. Approved submissions will appear here after moderation.</p></div></div>}
      </section>}

      <section className="goats-gallery" aria-labelledby="goats-gallery-title"><header><div><p className="eyebrow">Approved dispatches</p><h2 id="goats-gallery-title">Spotted beyond the rail.</h2></div></header>
        {loading ? <div className="goats-card-grid" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div className="goat-card goat-card--skeleton" key={index} />)}</div> : payload.items.length ? <><div className="goats-card-grid">{payload.items.map((item) => <GoatCard key={item.id} item={item} selected={item.id === selectedId} onSelect={select} />)}</div>{totalPages > 1 ? <nav className="goats-pagination" aria-label="GOATS gallery pages"><button type="button" disabled={payload.page <= 1} onClick={() => goToPage(payload.page - 1)}>Previous</button><span>Page {payload.page} of {totalPages}</span><button type="button" disabled={payload.page >= totalPages} onClick={() => goToPage(payload.page + 1)}>Next</button></nav> : null}</> : !error ? <div className="goats-empty"><span>00</span><div><strong>{params.toString() ? "No approved GOATS match these filters." : "The wild is ready for its first approved GOAT."}</strong><p>{params.toString() ? "Clear or change the filters to widen the signal." : "Production starts empty. Existing Wix records will be imported later from an owner-supplied export; optional demo records are local/test only."}</p><div className="button-row">{params.toString() ? <button className="button button--secondary" type="button" onClick={clear}>Clear filters</button> : null}<Link className="button button--primary" to="/goats/submit">Submit your GOATED drip</Link></div></div></div> : null}
      </section>
    </main>
  </div>;
}

function GoatCard({ item, selected, onSelect }: { item: GoatListing; selected: boolean; onSelect: (id: string) => void }) {
  return <article className={`goat-card${selected ? " is-selected" : ""}`} onFocus={() => onSelect(item.id)}>
    <Link className="goat-card__media" data-goats-primary-media={item.media.main ? "ready" : "fallback"} to={`/goats/${item.slug}`} onClick={() => onSelect(item.id)}>
      <span className="goat-media-fallback">TR / GOAT</span>
      {item.media.main ? <img src={item.media.main.url} alt={`${item.displayName}'s approved GOAT submission`} width="720" height="540" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.setAttribute("data-goats-primary-media", "fallback"); }} /> : null}
      <span className="goat-card__media-shade" aria-hidden="true" />
      <span className="goat-card__media-meta"><small>Approved signal</small><strong>{item.product.name}</strong></span>
    </Link>
    <div className="goat-card__copy">
      <div className="goat-card__identity"><GoatProfileAvatar media={item.media.profile} /><div><h3><Link to={`/goats/${item.slug}`}>{item.displayName}</Link></h3><p className="goats-location-tag"><CountryFlag countryCode={item.location.countryCode} />{item.location.label}</p></div></div>
      <div className="goat-card__signal-row">{item.rating ? <div className="goat-rating" aria-label={`${item.rating} out of 5 stars`}>{"★".repeat(item.rating)}<span>{"★".repeat(5 - item.rating)}</span></div> : <span className="goat-card__unrated">Community dispatch</span>}<span>{formatCardDate(item.publishedAt)}</span></div>
      <p>{item.description}</p>
      <footer><span>↑ {item.counts.likes}</span><span>↓ {item.counts.dislikes}</span><span>{item.counts.comments} comments</span><Link to={`/goats/${item.slug}`} aria-label={`Open ${item.displayName}`}>Open story <ArrowIcon /></Link></footer>
    </div>
  </article>;
}

function formatCardDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Approved" : new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
}

function SelectedListing({ item }: { item: GoatListing | null }) {
  return <aside className="goats-selected" aria-live="polite">{item ? <><p className="eyebrow">Selected signal</p>{item.media.main ? <img src={item.media.main.url} alt="" width="540" height="420" /> : null}<h3>{item.displayName}</h3><p className="goats-location-tag"><CountryFlag countryCode={item.location.countryCode} />{item.location.label}</p><strong>{item.product.name}</strong><p>{item.description}</p><Link className="text-link" to={`/goats/${item.slug}`}>Open the full story <ArrowIcon /></Link></> : <><p className="eyebrow">Selected signal</p><h3>No approved listing selected.</h3><p>Choose a pin or gallery card when approved records are available.</p></>}</aside>;
}
