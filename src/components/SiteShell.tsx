import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import boltMark from "../../assets/logos/boltv2straight.svg";
import { useCart } from "../store/cart";
import { ArrowIcon, BagIcon, CloseIcon, MenuIcon } from "./Icons";
import { CartDrawer } from "./CartDrawer";
import { LiveNowIndicator } from "./BroadcastComponents";
import { useBroadcast } from "../hooks/useBroadcast";
import { AccountWidget } from "../auth/AccountWidget";
import { useAuth } from "../auth/AuthProvider";
import { PromoBanner } from "./PromoBanner";
import { useBannerConfig } from "../hooks/useBannerConfig";
import type { BannerConfig } from "../lib/banner";
import { effectiveLiveCandidates } from "../lib/liveBanner";
import { usePrivacy } from "../privacy/PrivacyProvider";
import { PrivacyControls } from "./PrivacyControls";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/watch", label: "Watch" },
  { to: "/about", label: "The show" },
  { to: "/shop", label: "Shop" },
  { to: "/community", label: "Community" },
  { to: "/vip", label: "VIP" },
];
const showItems = [{ to: "/shawn", label: "Shawn" }, { to: "/gina", label: "Gina" }, { to: "/gaming", label: "Gaming" }];
const communityItems = [{ to: "/friends", label: "Friends" }, { to: "/goats", label: "GOATS in the Wild" }, { to: "/wheels", label: "Wheels" }, { to: "/polls", label: "Polls" }];
const submenuItems: Record<string, typeof showItems> = { "/about": showItems, "/community": communityItems };

