import { proxyPayPalPost } from "../../../_shared/paypal-commerce-proxy.js";
export function onRequestPost({env,request,data={}}){return proxyPayPalPost(env,request,"/api/commerce/paypal/capture",data.fetchImpl||fetch);}

