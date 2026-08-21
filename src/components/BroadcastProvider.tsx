import { useEffect, useState, type ReactNode } from "react";
import { BroadcastContext } from "../hooks/useBroadcast";
import { fetchBroadcast, type BroadcastData } from "../lib/broadcast";

function pollInterval(data: BroadcastData | null): number {
  if (data?.liveNow.length) return 25_000;
  if (data?.upcoming) return 50_000;
  return 100_000;
}

export function BroadcastProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BroadcastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;
    let failures = 0;
    let currentData: BroadcastData | null = null;
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer);
      if (document.hidden) return;
      const delay = Math.min(300_000, pollInterval(currentData) * Math.max(1, 2 ** failures));
      timer = window.setTimeout(() => void refresh(), delay);
    };
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const next = await fetchBroadcast();
        if (!mounted) return;
        failures = 0;
        currentData = next;
        setData(next);
        setUnavailable(false);
        setError(false);
      } catch {
        if (!mounted) return;
        failures += 1;
        setUnavailable(currentData === null);
        setError(true);
      } finally {
        if (mounted) {
          setLoading(false);
          schedule();
        }
      }
    };
    void refresh();
    const visibility = () => {
      if (document.hidden) {
        if (timer !== null) window.clearTimeout(timer);
      } else {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", visibility);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  return (
    <BroadcastContext.Provider value={{ data, loading, unavailable, error }}>
      {children}
    </BroadcastContext.Provider>
  );
}
