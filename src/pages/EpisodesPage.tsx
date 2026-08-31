import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import rumbleIcon from "../../assets/icons/rumble.svg";
import { formatDate } from "../components/BroadcastComponents";
import { EpisodeCard } from "../components/EpisodeComponents";
import { ArrowIcon, BoltIcon, RadioIcon } from "../components/Icons";
import { useEpisodes } from "../hooks/useEpisodes";
import { useMotionGate } from "../hooks/useMotionGate";

const ARCHIVE_SIZE = 24;
const RUMBLE_ARCHIVE_URL = "https://rumble.com/thirdrailify";

export function EpisodesPage() {
  const { data, loading, error } = useEpisodes();
  const episodes = data?.items ?? [];
  const visible = data?.summary.visibleCount;
  const remaining = data?.summary.placeholderCount;
  const newest = episodes[0] ?? null;
  const motion = useMotionGate<HTMLElement>();
  return (
    <div className="episodes-page">
      <header ref={motion.ref} className={`episodes-hero episodes-signal-hero${motion.active ? " is-motion-active" : ""}`} data-motion={motion.active ? "active" : "static"}>
        <div className="episodes-signal-field" aria-hidden="true">
          <i className="episodes-signal-field__grid" />
          <div className="episodes-signal-field__depth"><i /><i /></div>
          <svg className="episodes-signal-field__frequencies" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path className="episodes-signal-field__frequency episodes-signal-field__frequency--base" d="M-8 82C18 68 32 74 47 54S72 23 108 12" />
            <path className="episodes-signal-field__frequency episodes-signal-field__frequency--base" d="M-8 92C20 84 38 88 53 67S77 42 108 36" />
            <path className="episodes-signal-field__frequency episodes-signal-field__frequency--live episodes-signal-field__frequency--one" d="M-8 82C18 68 32 74 47 54S72 23 108 12" />
            <path className="episodes-signal-field__frequency episodes-signal-field__frequency--live episodes-signal-field__frequency--two" d="M-8 92C20 84 38 88 53 67S77 42 108 36" />
          </svg>
          <div className="episodes-signal-field__particles">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
          <i className="episodes-signal-field__glow" />
          <div className="episodes-signal-field__beacon"><i /><i /><i /><span /></div>
        </div>
        <div className="container episodes-signal-hero__layout">
          <div className="episodes-signal-hero__copy">
            <p className="eyebrow"><i /> Stream archive / 24 retained records</p>
            <h1>Every signal<br />leaves a <span>trace.</span></h1>
            <p>The latest validated broadcasts resolve into a permanent trail. Each retained node is real; every open position waits for the next completed transmission.</p>
            <Link className="episodes-signal-hero__return" to="/watch">Return to Watch <ArrowIcon /></Link>
          </div>
          <ArchiveStatus visible={visible} remaining={remaining} newestDate={newest?.archiveDate ?? null} />
        </div>
        <div className="episodes-signal-hero__telemetry" aria-hidden="true"><span>Signed snapshots only</span><i /><span>24-record archive</span><i /><span>Newest first</span></div>
      </header>

      <section className="episodes-gallery" aria-labelledby="episode-gallery-title">
        <div className="container episodes-toolbar">
          <div><p className="eyebrow">Episode archive</p><h2 id="episode-gallery-title">Past episodes</h2></div>
          <div className="episodes-toolbar__facts"><span><b>{visible ?? "—"}</b> archived</span><span><b>{remaining ?? "—"}</b> future positions</span><span>Newest first</span></div>
        </div>
        {error && <p className="container watch-inline-alert" role="status">The archive service is unavailable. Future archive positions remain visible while current playback stays independent.</p>}
        <div className="container episode-gallery-grid" aria-busy={loading}>
          {Array.from({ length: ARCHIVE_SIZE }, (_, index) => <EpisodeCard key={episodes[index]?.id ?? `archive-position-${index}`} episode={episodes[index] ?? null} index={index} />)}
        </div>
      </section>

      <section className="episodes-rumble-cta" aria-labelledby="rumble-archive-title">
        <div className="container episodes-rumble-cta__inner">
          <span className="episodes-rumble-cta__icon" aria-hidden="true"><img src={rumbleIcon} alt="" /><i /></span>
          <div><p className="eyebrow">Beyond the retained rail</p><h2 id="rumble-archive-title">Watch more on Rumble</h2><p>This archive retains the latest Third Railify broadcasts. Continue into the wider catalogue on the official Rumble channel.</p></div>
          <a className="button button--outline" href={RUMBLE_ARCHIVE_URL} target="_blank" rel="noopener noreferrer" aria-label="See more Third Railify episodes on Rumble (opens in a new tab)">See more on Rumble <ArrowIcon /></a>
        </div>
      </section>
    </div>
  );
}

function ArchiveStatus({ visible, remaining, newestDate }: { visible: number | undefined; remaining: number | undefined; newestDate: string | null }) {
  const count = visible ?? 0;
  return (
    <div className="archive-status" aria-label={visible === undefined ? "Archive capacity loading" : `${visible} of 24 archive records visible, ${remaining} positions awaiting broadcasts`}>
      <div className="archive-status__head"><span><RadioIcon /> Archive register</span><b><i /> {visible === undefined ? "Synchronizing" : "Signal indexed"}</b></div>
      <div className="archive-status__dashboard">
        <div className="archive-status__gauge" style={{ "--archive-progress": `${(count / ARCHIVE_SIZE) * 360}deg` } as CSSProperties}><span><BoltIcon /><strong>{visible ?? "—"}</strong><small>of 24 retained</small></span></div>
        <div className="archive-status__metrics">
          <span><small>Visible episodes</small><strong>{visible === undefined ? "—" : String(visible).padStart(2, "0")}</strong><em>Public archive</em></span>
          <span><small>Open positions</small><strong>{remaining === undefined ? "—" : String(remaining).padStart(2, "0")}</strong><em>Future capacity</em></span>
        </div>
      </div>
      <div className="archive-status__latest"><span><RadioIcon /></span><div><small>Latest retained episode</small><strong>{newestDate ? formatDate(newestDate) : "Awaiting the first signal"}</strong></div><b>Newest first</b></div>
      <div className="archive-status__nodes" aria-hidden="true">{Array.from({ length: ARCHIVE_SIZE }, (_, index) => <i key={index} className={index < count ? "is-retained" : ""} />)}</div>
      <p><span /> Signed Watch ingest populates this register automatically.</p>
    </div>
  );
}
