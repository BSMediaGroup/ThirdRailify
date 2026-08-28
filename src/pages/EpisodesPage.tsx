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
      <header ref={motion.ref} className={`episodes-hero episodes-signal-hero${motion.active ? " is-motion-active" : ""}`}>
        <div className="episodes-signal-field" aria-hidden="true">
          <i className="episodes-signal-field__grid" />
          <i className="episodes-signal-field__sweep" />
          <i className="episodes-signal-field__orbit episodes-signal-field__orbit--one" />
          <i className="episodes-signal-field__orbit episodes-signal-field__orbit--two" />
          <span className="episodes-signal-field__rail episodes-signal-field__rail--one" />
          <span className="episodes-signal-field__rail episodes-signal-field__rail--two" />
          <span className="episodes-signal-field__rail episodes-signal-field__rail--three" />
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
      <div className="archive-status__head"><span><RadioIcon /> Retained signal map</span><b>{visible === undefined ? "SYNCING" : `${String(count).padStart(2, "0")} / 24`}</b></div>
      <div className="archive-status__core">
        <div className="archive-status__gauge" style={{ "--archive-progress": `${(count / ARCHIVE_SIZE) * 360}deg` } as CSSProperties}><span><BoltIcon /><strong>{visible ?? "—"}</strong><small>Retained</small></span></div>
        <div className="archive-status__facts"><span><small>Capacity remaining</small><strong>{remaining ?? "—"}</strong></span><span><small>Newest trace</small><strong>{newestDate ? formatDate(newestDate) : "Awaiting signal"}</strong></span></div>
      </div>
      <div className="archive-status__nodes" aria-hidden="true">{Array.from({ length: ARCHIVE_SIZE }, (_, index) => <i key={index} className={index < count ? "is-retained" : ""} />)}</div>
      <p><span /> Accepted signed snapshots populate this field automatically.</p>
    </div>
  );
}
