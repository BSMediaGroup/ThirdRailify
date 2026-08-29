import { proxyCommerceShippingMarkets } from "../../_shared/commerce-catalogue-proxy.js";

export async function onRequestGet({ env, data = {} }) {
  return proxyCommerceShippingMarkets(env, data.fetchImpl || fetch);
}
