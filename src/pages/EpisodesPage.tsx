import { Link } from "react-router-dom";
import { EpisodeCard } from "../components/EpisodeComponents";
import { ArrowIcon } from "../components/Icons";
import { useEpisodes } from "../hooks/useEpisodes";

export function EpisodesPage() {
  const { data, loading, error } = useEpisodes();
  const episodes = data?.items ?? [];
  return (
    <div className="episodes-page">
      <header className="episodes-hero">
        <div className="container"><p className="eyebrow">24-slot transmission archive</p><h1>Every signal leaves a trace.</h1><p>The archive fills naturally when validated broadcasts complete. Hidden or not-yet-filled positions remain truthful placeholders.</p><div><strong>{episodes.length}</strong><span>visible episodes</span><b>{24 - episodes.length} slots awaiting transmission</b></div></div>
      </header>
      <section className="section episodes-gallery" aria-labelledby="episode-gallery-title">
        <div className="container episodes-gallery__heading"><div><p className="eyebrow">Newest first</p><h2 id="episode-gallery-title">Archive slots 01—24.</h2></div><Link className="text-link" to="/watch">Back to Watch <ArrowIcon /></Link></div>
        {error && <p className="container watch-inline-alert" role="status">The archive service is unavailable. Placeholder slots remain visible while current playback stays independent.</p>}
        <div className="container episode-gallery-grid" aria-busy={loading}>
          {Array.from({ length: 24 }, (_, index) => <EpisodeCard key={episodes[index]?.id ?? `archive-slot-${index}`} episode={episodes[index] ?? null} index={index} />)}
        </div>
      </section>
    </div>
  );
}
