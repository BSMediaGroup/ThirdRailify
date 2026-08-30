import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { CartProvider } from "./store/cart";
import { BroadcastProvider } from "./components/BroadcastProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { CurrencyProvider } from "./currency/CurrencyProvider";
import { PrivacyProvider } from "./privacy/PrivacyProvider";
import { SeoProvider } from "./seo/SeoProvider";
import "./styles/global.css";
import { AnalyticsCollector } from "./analytics/AnalyticsCollector";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SeoProvider>
        <PrivacyProvider>
          <AnalyticsCollector />
          <AuthProvider>
            <CartProvider>
              <CurrencyProvider><BroadcastProvider><App /></BroadcastProvider></CurrencyProvider>
            </CartProvider>
          </AuthProvider>
        </PrivacyProvider>
      </SeoProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
