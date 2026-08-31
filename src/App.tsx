import { lazy, Suspense } from "react";
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
import { PoliciesPage } from "./pages/PoliciesPage";
import { PolicyPage } from "./pages/PolicyPage";
import { CheckoutSuccessPage } from "./pages/CheckoutSuccessPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CartPage } from "./pages/CartPage";
import { DonatePage } from "./pages/DonatePage";
import { AboutPage } from "./pages/AboutPage";
import { HostPage } from "./pages/HostPage";
import { FriendsPage } from "./pages/FriendsPage";
import { VipPage } from "./pages/VipPage";

const WheelsPage = lazy(() => import("./pages/WheelsPage").then((module) => ({ default: module.WheelsPage })));
const WheelPage = lazy(() => import("./pages/WheelPage").then((module) => ({ default: module.WheelPage })));
const WheelEditorPage = lazy(() => import("./pages/WheelEditorPage").then((module) => ({ default: module.WheelEditorPage })));
const WheelStagePage = lazy(() => import("./pages/WheelStagePage").then((module) => ({ default: module.WheelStagePage })));
const PollsPage = lazy(() => import("./pages/PollsPages").then((module) => ({ default: module.PollsPage })));
const PollDetailPage = lazy(() => import("./pages/PollsPages").then((module) => ({ default: module.PollDetailPage })));
const PollEditorPage = lazy(() => import("./pages/PollsPages").then((module) => ({ default: module.PollEditorPage })));

export function App() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Loading Third Railify control…</div>}><Routes>
      <Route path="/wheels/:slug/present" element={<WheelPage presentation />} />
      <Route path="/wheels/stages/new" element={<WheelStagePage create />} />
      <Route path="/wheels/stages/:slug/edit" element={<WheelStagePage editorRequested />} />
      <Route path="/wheels/stages/:slug" element={<WheelStagePage />} />
      <Route path="/polls/:slug/popout" element={<PollDetailPage popout />} />
      <Route element={<SiteShell />}>
        <Route index element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:slug" element={<ProductDetailPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/products/all" element={<ShopPage />} />
        <Route path="/products/:category" element={<ShopPage />} />
        <Route path="/products/:category/:slug" element={<ProductDetailPage />} />
        <Route path="/product-page/:slug" element={<ProductDetailPage />} />
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/watch/live" element={<WatchLivePage />} />
        <Route path="/watch/episodes" element={<EpisodesPage />} />
        <Route path="/watch/v/:episodeId" element={<EpisodeDetailPage />} />
        <Route path="/wheels" element={<WheelsPage />} />
        <Route path="/wheels/new" element={<WheelEditorPage create />} />
        <Route path="/wheels/:slug/edit" element={<WheelPage editorRequested />} />
        <Route path="/wheels/:slug" element={<WheelPage />} />
        <Route path="/wheel" element={<Navigate to="/wheels" replace />} />
        <Route path="/polls" element={<PollsPage />} />
        <Route path="/polls/new" element={<PollEditorPage create />} />
        <Route path="/polls/:slug/edit" element={<PollEditorPage />} />
        <Route path="/polls/:slug" element={<PollDetailPage />} />
        <Route path="/live" element={<LiveAliasPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/profile" element={<AccountPage />} />
        <Route path="/account/delivery" element={<AccountPage />} />
        <Route path="/account/orders" element={<AccountPage />} />
        <Route path="/account/orders/:orderId" element={<AccountPage />} />
        <Route path="/account/messages" element={<AccountPage />} />
        <Route path="/account/security" element={<AccountPage />} />
        <Route path="/account/login" element={<AccountPage openLogin />} />
        <Route path="/shawn" element={<HostPage hostKey="shawn" />} />
        <Route path="/gina" element={<HostPage hostKey="gina" />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/vip" element={<VipPage />} />
        <Route path="/donate" element={<DonatePage />} />
        <Route path="/gift-cards" element={<RouteShellPage routeKey="giftCards" />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/terms" element={<PolicyPage policyKey="terms" />} />
        <Route path="/privacy" element={<PolicyPage policyKey="privacy" />} />
        <Route path="/refunds" element={<PolicyPage policyKey="refunds" />} />
        <Route path="/accessibility" element={<PolicyPage policyKey="accessibility" />} />
        <Route path="/goats" element={<GoatsPage />} />
        <Route path="/goats/submit" element={<GoatSubmitPage />} />
        <Route path="/goats/:slug" element={<GoatDetailPage />} />
        <Route path="/goatgate" element={<LegacyGoatgateRedirect />} />
        <Route path="/gift" element={<Navigate to="/gift-cards" replace />} />
        <Route path="/support" element={<LegacyDonateRedirect />} />
        <Route path="/donate-1" element={<LegacyDonateRedirect />} />
        <Route path="/pricing-plans/list" element={<Navigate to="/vip" replace />} />
        <Route path="/members-home" element={<Navigate to="/vip" replace />} />
        <Route path="/cart-page" element={<LegacyCartRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes></Suspense>
  );
}

function LegacyGoatgateRedirect() {
  const location = useLocation();
  return <Navigate to={`/goats/submit${location.search}${location.hash}`} replace />;
}

function LegacyCartRedirect() {
  const location = useLocation();
  return <Navigate to={`/cart${location.search}${location.hash}`} replace />;
}

function LegacyDonateRedirect() {
  const location = useLocation();
  return <Navigate to={`/donate${location.search}${location.hash}`} replace />;
}
