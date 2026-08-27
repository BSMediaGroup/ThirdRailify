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
      <article className={`episode-card episode-card--placeholder${featured ? " episode-card--featured" : ""}`} aria-label={`Archive slot ${slot}, awaiting transmission`}>
        <EpisodeFallback placeholder />
        <div className="episode-card__body"><span>Archive slot {slot}</span><h3>Awaiting transmission</h3><p>Future broadcasts will fill this position automatically.</p></div>
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

export function EpisodeFallback({ placeholder = false }: { placeholder?: boolean }) {
  return <div className={`episode-fallback${placeholder ? " episode-fallback--placeholder" : ""}`} aria-hidden="true"><span /><i /><BoltIcon /><b>{placeholder ? "FUTURE SIGNAL" : "THIRD RAILIFY ARCHIVE"}</b></div>;
}
