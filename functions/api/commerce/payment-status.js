import { normalizePaymentStatus, proxyPayPalGet } from "../../_shared/paypal-commerce-proxy.js";
export function onRequestGet({env,request,data={}}){return proxyPayPalGet(env,request,"/api/public/commerce/payment-status",data.fetchImpl||fetch,normalizePaymentStatus);}

