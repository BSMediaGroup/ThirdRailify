import { proxyCommerceCatalogue } from "../../_shared/commerce-catalogue-proxy.js";

export function onRequestGet({ env, data = {} }) {
  return proxyCommerceCatalogue(env, "/api/public/commerce/catalogue", data.fetchImpl || fetch);
}
