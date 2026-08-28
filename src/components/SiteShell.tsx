import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import boltMark from "../../assets/logos/boltv2straight.svg";
import { useCart } from "../store/cart";
import { ArrowIcon, BagIcon, BoltIcon, CloseIcon, MenuIcon } from "./Icons";
import { CartDrawer } from "./CartDrawer";
import { LiveNowIndicator } from "./BroadcastComponents";
import { useBroadcast } from "../hooks/useBroadcast";
import { AccountWidget } from "../auth/AccountWidget";
import { useAuth } from "../auth/AuthProvider";
import { PromoBanner } from "./PromoBanner";
import { useBannerConfig } from "../hooks/useBannerConfig";
import type { BannerConfig } from "../lib/banner";
import { usePrivacy } from "../privacy/PrivacyProvider";
import { PrivacyControls } from "./PrivacyControls";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/watch", label: "Watch" },
  { to: "/about", label: "The show" },
  { to: "/shop", label: "Shop" },
  { to: "/community", label: "Community" },
];

export function SiteShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const cart = useCart();
  const { data } = useBroadcast();
  const { account, openAuth } = useAuth();
  const bannerConfig = useBannerConfig();
  const liveNow = data?.liveNow ?? [];

  useEffect(() => {
    setMenuOpen(false);
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) window.requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="staging-rail"><span><BoltIcon /> V2 staging scaffold</span><strong>Wix remains production</strong></div>
      <PromoBanner config={bannerConfig} broadcast={data} />
      <header className="site-header">
        <div className="container site-header__inner">
          <Link className="brand" to="/" aria-label="Third Railify home">
            <span className="brand__mark" aria-hidden="true"><img src={boltMark} alt="" /></span>
            <span className="brand__type"><strong>THIRD RAILIFY</strong><small>OFFICIAL</small></span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/"}>{item.label}</NavLink>)}
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
        <nav id="mobile-menu" className={`mobile-nav${menuOpen ? " is-open" : ""}`} aria-label="Mobile navigation" aria-hidden={!menuOpen}>
          <div className="container">
            {navItems.map((item, index) => <NavLink key={item.to} to={item.to} end={item.to === "/"}><span>0{index + 1}</span>{item.label}</NavLink>)}
            {liveNow.length > 0 && <Link to="/watch"><span>06</span>Watch live now<ArrowIcon /></Link>}
            {account
              ? <Link to="/account"><span>07</span>Your account<ArrowIcon /></Link>
              : <button className="mobile-nav__account" type="button" onClick={() => openAuth("signin")}><span>07</span>Log in</button>}
          </div>
        </nav>
      </header>
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
        <div><h2>Explore</h2><Link to="/watch">Watch</Link><Link to="/shawn">Shawn</Link><Link to="/gina">Gina</Link><Link to="/shop">Shop</Link></div>
        <div><h2>Community</h2><Link to="/friends">Friends</Link><Link to="/goats">Wild Goats</Link><Link to="/vip">VIP</Link><Link to="/donate">Donate</Link></div>
        <div><h2>Policies</h2><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/refunds">Refunds</Link><Link to="/accessibility">Accessibility</Link></div>
      </div>
      <div className="container footer-bottom"><span>Third Railify V2 staging scaffold · 2026</span><div className="footer-bottom__utilities"><button className="footer-privacy-button" type="button" onClick={privacy.openManager}>Privacy choices</button><span>Current Wix site remains production</span></div></div>
    </footer>
  );
}

export type SiteShellOutletContext = { bannerConfig: BannerConfig | null };