export function SiteShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const submenuNav = useRef<Record<string, HTMLLIElement | null>>({});
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const cart = useCart();
  const { data } = useBroadcast();
  const { account, openAuth } = useAuth();
  const bannerConfig = useBannerConfig();
  const liveNow = effectiveLiveCandidates(data);
  const liveNavNumber = String(navItems.length + 1).padStart(2, "0");
  const accountNavNumber = String(navItems.length + (liveNow.length > 0 ? 2 : 1)).padStart(2, "0");

  useEffect(() => {
    setMenuOpen(false);
    setSubmenuOpen(null);
    const state = location.state as { wheelSceneNavigation?: boolean } | null;
    const wheelToWheel = /^\/wheels\/[^/]+$/.test(previousPath.current) && /^\/wheels\/[^/]+$/.test(location.pathname);
    previousPath.current = location.pathname;
    if (wheelToWheel || state?.wheelSceneNavigation && /^\/wheels\/[^/]+$/.test(location.pathname)) return;
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.hash, location.pathname, location.state]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const root = document.documentElement;
    const breakpoint = window.matchMedia("(max-width: 1120px)");
    const syncViewport = () => {
      if (!breakpoint.matches) {
        setMenuOpen(false);
        return;
      }
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom || 0;
      mobileNavRef.current?.style.setProperty("--mobile-nav-top", `${Math.max(0, Math.ceil(headerBottom))}px`);
    };
    mobileNavRef.current?.scrollTo({ top: 0 });
    root.classList.add("mobile-nav-open");
    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);
    breakpoint.addEventListener("change", syncViewport);
    return () => {
      root.classList.remove("mobile-nav-open");
      window.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      breakpoint.removeEventListener("change", syncViewport);
    };
  }, [menuOpen]);

  useEffect(() => {
    const close = (event: KeyboardEvent | MouseEvent) => {
      const activeNav = submenuOpen ? submenuNav.current[submenuOpen] : null;
      if (event instanceof KeyboardEvent && event.key === "Escape") { setSubmenuOpen(null); (activeNav?.querySelector("a") as HTMLElement | null)?.focus(); }
      if (event instanceof MouseEvent && activeNav && !activeNav.contains(event.target as Node)) setSubmenuOpen(null);
    };
    document.addEventListener("keydown", close); document.addEventListener("mousedown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("mousedown", close); };
  }, [submenuOpen]);

  return (
    <div className="site-frame" data-site-shell="mounted">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PromoBanner config={bannerConfig} broadcast={data} />
      <header ref={headerRef} className="site-header">
        <div className="container site-header__inner">
          <Link className="brand" to="/" aria-label="Third Railify home">
            <span className="brand__mark" aria-hidden="true"><img src={boltMark} alt="" /></span>
            <span className="brand__type"><strong>THIRD RAILIFY</strong><small>OFFICIAL</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            <ul>{navItems.map((item) => {
              const children = submenuItems[item.to];
              return children ? <li ref={(node) => { submenuNav.current[item.to] = node; }} key={item.to} className={`desktop-nav__community desktop-nav__${item.to === "/about" ? "show" : "community"}${submenuOpen === item.to ? " is-open" : ""}`} onMouseEnter={() => setSubmenuOpen(item.to)} onMouseLeave={() => setSubmenuOpen(null)} onFocus={() => setSubmenuOpen(item.to)}><span><NavLink to={item.to} aria-haspopup="true" aria-expanded={submenuOpen === item.to}>{item.label}</NavLink></span><ul className="community-dropdown" aria-label={`${item.label} links`}>{children.map((child) => <li key={child.to}><NavLink to={child.to}>{child.label}<ArrowIcon /></NavLink></li>)}</ul></li> : <li key={item.to}><NavLink to={item.to} end={item.to === "/"}>{item.label}</NavLink></li>;
            })}</ul>
          </nav>
          <div className="header-actions">
            {liveNow.length > 0 && <Link className="header-watch" to="/watch"><LiveNowIndicator candidates={liveNow} compact /><ArrowIcon /></Link>}
            <button className="cart-button" type="button" onClick={cart.open} aria-label={`Open cart, ${cart.count} items`}>
              <BagIcon /><b>{cart.count}</b>
            </button>
            <AccountWidget />
            <button className="menu-button" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"}>
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>
      <nav ref={mobileNavRef} id="mobile-menu" className={`mobile-nav${menuOpen ? " is-open" : ""}`} aria-label="Mobile navigation" aria-hidden={!menuOpen}>
        <div className="container">
          {navItems.map((item, index) => {
            const children = submenuItems[item.to];
            return <div className={children ? `mobile-nav__community mobile-nav__${item.to === "/about" ? "show" : "community"}` : ""} key={item.to}><NavLink to={item.to} end={item.to === "/"}><span>0{index + 1}</span>{item.label}</NavLink>{children ? <div>{children.map((child) => <NavLink key={child.to} to={child.to}>{child.label}<ArrowIcon /></NavLink>)}</div> : null}</div>;
          })}
          {liveNow.length > 0 && <Link to="/watch"><span>{liveNavNumber}</span>Watch live now<ArrowIcon /></Link>}
          {account
            ? <Link to="/account"><span>{accountNavNumber}</span>Your account<ArrowIcon /></Link>
            : <button className="mobile-nav__account" type="button" onClick={() => openAuth("signin")}><span>{accountNavNumber}</span>Log in</button>}
        </div>
      </nav>
      <main id="main-content"><Outlet context={{ bannerConfig }} /></main>
      <SiteFooter />
      <CartDrawer />
      <PrivacyControls />
    </div>
  );
}

function SiteFooter() {
  const privacy = usePrivacy();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="brand brand--footer"><span className="brand__mark" aria-hidden="true"><img src={boltMark} alt="" /></span><span className="brand__type"><strong>THIRD RAILIFY</strong><small>OFFICIAL</small></span></div>
          <p>A daily podcast with news, crime, pop culture, and a reliable failure to stay on topic.</p>
          <a href="mailto:info@thirdrailify.com">info@thirdrailify.com</a>
        </div>
        <div><h2>Explore</h2><Link to="/watch">Watch</Link><Link to="/gaming">Gaming</Link><Link to="/wheels">Wheels</Link><Link to="/shawn">Shawn</Link><Link to="/gina">Gina</Link><Link to="/shop">Shop</Link></div>
        <div><h2>Community</h2><Link to="/friends">Friends</Link><Link to="/goats">Wild Goats</Link><Link to="/wheels">Competition wheels</Link><Link to="/polls">Live Polls</Link><Link to="/vip">VIP</Link><Link to="/donate">Donate</Link></div>
        <div><h2>Policies</h2><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/refunds">Refunds</Link><Link to="/accessibility">Accessibility</Link><Link to="/policies">Policy Library</Link></div>
      </div>
      <div className="container footer-bottom"><span>Third Railify · 2026</span><div className="footer-bottom__utilities"><button className="footer-privacy-button" type="button" onClick={privacy.openManager}>Privacy choices</button></div></div>
    </footer>
  );
}

export type SiteShellOutletContext = { bannerConfig: BannerConfig | null };
