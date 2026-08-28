import { useState } from "react";
import { Link } from "react-router-dom";
import rumbleIcon from "../../assets/icons/rumble.svg";
import youtubeIcon from "../../assets/icons/youtube.svg";
import { BroadcastMetadata, BroadcastPlayer, BroadcastStatusBadge, PlatformSelector, broadcastCandidates, broadcastStateLabel, formatDate } from "../components/BroadcastComponents";
import { EpisodeCard } from "../components/EpisodeComponents";
import { ArrowIcon, BoltIcon, RadioIcon } from "../components/Icons";
import { SignalField } from "../components/SignalField";
import { useBroadcast } from "../hooks/useBroadcast";
import { useEpisodes } from "../hooks/useEpisodes";
import { RUMBLE_URL, YOUTUBE_URL } from "../lib/broadcast";
import { featuredEpisodes } from "../lib/episodes";
import { effectiveLiveCandidates } from "../lib/liveBanner";

export function WatchPage() {
  const { data, loading, unavailable, error } = useBroadcast();
  const archive = useEpisodes();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const options = data ? broadcastCandidates(data.primary, data.latestByPlatform) : [];
  const selected = options.find((candidate) => candidate.key === selectedKey) ?? data?.primary ?? null;
  const confirmedLive = effectiveLiveCandidates(data);
  const live = confirmedLive.length > 0;
  const selectedLive = Boolean(selected && confirmedLive.some((candidate) => candidate.key === selected.key));
  const featured = featuredEpisodes(archive.data?.items ?? [], selected?.key ?? null);
  const stateLabel = selected && data ? broadcastStateLabel(selected, data.freshness) : "Signal unavailable";

  return (
    <div className="watch-page watch-v2">
      <section className={`watch-hero${live ? " is-live" : ""}`}>
        <SignalField />
        <div className="watch-hero__signal" aria-hidden="true"><span /><span /><span /><BoltIcon /></div>
        <div className="container watch-hero__grid">
          <div>
            <p className="eyebrow"><i /> Third Railify broadcast network</p>
            <h1>{live ? <>The rail is <span className="hero-feature-text">live.</span></> : <>Stay on the <span className="hero-feature-text">signal.</span></>}</h1>
            <p>{live ? "A current provider check confirmed the broadcast below." : "Current signal, completed transmissions, and direct provider routes — all from validated broadcast snapshots."}</p>
          </div>
          <div className="watch-signal-card">
            <div className="watch-signal-card__scope" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
            <span>{live ? "Signal acquired" : data?.freshness === "stale" ? "Stored transmission" : "Standing by"}</span>
            <strong>{live ? "ON AIR" : data?.upcoming ? "UPCOMING" : data ? "LATEST EPISODE" : "NO SIGNAL"}</strong>
            <small>Sunday—Friday · 10 PM Eastern</small>
            {data && <b>{data.upcoming ? `Next: ${data.upcoming.title}${data.upcoming.scheduledStart ? ` · ${formatDate(data.upcoming.scheduledStart)}` : ""}` : data.freshness === "fresh" ? "Current snapshot" : data.freshness === "delayed" ? "Signal delayed" : `Last updated ${formatDate(data.generatedAt)}`}</b>}
          </div>
        </div>
      </section>

      <section className="watch-stage-section" aria-labelledby="current-broadcast-title">
        <div className="container">
          {loading && !data ? <WatchLoading /> : selected && data ? (
            <>
              <div className="watch-stage__heading">
                <div><p className="eyebrow">Current signal authority</p><h2 id="current-broadcast-title">{live ? "Current transmission" : selected.presentationState === "upcoming" ? "Next transmission" : "Latest transmission"}</h2></div>
                <BroadcastStatusBadge candidate={selected} />
              </div>
              <PlatformSelector candidates={options} selectedKey={selected.key} onSelect={(candidate) => setSelectedKey(candidate.key)} />
              <div className={`watch-stage${selectedLive ? " is-live" : ""}`} data-state={selected.presentationState}>
                <div className="watch-stage__player"><div className="watch-stage__scan" aria-hidden="true" /><BroadcastPlayer candidate={selected} eager /></div>
                <div className="watch-stage__copy">
                  <p className="watch-stage__state">TRF / {stateLabel}</p>
                  <BroadcastMetadata candidate={selected} freshness={data.freshness} />
                  <Link className="button button--primary watch-dedicated-link" to={`/watch/live?platform=${selected.platform}`}>Open dedicated player <ArrowIcon /></Link>
                </div>
              </div>
              {error && <p className="watch-inline-alert" role="status">The latest refresh failed; this is the last validated snapshot.</p>}
            </>
          ) : <WatchUnavailable />}
        </div>
      </section>

      <section className="section watch-archive-drawer" aria-labelledby="featured-episodes-title">
        <div className="container split-heading">
          <div><p className="eyebrow">Six-point broadcast rail</p><h2 id="featured-episodes-title">Latest from the archive.</h2></div>
          <p>{archive.error ? "The archive is temporarily unavailable; current playback remains independent." : `${archive.data?.summary.visibleCount ?? 0} visible episode${archive.data?.summary.visibleCount === 1 ? "" : "s"} retained. New completed broadcasts arrive through the signed signal path.`}</p>
        </div>
        <div className="container episode-featured-grid" aria-busy={archive.loading} aria-label="Latest archived episodes">
          {Array.from({ length: 6 }, (_, index) => <EpisodeCard key={featured[index]?.id ?? `featured-position-${index}`} episode={featured[index] ?? null} index={index} featured />)}
        </div>
        <div className="container watch-archive-drawer__action"><Link className="button button--outline" to="/watch/episodes">Explore the full archive <ArrowIcon /></Link></div>
      </section>

      <section className="section section--panel watch-schedule" aria-labelledby="watch-schedule-title">
        <div className="container watch-schedule__grid">
          <div><p className="eyebrow">Signal schedule</p><h2 id="watch-schedule-title">Six nights. One live wire.</h2><p>{unavailable ? "The website snapshot is unavailable, but the official platform routes remain direct." : live ? "The current show has a recent positive provider confirmation." : "No current live signal is confirmed. The latest validated broadcast remains above."}</p></div>
          <div className="watch-schedule__time"><RadioIcon /><strong>10 PM</strong><span>Eastern · Sunday—Friday</span></div>
          <div className="watch-platform-links">
            <a href={RUMBLE_URL} target="_blank" rel="noreferrer"><img src={rumbleIcon} alt="" /><span><strong>Rumble</strong><small>Primary channel</small></span><ArrowIcon /></a>
            <a href={YOUTUBE_URL} target="_blank" rel="noreferrer"><img src={youtubeIcon} alt="" /><span><strong>YouTube</strong><small>Videos + clips</small></span><ArrowIcon /></a>
          </div>
        </div>
      </section>
    </div>
  );
}

function WatchLoading() { return <div className="watch-loading" aria-label="Loading broadcast"><i /><i /><i /><span>Acquiring validated signal…</span></div>; }

function WatchUnavailable() {
  return <div className="watch-unavailable"><RadioIcon /><p className="eyebrow">Signal unavailable</p><h2 id="current-broadcast-title">No validated snapshot is available.</h2><p>Nothing has been fabricated and no provider scraping is running in this browser.</p><div className="button-row"><a className="button button--primary" href={RUMBLE_URL} target="_blank" rel="noreferrer">Open Rumble <ArrowIcon /></a><a className="button button--outline" href={YOUTUBE_URL} target="_blank" rel="noreferrer">Open YouTube <ArrowIcon /></a></div></div>;
}
