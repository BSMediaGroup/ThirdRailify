import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { BroadcastMetadata, BroadcastPlayer, BroadcastStatusBadge, PlatformSelector } from "../components/BroadcastComponents";
import { ArrowIcon, RadioIcon } from "../components/Icons";
import { useBroadcast } from "../hooks/useBroadcast";
import type { BroadcastCandidate } from "../lib/broadcast";
import { effectiveLiveCandidates } from "../lib/liveBanner";

export function WatchLivePage() {
  const { data, loading, error } = useBroadcast();
  const [search, setSearch] = useSearchParams();
  const confirmedLive = effectiveLiveCandidates(data);
  const candidates = data ? currentCandidates(confirmedLive, data.upcoming, data.primary, Object.values(data.latestByPlatform)) : [];
  const requestedPlatform = search.get("platform");
  const selected = candidates.find((candidate) => candidate.platform === requestedPlatform) ?? data?.primary ?? data?.upcoming ?? null;
  const selectedLive = Boolean(selected && confirmedLive.some((candidate) => candidate.key === selected.key));

  if (loading && !data) return <FocusedUnavailable loading />;
  if (!selected || !data) return <FocusedUnavailable />;
  return (
    <section className={`watch-theatre${selectedLive ? " is-live" : ""}`} aria-labelledby="watch-live-title">
      <div className="watch-theatre__signal" aria-hidden="true" />
      <div className="container watch-theatre__top"><Link className="text-link" to="/watch">← Back to Watch</Link><span>{confirmedLive.length ? "Confirmed current signal" : "Validated current selection"}</span><Link className="text-link" to="/watch/episodes">Episode archive <ArrowIcon /></Link></div>
      <div className="container">
        <div className="watch-theatre__heading"><p className="eyebrow"><RadioIcon /> Dedicated player</p><BroadcastStatusBadge candidate={selected} /></div>
        <h1 id="watch-live-title">{selected.presentationState === "live" ? "Live on the rail." : selected.presentationState === "upcoming" ? "Next transmission." : "Latest transmission."}</h1>
        <PlatformSelector candidates={candidates} selectedKey={selected.key} onSelect={(candidate) => setSearch({ platform: candidate.platform }, { replace: true })} />
        <div className={`watch-theatre__stage${selectedLive ? " is-live live-event-perimeter" : ""}`}><div className="watch-stage__scan" aria-hidden="true" /><BroadcastPlayer candidate={selected} eager /></div>
        <div className="watch-theatre__metadata"><BroadcastMetadata candidate={selected} freshness={data.freshness} />{error && <p role="status">Refresh delayed. This remains the last validated signal.</p>}</div>
      </div>
    </section>
  );
}

export function LiveAliasPage() {
  const { data, loading } = useBroadcast();
  const location = useLocation();
  if (loading && !data) return <FocusedUnavailable loading />;
  const target = data?.liveNow.length ? "/watch/live" : "/watch";
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}

function currentCandidates(live: BroadcastCandidate[], upcoming: BroadcastCandidate | null, primary: BroadcastCandidate | null, latest: (BroadcastCandidate | null)[]) {
  const values = [...live, upcoming, primary, ...latest].filter((value): value is BroadcastCandidate => Boolean(value));
  return values.filter((value, index) => values.findIndex((candidate) => candidate.key === value.key) === index);
}

function FocusedUnavailable({ loading = false }: { loading?: boolean }) {
  return <section className="watch-theatre watch-theatre--empty"><div className="container"><RadioIcon /><p className="eyebrow">{loading ? "Acquiring signal" : "Player unavailable"}</p><h1>{loading ? "Checking the current rail." : "No current player is available."}</h1><p>{loading ? "The validated broadcast snapshot is loading." : "Return to Watch for the schedule and direct provider routes."}</p><Link className="button button--primary" to="/watch">Return to Watch <ArrowIcon /></Link></div></section>;
}
