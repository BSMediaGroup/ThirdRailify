import { proxyCommerceOrderStatus } from "../../_shared/commerce-order-status-proxy.js";

export function onRequestGet({ request, env, data = {} }) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  return proxyCommerceOrderStatus(env, sessionId, data.fetchImpl || fetch);
}
