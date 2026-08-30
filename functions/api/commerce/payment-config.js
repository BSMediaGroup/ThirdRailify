import { proxyPayPalGet } from "../../_shared/paypal-commerce-proxy.js";
export function onRequestGet({env,request,data={}}){return proxyPayPalGet(env,request,"/api/public/commerce/payment-config",data.fetchImpl||fetch);}

