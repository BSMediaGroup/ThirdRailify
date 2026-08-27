import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { CartProvider } from "./store/cart";
import { BroadcastProvider } from "./components/BroadcastProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { CurrencyProvider } from "./currency/CurrencyProvider";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <CurrencyProvider><BroadcastProvider><App /></BroadcastProvider></CurrencyProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
