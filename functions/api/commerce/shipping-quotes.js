import { proxyCommercePost } from "../../_shared/commerce-checkout-proxy.js";

export function onRequestPost({ env, request, data = {} }) {
  return proxyCommercePost(env, request, "/api/commerce/shipping-quotes", data.fetchImpl || fetch);
}
