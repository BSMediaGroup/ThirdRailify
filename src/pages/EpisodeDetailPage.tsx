import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BroadcastMetadata, BroadcastPlayer } from "../components/BroadcastComponents";
import { ArrowIcon, RadioIcon } from "../components/Icons";
import { fetchEpisode, type EpisodeDetail } from "../lib/episodes";
import { NotFoundPage } from "./NotFoundPage";

export function EpisodeDetailPage() {
  const { episodeId = "" } = useParams();
  const [detail, setDetail] = useState<EpisodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setMissing(false); setError(false);
    fetchEpisode(episodeId).then((value) => {
      if (!active) return;
      if (!value) setMissing(true); else setDetail(value);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [episodeId]);
  useEffect(() => {
    if (!detail) return;
    const original = document.title;
    document.title = `${detail.item.title} · Third Railify Watch`;
    return () => { document.title = original; };
  }, [detail]);
  if (missing) return <NotFoundPage />;
  if (loading) return <EpisodeState title="Acquiring archived signal." />;
  if (error || !detail) return <EpisodeState title="The archived signal is unavailable." />;
  const { item, archive } = detail;
  return (
    <article className="episode-detail">
      <header className="container episode-detail__header"><nav aria-label="Breadcrumb"><Link to="/watch">Watch</Link><span>/</span><Link to="/watch/episodes">Episodes</Link><span>/</span><span aria-current="page">Archive {String(archive.position).padStart(2, "0")}</span></nav><div className="episode-detail__heading"><div><p className="eyebrow">Retained transmission / {String(archive.position).padStart(2, "0")}</p><h1>{item.title}</h1></div><Link className="button button--outline" to="/watch/episodes">Full archive <ArrowIcon /></Link></div></header>
      <div className="container episode-detail__stage"><div className="watch-stage__scan" aria-hidden="true" /><BroadcastPlayer candidate={item} eager /></div>
      <div className="container episode-detail__body"><BroadcastMetadata candidate={item} freshness="fresh" /><aside><span>Archive position</span><strong>{String(archive.position).padStart(2, "0")} / {String(archive.visibleCount).padStart(2, "0")}</strong><Link className="text-link" to="/watch/episodes">Open full archive <ArrowIcon /></Link></aside></div>
      <nav className="container episode-neighbours" aria-label="Visible episode navigation"><div>{archive.previous ? <Link to={archive.previous.route}><small>Previous transmission</small><strong>← {archive.previous.title}</strong></Link> : <span><small>Archive boundary</small><strong>Newest visible episode</strong></span>}</div><Link className="episode-neighbours__watch" to="/watch">Back to Watch</Link><div>{archive.next ? <Link to={archive.next.route}><small>Next transmission</small><strong>{archive.next.title} →</strong></Link> : <span><small>Archive boundary</small><strong>Oldest visible episode</strong></span>}</div></nav>
    </article>
  );
}

function EpisodeState({ title }: { title: string }) {
  return <section className="watch-theatre watch-theatre--empty"><div className="container"><RadioIcon /><p className="eyebrow">Archive</p><h1>{title}</h1><p>No episode metadata or player has been fabricated.</p><div className="button-row"><Link className="button button--primary" to="/watch/episodes">Open archive</Link><Link className="button button--outline" to="/watch">Back to Watch</Link></div></div></section>;
}
