import { proxyPayPalPost } from "../../../_shared/paypal-commerce-proxy.js";
export function onRequestPost({env,request,data={}}){return proxyPayPalPost(env,request,"/api/commerce/paypal/donation",data.fetchImpl||fetch);}

