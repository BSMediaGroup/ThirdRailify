/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import rumbleIcon from "../../assets/icons/rumble.svg";
import youtubeIcon from "../../assets/icons/youtube.svg";
import type { BroadcastCandidate, BroadcastPlatform } from "../lib/broadcast";
import { ArrowIcon, PlayIcon, RadioIcon } from "./Icons";

export function platformIcon(platform: BroadcastPlatform) {
  return platform === "rumble" ? rumbleIcon : youtubeIcon;
}

export function platformLabel(platform: BroadcastPlatform) {
  return platform === "rumble" ? "Rumble" : "YouTube";
}

export function LiveNowIndicator({ candidates, compact = false }: { candidates: BroadcastCandidate[]; compact?: boolean }) {
  const primary = candidates[0];
  const live = candidates.length > 0;
  return (
    <span
      className={`live-indicator${live ? " is-live" : ""}${compact ? " live-indicator--compact" : ""}`}
      aria-label={live ? `${candidates.length > 1 ? `${candidates.length} broadcasts live` : `${platformLabel(primary.platform)} live`}: ${primary.title}` : "Watch the latest broadcast"}
      aria-live="polite"
    >
      <i aria-hidden="true"><b /></i>
      {live && <img src={platformIcon(primary.platform)} alt="" aria-hidden="true" />}
      <strong>{live ? (candidates.length > 1 ? `${candidates.length} LIVE` : "LIVE NOW") : "WATCH"}</strong>
    </span>
  );
}

export function BroadcastStatusBadge({ candidate }: { candidate: BroadcastCandidate }) {
  const label = candidate.presentationState === "live" ? "Live now"
    : candidate.presentationState === "upcoming" ? "Upcoming"
      : candidate.presentationState === "archive" ? "Latest broadcast" : "Latest episode";
  return <span className={`broadcast-status broadcast-status--${candidate.presentationState}`}><i />{label}</span>;
}

export function BroadcastPlayer({
  candidate,
  eager = false,
  className = "",
}: {
  candidate: BroadcastCandidate | null;
  eager?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(eager);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(eager);
    if (eager || !stage.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setActive(true);
        observer.disconnect();
      }
    }, { rootMargin: "280px" });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [candidate?.key, eager]);

  if (!candidate) {
    return (
      <div ref={stage} className={`broadcast-player broadcast-player--empty ${className}`} role="region" aria-label="Broadcast player unavailable">
        <RadioIcon /><strong>No broadcast snapshot yet</strong><span>Direct platform links remain available below.</span>
      </div>
    );
  }
  const label = `${platformLabel(candidate.platform)} — ${candidate.title}`;
  const showIframe = active && candidate.embedUrl;
  return (
    <div ref={stage} className={`broadcast-player broadcast-player--${candidate.platform} ${className}`} role="region" aria-label={`Broadcast player: ${label}`}>
      {showIframe ? (
        <iframe
          src={candidate.embedUrl ?? undefined}
          title={label}
          loading={eager ? "eager" : "lazy"}
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="broadcast-player__poster" style={candidate.thumbnailUrl ? { backgroundImage: `url("${candidate.thumbnailUrl}")` } : undefined}>
          <div className="broadcast-player__shade" />
          <span className="broadcast-player__platform"><img src={platformIcon(candidate.platform)} alt="" />{platformLabel(candidate.platform)}</span>
          <a href={candidate.watchUrl} target="_blank" rel="noreferrer" aria-label={`Watch ${candidate.title} on ${platformLabel(candidate.platform)}`}>
            <PlayIcon /><span>{candidate.embedUrl ? "Load player" : `Watch on ${platformLabel(candidate.platform)}`}</span>
          </a>
        </div>
      )}
    </div>
  );
}

export function BroadcastMetadata({ candidate, freshness }: { candidate: BroadcastCandidate; freshness: "fresh" | "delayed" | "stale" }) {
  const time = candidate.actualStart ?? candidate.scheduledStart ?? candidate.publishedAt;
  return (
    <div className="broadcast-metadata">
      <div className="broadcast-metadata__rail">
        <BroadcastStatusBadge candidate={candidate} />
        <span><img src={platformIcon(candidate.platform)} alt="" />{platformLabel(candidate.platform)}</span>
        {freshness !== "fresh" && <span>{freshness === "delayed" ? "Signal delayed" : "Last known signal"}</span>}
      </div>
      <h2>{candidate.title}</h2>
      <div className="broadcast-metadata__facts">
        {time && <span>{formatDate(time)}</span>}
        {candidate.viewerCount !== null && freshness === "fresh" && candidate.presentationState === "live" && <span>{formatCount(candidate.viewerCount)} watching</span>}
        {candidate.creatorName && <span>{candidate.creatorName}</span>}
      </div>
      {candidate.description && <p>{candidate.description}</p>}
      <a className="button button--outline" href={candidate.watchUrl} target="_blank" rel="noreferrer">
        {candidate.platform === "rumble" && <img className="broadcast-metadata__action-icon" src={rumbleIcon} alt="" aria-hidden="true" />}
        Open on {platformLabel(candidate.platform)} <ArrowIcon />
      </a>
    </div>
  );
}

export function PlatformSelector({
  candidates,
  selectedKey,
  onSelect,
}: {
  candidates: BroadcastCandidate[];
  selectedKey: string | null;
  onSelect: (candidate: BroadcastCandidate) => void;
}) {
  if (candidates.length < 2) return null;
  return (
    <div className="platform-selector" role="group" aria-label="Choose broadcast platform">
      {candidates.map((candidate) => (
        <button key={candidate.key} type="button" className={candidate.key === selectedKey ? "is-active" : ""} onClick={() => onSelect(candidate)}>
          <img src={platformIcon(candidate.platform)} alt="" /><span>{platformLabel(candidate.platform)}</span>
          {candidate.presentationState === "live" && <b>Live</b>}
        </button>
      ))}
    </div>
  );
}

export function broadcastCandidates(candidate: BroadcastCandidate | null, byPlatform: Record<BroadcastPlatform, BroadcastCandidate | null>) {
  const values = [candidate, byPlatform.rumble, byPlatform.youtube].filter((value): value is BroadcastCandidate => Boolean(value));
  return values.filter((value, index) => values.findIndex((other) => other.key === value.key) === index);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
