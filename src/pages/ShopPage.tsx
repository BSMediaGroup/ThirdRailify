import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import logo from "../../assets/logos/thirdrail-logo3.png";
import { ArrowIcon, BagIcon, SearchIcon } from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { SignalField } from "../components/SignalField";
import { LIVE_WIX_CATEGORIES } from "../data/wixSnapshot";
import { catalogueProvider, categorySlug } from "../lib/catalogueProvider";
import { useCart } from "../store/cart";
import type { CatalogueProduct, CatalogueSnapshot } from "../types/catalogue";

type SortMode = "featured" | "price-asc" | "price-desc" | "name";

const snapshotFilters = ["All Products", "Apparel", "Accessories & Other", "Third Railify™ Branded", "Just Gina™ Branded"];

export function ShopPage() {
  const { category = "all-products" } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [snapshot, setSnapshot] = useState<CatalogueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("featured");

  const load = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    catalogueProvider.load(controller.signal)
      .then(setSnapshot)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("The local catalogue snapshot could not be loaded.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(load, [load]);

  const activeCategory = category === "all" ? "all-products" : categorySlug(category);
  const products = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = (snapshot?.products ?? []).filter((product) => {
      const matchesCategory = activeCategory === "all-products" || product.categories.some((entry) => categorySlug(entry) === activeCategory);
      const haystack = `${product.name} ${product.categories.join(" ")} ${product.optionTypes.join(" ")}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
    if (sort === "price-asc") next.sort((left, right) => left.price - right.price);
    if (sort === "price-desc") next.sort((left, right) => right.price - left.price);
    if (sort === "name") next.sort((left, right) => left.name.localeCompare(right.name));
    return next;
  }, [activeCategory, query, snapshot, sort]);

  const chooseCategory = (label: string) => {
    const slug = categorySlug(label);
    navigate(slug === "all-products" ? "/shop" : `/products/${slug}`);
  };

  return (
    <>
      <section className="shop-hero">
        <SignalField />
        <div className="shop-hero__type" aria-hidden="true"><span>WEAR THE LORE</span><span>WEAR THE LORE</span><span>WEAR THE LORE</span></div>
        <div className="container shop-hero__grid">
          <div className="shop-hero__copy">
            <p className="eyebrow">The official store · Migration snapshot</p>
            <h1>Wear the<br /><span className="hero-feature-text">lore.</span></h1>
            <p>A purpose-built storefront foundation using only products and CAD prices verified from the current Wix catalogue.</p>
            <div className="button-row"><a className="button button--primary" href="#catalogue">Shop the snapshot <ArrowIcon /></a><button className="button button--secondary" type="button" onClick={cart.open}><BagIcon /> Local cart · {cart.count}</button></div>
            <div className="shop-facts"><span><strong>8</strong><small>Captured products</small></span><span><strong>49</strong><small>Reported by Wix</small></span><span><strong>CAD</strong><small>Verified currency</small></span></div>
          </div>
          <ShopProductStack products={snapshot?.products ?? []} />
        </div>
      </section>

      <section className="collection-section">
        <div className="container split-heading split-heading--compact">
          <div><p className="eyebrow">Current Wix collection map</p><h2>Thirteen corners of the universe.</h2></div>
          <p>These labels are preserved for migration planning. The bounded local snapshot only contains products in the filters below.</p>
        </div>
        <div className="container collection-marquee" aria-label="Current Wix category names">
          {LIVE_WIX_CATEGORIES.map((category, index) => <span key={category}><i>{String(index + 1).padStart(2, "0")}</i>{category}</span>)}
        </div>
      </section>

      <section id="catalogue" className="section section--panel catalogue-section">
        <div className="container catalogue-heading">
          <div><p className="eyebrow">Verified 11 August 2026</p><h2>Artifacts currently online.</h2></div>
          <p>Snapshot availability and prices can become stale. Checkout remains on the production Wix site until provider integration is implemented.</p>
        </div>

        <div className="container shop-toolbar">
          <label className="search-field"><SearchIcon /><span className="sr-only">Search products</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the captured store…" /></label>
          <label className="sort-field"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="featured">Snapshot order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
          <div className="result-count" aria-live="polite"><strong>{loading ? "—" : products.length}</strong><span>results</span></div>
        </div>

        <div className="container filter-bar" aria-label="Catalogue filters">
          {snapshotFilters.map((label) => {
            const slug = categorySlug(label);
            return <button key={label} className={slug === activeCategory ? "is-active" : ""} type="button" onClick={() => chooseCategory(label)}>{label}</button>;
          })}
        </div>

        <div className="container">
          {loading ? <LoadingGrid /> : null}
          {error ? <ErrorState message={error} retry={load} /> : null}
          {!loading && !error && products.length ? (
            <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
          ) : null}
          {!loading && !error && !products.length ? (
            <div className="empty-state empty-state--catalogue"><SearchIcon /><p className="eyebrow">No snapshot matches</p><h3>Nothing captured on this section of rail.</h3><p>Try another filter or clear the search. No substitute products have been invented.</p><button className="button button--secondary" type="button" onClick={() => { setQuery(""); chooseCategory("All Products"); }}>Reset filters</button></div>
          ) : null}
        </div>
      </section>

      <section className="section commerce-boundary">
        <div className="container commerce-boundary__grid">
          <div><p className="eyebrow">Built for the next provider</p><h2>Real catalogue now.<br />Real plumbing later.</h2></div>
          <div className="boundary-cards">
            <article><span>01</span><h3>Today</h3><p>Dated Wix snapshot, local filtering, product routes, and a local-only cart shell.</p></article>
            <article><span>02</span><h3>Next</h3><p>Server-side Printful and Printify projections with validated variants and availability.</p></article>
            <article><span>03</span><h3>Deferred</h3><p>Inventory, shipping, taxes, checkout, payment, orders, and Admin writes.</p></article>
          </div>
        </div>
      </section>
    </>
  );
}

function ShopProductStack({ products }: { products: CatalogueProduct[] }) {
  const display = products.length ? products.slice(1, 4) : [];
  return (
    <div className="shop-stack" aria-label="Captured product preview">
      <div className="shop-stack__hud" aria-hidden="true"><span>TR / DROP 01</span><strong>CATALOGUE SIGNAL</strong></div>
      <div className="shop-stack__orbit" aria-hidden="true"><i /><i /></div>
      {display.map((product, index) => <Link className={`shop-stack__card shop-stack__card--${index + 1}`} key={product.id} to={`/products/all/${product.slug}`}><img src={product.image} alt="" /><span>{product.name}</span></Link>)}
      {!display.length ? <div className="shop-stack__placeholder"><img src={logo} alt="" /><span>Loading captured products</span></div> : null}
      <div className="shop-stack__stamp"><img src={logo} alt="" /><span>LIVE WIX<br />SNAPSHOT</span></div>
    </div>
  );
}

function LoadingGrid() {
  return <div className="product-grid" aria-label="Loading products" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <div className="product-skeleton" key={index}><span /><i /><i /></div>)}</div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="empty-state empty-state--error"><p className="eyebrow">Catalogue error</p><h3>{message}</h3><p>The storefront will not substitute unverified product data.</p><button className="button button--secondary" type="button" onClick={retry}>Try again</button></div>;
}
