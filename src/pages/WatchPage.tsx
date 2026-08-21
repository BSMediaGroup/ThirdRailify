import { useState } from "react";
import rumbleIcon from "../../assets/icons/rumble.svg";
import youtubeIcon from "../../assets/icons/youtube.svg";
import {
  BroadcastMetadata,
  BroadcastPlayer,
  BroadcastStatusBadge,
  PlatformSelector,
  broadcastCandidates,
  formatDate,
} from "../components/BroadcastComponents";
import { ArrowIcon, BoltIcon, RadioIcon } from "../components/Icons";
import { useBroadcast } from "../hooks/useBroadcast";
import { RUMBLE_URL, YOUTUBE_URL } from "../lib/broadcast";

export function WatchPage() {
  const { data, loading, unavailable, error } = useBroadcast();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const options = data ? broadcastCandidates(data.primary, data.latestByPlatform) : [];
  const selected = options.find((candidate) => candidate.key === selectedKey) ?? data?.primary ?? null;
  const live = Boolean(data?.liveNow.length);
  const selectedIsLive = selected?.presentationState === "live";
  const secondary = data ? options.find((candidate) => candidate.key !== selected?.key && candidate.presentationState !== "live") ?? null : null;

  return (
    <div className="watch-page">
      <section className={`watch-hero${live ? " is-live" : ""}`}>
        <div className="watch-hero__signal" aria-hidden="true"><span /><span /><span /><BoltIcon /></div>
        <div className="container watch-hero__grid">
          <div>
            <p className="eyebrow"><i /> Third Railify broadcast control</p>
            <h1>{live ? "The rail is live." : "Stay on the signal."}</h1>
            <p>{live ? "A current provider check confirmed the broadcast below." : "Watch the latest validated broadcast, with no provider scraping in your browser."}</p>
          </div>
          <div className="watch-signal-card">
            <span>{live ? "Signal acquired" : data?.freshness === "stale" ? "Stored transmission" : "Standing by"}</span>
            <strong>{live ? "LIVE NOW" : data?.upcoming ? "UPCOMING" : "LATEST BROADCAST"}</strong>
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
                <div><p className="eyebrow">Now on the rail</p><h2 id="current-broadcast-title">{live ? "Current transmission" : "Latest transmission"}</h2></div>
                <BroadcastStatusBadge candidate={selected} />
              </div>
              <PlatformSelector candidates={options} selectedKey={selected.key} onSelect={(candidate) => setSelectedKey(candidate.key)} />
              <div className={`watch-stage${selectedIsLive ? " is-live" : ""}`}>
                <BroadcastPlayer candidate={selected} eager />
                <BroadcastMetadata candidate={selected} freshness={data.freshness} />
              </div>
              {error && <p className="watch-inline-alert">The latest refresh failed; this is the last validated snapshot.</p>}
            </>
          ) : <WatchUnavailable />}
        </div>
      </section>

      {secondary && data && (
        <section className="section watch-latest" aria-labelledby="watch-latest-title">
          <div className="container split-heading split-heading--compact">
            <div><p className="eyebrow">Elsewhere on the rail</p><h2 id="watch-latest-title">Another validated broadcast.</h2></div>
            <p>{live ? "Keep the latest archive close while the current transmission is live." : "Switch platforms without inventing an archive the snapshot does not provide."}</p>
          </div>
          <div className="container watch-latest__card">
            <BroadcastPlayer candidate={secondary} />
            <div><BroadcastStatusBadge candidate={secondary} /><h3>{secondary.title}</h3><a className="text-link" href={secondary.watchUrl} target="_blank" rel="noreferrer">Open on platform <ArrowIcon /></a></div>
          </div>
        </section>
      )}

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

function WatchLoading() {
  return <div className="watch-loading" aria-label="Loading broadcast"><i /><i /><i /><span>Acquiring validated signal…</span></div>;
}

function WatchUnavailable() {
  return (
    <div className="watch-unavailable">
      <RadioIcon /><p className="eyebrow">Signal unavailable</p><h2 id="current-broadcast-title">No validated snapshot is available.</h2>
      <p>Nothing has been fabricated and no provider scraping is running in this browser.</p>
      <div className="button-row"><a className="button button--primary" href={RUMBLE_URL} target="_blank" rel="noreferrer">Open Rumble <ArrowIcon /></a><a className="button button--outline" href={YOUTUBE_URL} target="_blank" rel="noreferrer">Open YouTube <ArrowIcon /></a></div>
    </div>
  );
}
