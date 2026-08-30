import { useEffect } from "react";
import { useLocation } from "react-router-dom";

let lastPath = "";

export function AnalyticsCollector() {
  const location = useLocation();
  useEffect(() => {
    if (
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl === true
    )
      return;
    const path = location.pathname;
    if (/^\/(?:api|admin)(?:\/|$)/i.test(path)) return;
    const key = `${path}`;
    if (lastPath === key) return;
    const previousPath = lastPath;
    lastPath = key;
    const params = new URLSearchParams(location.search);
    const payload = {
      id: crypto.randomUUID(),
      eventType: "page_view",
      path,
      referrerHost: previousPath ? window.location.origin : document.referrer || null,
      metadata: {
        campaignSource: params.get("utm_source") || undefined,
        campaignMedium: params.get("utm_medium") || undefined,
        campaignName: params.get("utm_campaign") || undefined,
      },
    };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const accepted = navigator.sendBeacon(
        "/api/analytics",
        new Blob([body], { type: "application/json" }),
      );
      if (accepted) return;
    }
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  }, [location.pathname, location.search]);
  return null;
}
