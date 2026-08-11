import { Navigate, Route, Routes } from "react-router-dom";
import { SiteShell } from "./components/SiteShell";
import { CommunityPage } from "./pages/CommunityPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { RouteShellPage } from "./pages/RouteShellPage";
import { ShopPage } from "./pages/ShopPage";

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
        <Route path="/watch" element={<RouteShellPage routeKey="watch" />} />
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
        <Route path="/goats" element={<Navigate to="/community" replace />} />
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
