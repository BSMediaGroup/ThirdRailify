import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SiteShell } from "./components/SiteShell";
import { CommunityPage } from "./pages/CommunityPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { RouteShellPage } from "./pages/RouteShellPage";
import { ShopPage } from "./pages/ShopPage";
import { WatchPage } from "./pages/WatchPage";
import { LiveAliasPage, WatchLivePage } from "./pages/WatchLivePage";
import { EpisodesPage } from "./pages/EpisodesPage";
import { EpisodeDetailPage } from "./pages/EpisodeDetailPage";
import { AccountPage } from "./pages/AccountPage";
import { GoatDetailPage } from "./pages/GoatDetailPage";
import { GoatsPage } from "./pages/GoatsPage";
import { GoatSubmitPage } from "./pages/GoatSubmitPage";

export function App() {
  return (
    <Routes>
      <Route element={<SiteShell />}>
        <Route index element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/products/all" element={<ShopPage />} />
        <Route path="/products/:category" element={<ShopPage />} />
        <Route path="/products/:category/:slug" element={<ProductDetailPage />} />
        <Route path="/product-page/:slug" element={<ProductDetailPage />} />
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/watch/live" element={<WatchLivePage />} />
        <Route path="/watch/episodes" element={<EpisodesPage />} />
        <Route path="/watch/v/:episodeId" element={<EpisodeDetailPage />} />
        <Route path="/live" element={<LiveAliasPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/login" element={<AccountPage openLogin />} />
        <Route path="/shawn" element={<RouteShellPage routeKey="shawn" />} />
        <Route path="/gina" element={<RouteShellPage routeKey="gina" />} />
        <Route path="/about" element={<RouteShellPage routeKey="about" />} />
        <Route path="/friends" element={<RouteShellPage routeKey="friends" />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/vip" element={<RouteShellPage routeKey="vip" />} />
        <Route path="/support" element={<RouteShellPage routeKey="support" />} />
        <Route path="/gift-cards" element={<RouteShellPage routeKey="giftCards" />} />
        <Route path="/policies" element={<RouteShellPage routeKey="policies" />} />
        <Route path="/terms" element={<RouteShellPage routeKey="terms" />} />
        <Route path="/privacy" element={<RouteShellPage routeKey="privacy" />} />
        <Route path="/refunds" element={<RouteShellPage routeKey="refunds" />} />
        <Route path="/accessibility" element={<RouteShellPage routeKey="accessibility" />} />
        <Route path="/goats" element={<GoatsPage />} />
        <Route path="/goats/submit" element={<GoatSubmitPage />} />
        <Route path="/goats/:slug" element={<GoatDetailPage />} />
        <Route path="/goatgate" element={<LegacyGoatgateRedirect />} />
        <Route path="/gift" element={<Navigate to="/gift-cards" replace />} />
        <Route path="/donate-1" element={<Navigate to="/support" replace />} />
        <Route path="/pricing-plans/list" element={<Navigate to="/vip" replace />} />
        <Route path="/members-home" element={<Navigate to="/vip" replace />} />
        <Route path="/cart-page" element={<Navigate to="/shop" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function LegacyGoatgateRedirect() {
  const location = useLocation();
  return <Navigate to={`/goats/submit${location.search}${location.hash}`} replace />;
}
