import { useState } from "react";
import { Link } from "react-router-dom";
import type { WatchEpisode } from "../lib/episodes";
import { formatDate, platformIcon, platformLabel } from "./BroadcastComponents";
import { ArrowIcon, BoltIcon } from "./Icons";

export function EpisodeCard({ episode, index, featured = false }: { episode: WatchEpisode | null; index: number; featured?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const slot = String(index + 1).padStart(2, "0");
  if (!episode) {
    return (
      <article className={`episode-card episode-card--placeholder episode-card--pattern-${index % 4}${featured ? " episode-card--featured" : ""}`} aria-label={`Archive position ${slot}, awaiting transmission`}>
        <EpisodeFallback placeholder variant={index % 4} />
        <div className="episode-card__body"><span>Archive position {slot}</span><h3>Awaiting transmission</h3><p>Reserved for the next validated broadcast.</p></div>
      </article>
    );
  }
  return (
    <article className={`episode-card${featured ? " episode-card--featured" : ""}`}>
      <Link className="episode-card__media" to={`/watch/v/${episode.id}`} aria-label={`Watch ${episode.title}`}>
        {episode.thumbnailUrl && !imageFailed
          ? <img src={episode.thumbnailUrl} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
          : <EpisodeFallback />}
        <span className="episode-card__slot">{slot}</span>
        <span className="episode-card__play" aria-hidden="true">▶</span>
      </Link>
      <div className="episode-card__body">
        <span><img src={platformIcon(episode.platform)} alt="" />{platformLabel(episode.platform)} · {formatDate(episode.archiveDate)}</span>
        <h3><Link to={`/watch/v/${episode.id}`}>{episode.title}</Link></h3>
        <Link className="text-link" to={`/watch/v/${episode.id}`}>Open episode <ArrowIcon /></Link>
      </div>
    </article>
  );
}

export function EpisodeFallback({ placeholder = false, variant = 0 }: { placeholder?: boolean; variant?: number }) {
  return <div className={`episode-fallback${placeholder ? " episode-fallback--placeholder" : ""} episode-fallback--${variant}`} aria-hidden="true"><span /><i /><BoltIcon /><b>{placeholder ? "SIGNAL WAITING" : "THIRD RAILIFY ARCHIVE"}</b></div>;
}
