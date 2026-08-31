import { useEffect, useState } from "react";
import { fetchBannerConfig, type BannerConfig } from "../lib/banner";

const REFRESH_MS = 60 * 1000;

export function useBannerConfig() {
  const [config, setConfig] = useState<BannerConfig | null>(null);
  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const next = await fetchBannerConfig();
        if (mounted) setConfig(next);
      } catch { /* Config failure is intentionally fail-soft. */ }
      finally { if (mounted) timer = window.setTimeout(() => void refresh(), REFRESH_MS); }
    };
    const visibility = () => {
      if (document.hidden && timer !== null) window.clearTimeout(timer);
      else if (!document.hidden) void refresh();
    };
    void refresh();
    document.addEventListener("visibilitychange", visibility);
    return () => { mounted = false; document.removeEventListener("visibilitychange", visibility); if (timer !== null) window.clearTimeout(timer); };
  }, []);
  return config;
}
