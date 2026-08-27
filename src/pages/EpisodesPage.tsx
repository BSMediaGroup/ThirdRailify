import { Link } from "react-router-dom";
import { EpisodeCard } from "../components/EpisodeComponents";
import { ArrowIcon } from "../components/Icons";
import { useEpisodes } from "../hooks/useEpisodes";

export function EpisodesPage() {
  const { data, loading, error } = useEpisodes();
  const episodes = data?.items ?? [];
  const visible = data?.summary.visibleCount;
  const remaining = data?.summary.placeholderCount;
  return (
    <div className="episodes-page">
      <header className="episodes-hero">
        <div className="container episodes-hero__layout"><div><p className="eyebrow">Episode archive / 24 retained slots</p><h1>Every signal leaves a trace.</h1><p>The archive fills automatically when validated broadcasts complete. Hidden and future positions remain truthful signal-waiting slots.</p></div><div className="episodes-hero__summary" aria-label="Archive capacity"><span><strong>{visible ?? "—"}</strong>Visible</span><span><strong>{remaining ?? "—"}</strong>Awaiting</span><Link className="button button--outline" to="/watch">Return to Watch <ArrowIcon /></Link></div></div>
      </header>
      <section className="episodes-gallery" aria-labelledby="episode-gallery-title">
        <div className="container episodes-toolbar"><div><p className="eyebrow">Archive index</p><h2 id="episode-gallery-title">Transmission slots 01—24</h2></div><div className="episodes-toolbar__facts"><span><b>{visible ?? "—"}</b> visible</span><span><b>{remaining ?? "—"}</b> available</span><span>Newest first</span></div></div>
        {error && <p className="container watch-inline-alert" role="status">The archive service is unavailable. Placeholder slots remain visible while current playback stays independent.</p>}
        <div className="container episode-gallery-grid" aria-busy={loading}>
          {Array.from({ length: 24 }, (_, index) => <EpisodeCard key={episodes[index]?.id ?? `archive-slot-${index}`} episode={episodes[index] ?? null} index={index} />)}
        </div>
      </section>
    </div>
  );
}
