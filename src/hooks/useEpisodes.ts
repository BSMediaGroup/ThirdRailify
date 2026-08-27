import { useEffect, useState } from "react";
import { fetchEpisodes, type EpisodeList } from "../lib/episodes";

export function useEpisodes() {
  const [data, setData] = useState<EpisodeList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetchEpisodes().then((value) => { if (active) { setData(value); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { data, loading, error };
}
