import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { CartProvider } from "./store/cart";
import { BroadcastProvider } from "./components/BroadcastProvider";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <BroadcastProvider><App /></BroadcastProvider>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
