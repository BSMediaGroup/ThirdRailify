import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useModalDialog } from "../wheels/dialog";
import {
  createPoll,
  getCreatorAccess,
  getPoll,
  getRumbleDiscovery,
  lifecyclePoll,
  listPolls,
  removePollMedia,
  savePoll,
  uploadPollMedia,
  visibilityPoll,
  votePoll,
  type PollError,
} from "../polls/client";
import { matchPollTrigger, normalizePollTrigger } from "../polls/normalization";
import type { Poll, PollAccess, PollMediaAsset, RumbleDiscovery } from "../polls/types";
import { useCoordinatedPollRefresh } from "../polls/live";
import { usePageSeo } from "../seo/SeoProvider";
import type { SeoDocument } from "../../seo/site-seo.js";
import { GalleryHeroAtmosphere, PollSignalDiagram } from "../components/GalleryHeroVisuals";
import { EphemeralNotices } from "../components/EphemeralNotices";
import { useMotionGate } from "../hooks/useMotionGate";
import "../styles/polls.css";
import "../styles/gallery-heroes.css";

export function PollsPage() {
  const { account, openAuth } = useAuth();
  const hero = useMotionGate<HTMLElement>();
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Poll[]>([]);
  const [pastItems, setPastItems] = useState<Poll[]>([]);
  const [mineItems, setMineItems] = useState<Poll[]>([]);
  const [selected, setSelected] = useState<Poll | null>(null);
  const [openLoading, setOpenLoading] = useState(true);
  const [pastLoading, setPastLoading] = useState(true);
  const [mineLoading, setMineLoading] = useState(false);
  const [openError, setOpenError] = useState("");
  const [pastError, setPastError] = useState("");
  const [mineError, setMineError] = useState("");
  const [pastPage, setPastPage] = useState(1);
  const [pastPages, setPastPages] = useState(0);
  const [canCreate, setCanCreate] = useState(false);
  const openIds = useRef<string[]>([]);
  const loadPast = useCallback(async (page = 1, append = false, quiet = false) => {
    if (!quiet) setPastLoading(true);
    try {
      const payload = await listPolls("closed", search, page, 12);
      setPastItems((current) => append ? mergePolls(current, payload.items) : payload.items);
      setPastPage(payload.page);
      setPastPages(payload.totalPages);
      setPastError("");
    } catch (reason) {
      setPastError(message(reason));
    } finally {
      if (!quiet) setPastLoading(false);
    }
  }, [search]);
  const loadOpen = useCallback(async (quiet = false) => {
    if (!quiet) setOpenLoading(true);
    try {
      const payload = await listPolls("open", search, 1, 24);
      const nextIds = payload.items.map((item) => item.id);
      if (quiet && openIds.current.some((id) => !nextIds.includes(id))) await loadPast(1, false, true);
      openIds.current = nextIds;
      setOpenItems(payload.items);
      setOpenError("");
    } catch (reason) {
      setOpenError(message(reason));
    } finally {
      if (!quiet) setOpenLoading(false);
    }
  }, [loadPast, search]);
  const loadMine = useCallback(async () => {
    setMineLoading(true);
    try {
      const payload = await listPolls("mine", search, 1, 48);
      setMineItems(payload.items);
      setMineError("");
    } catch (reason) {
      setMineError(message(reason));
    } finally {
      setMineLoading(false);
    }
  }, [search]);
  useEffect(() => {
    if (view === "all" || view === "open") void loadOpen();
    if (view === "all" || view === "closed") void loadPast();
    if (view === "mine") void loadMine();
  }, [loadMine, loadOpen, loadPast, view]);
  useEffect(() => {
    if (!account) { setCanCreate(false); return; }
    void getCreatorAccess().then((access) => setCanCreate(Boolean(access.canCreate))).catch(() => setCanCreate(false));
  }, [account]);
  useCoordinatedPollRefresh(
    useCallback(() => {
      if (openItems.length) void loadOpen(true);
    }, [loadOpen, openItems.length]),
    (view === "all" || view === "open") && openItems.length > 0,
  );
  const changed = (poll: Poll) => {
    setSelected(poll);
    setOpenItems((current) => current.map((item) => item.id === poll.id ? poll : item));
    setPastItems((current) => current.map((item) => item.id === poll.id ? poll : item));
    setMineItems((current) => current.map((item) => item.id === poll.id ? poll : item));
  };
  return (
    <div className="polls-page">
      <section ref={hero.ref} className={`polls-hero gallery-hero${hero.active ? " is-motion-active" : ""}`} data-motion={hero.active ? "active" : "static"}>
        <GalleryHeroAtmosphere variant="polls" />
        <div className="container polls-hero__grid">
          <div className="polls-hero__copy">
            <p className="eyebrow">THIRD RAILIFY LIVE CHOICE</p>
            <h1>
              READ THE <em>ROOM.</em>
            </h1>
            <p>
              Audience Polls built for the web and the live Rumble signal, with
              one authoritative current vote per source and visible result
              freshness.
            </p>
            <div className="polls-hero__actions">
              {canCreate ? (
                <Link className="button button--primary" to="/polls/new">
                  Create a Poll
                </Link>
              ) : account ? (
                <span className="polls-access-note">Creator access is granted by Admin.</span>
              ) : (
                <button
                  className="button button--primary"
                  onClick={() => openAuth("signin")}
                >
                  Log in for creator access
                </button>
              )}
              <a className="button button--ghost" href="#poll-directory">
                Explore Polls
              </a>
            </div>
          </div>
          <PollSignalDiagram />
        </div>
        <div className="polls-trust-rail"><span><i aria-hidden="true" /><b>WEB</b> Direct audience choice</span><span><i aria-hidden="true" /><b>RUMBLE</b> Live chat signal</span><span><i aria-hidden="true" /><b>AUTHORITATIVE</b> One current vote per source</span></div>
      </section>
      <section id="poll-directory" className="container poll-directory">
        <header>
          <div>
            <p className="eyebrow">PUBLIC SIGNALS</p>
            <h2>Poll directory</h2>
            <p>
              Open Polls refresh together. Closed results settle into a quieter,
              cache-friendly state.
            </p>
          </div>
          <div className="poll-directory__tools">
            <label>
              <span>View</span>
              <select
                value={view}
                onChange={(event) => setView(event.target.value)}
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                {account ? <option value="mine">Mine</option> : null}
              </select>
            </label>
            <label>
              <span>Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Polls"
              />
            </label>
          </div>
        </header>
        {view === "all" || view === "open" ? <PollDirectorySection title="Open Polls" eyebrow="LIVE NOW" items={openItems} loading={openLoading} error={openError} empty="No Polls are open right now." onQuickView={setSelected} /> : null}
        {view === "all" || view === "closed" ? <PollDirectorySection title="Past Polls" eyebrow="SETTLED SIGNALS" items={pastItems} loading={pastLoading} error={pastError} empty="No completed Polls yet." onQuickView={setSelected} footer={pastPage < pastPages ? <button className="button button--ghost poll-history-more" type="button" disabled={pastLoading} onClick={() => void loadPast(pastPage + 1, true)}>{pastLoading ? "Loading…" : "Load more Past Polls"}</button> : null} /> : null}
        {view === "mine" ? <PollDirectorySection title="Your Polls" eyebrow="CREATOR LIBRARY" items={mineItems} loading={mineLoading} error={mineError} empty="You have not created a Poll yet." onQuickView={setSelected} /> : null}
      </section>
      {selected ? (
        <PollQuickView
          poll={selected}
          account={account}
          openAuth={openAuth}
          onClose={() => setSelected(null)}
          onChanged={changed}
        />
      ) : null}
    </div>
  );
}

function PollDirectorySection({ title, eyebrow, items, loading, error, empty, onQuickView, footer }: { title: string; eyebrow: string; items: Poll[]; loading: boolean; error: string; empty: string; onQuickView: (poll: Poll) => void; footer?: React.ReactNode }) {
  const headingId = `poll-section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return <section className="poll-directory-section" aria-labelledby={headingId}>
    <header><div><p className="eyebrow">{eyebrow}</p><h3 id={headingId}>{title}</h3></div><span>{items.length} shown</span></header>
    {error ? <State kind="error" title={`${title} temporarily unavailable`} copy={error} /> : loading && !items.length ? <State title={`Loading ${title}…`} /> : items.length ? <div className="poll-card-grid">{items.map((poll) => <PollCard key={poll.id} poll={poll} onQuickView={onQuickView} />)}</div> : <div className="poll-section-empty"><p>{empty}</p></div>}
    {footer ? <footer className="poll-directory-section__footer">{footer}</footer> : null}
  </section>;
}

function mergePolls(current: Poll[], incoming: Poll[]) {
  const items = new Map(current.map((poll) => [poll.id, poll]));
  incoming.forEach((poll) => items.set(poll.id, poll));
  return [...items.values()];
}

function PollCover({ poll, compact = false, children }: { poll: Poll; compact?: boolean; children?: React.ReactNode }) {
  const accent = poll.theme?.accent || "#f3c928";
  const bannerUrl = poll.media?.banner?.url || "";
  const [failedBannerUrl, setFailedBannerUrl] = useState("");
  const showBanner = Boolean(bannerUrl && failedBannerUrl !== bannerUrl);
  return (
    <div className={`poll-cover${compact ? " poll-cover--compact" : ""}${showBanner ? " has-banner" : " is-generated"}`} style={{ "--poll-accent": accent } as React.CSSProperties}>
      {showBanner ? <img src={bannerUrl} alt={`${poll.title} cover`} onError={() => setFailedBannerUrl(bannerUrl)} /> : <div className="poll-cover__fallback" aria-hidden="true"><span>{poll.title.trim().charAt(0).toUpperCase() || "P"}</span><svg viewBox="0 0 220 120"><path d="M122 4 72 66h38l-13 50 55-70h-39z" /></svg></div>}
      <div className="poll-cover__shade" />
      {children}
    </div>
  );
}

function PollCard({
  poll,
  onQuickView,
  preview = false,
}: {
  poll: Poll;
  onQuickView: (poll: Poll) => void;
  preview?: boolean;
}) {
  const ranked = [...poll.options].sort((a, b) => b.votes - a.votes || a.position - b.position);
  const leading = ranked[0];
  const outcome = pollOutcome(poll);
  return (
    <article className={`poll-card poll-card--${poll.state}`} style={{ "--poll-accent": poll.theme?.accent || "#f3c928" } as React.CSSProperties}>
      {!preview ? <button
        className="poll-card__quick"
        type="button"
        onClick={() => onQuickView(poll)}
        aria-label={`Quick view ${poll.title}`}
      /> : null}
      <PollCover poll={poll} compact>
        <div className="poll-card__signal">
          <Status poll={poll} />
          <span>{poll.rumbleEnabled ? "RUMBLE + WEB" : "WEB"}</span>
          <span>{poll.webVotingMode === "anyone" ? "OPEN ACCESS" : "SIGNED IN"}</span>
        </div>
      </PollCover>
      <div className="poll-card__identity">
        <p className="eyebrow">BY {poll.owner.displayName}</p>
        <h3>{poll.title}</h3>
        <p>{poll.description || "A Third Railify audience Poll."}</p>
      </div>
      <div className="poll-card__result">
        <span
          style={{
            width: `${poll.totalVotes && leading ? Math.round((leading.votes / poll.totalVotes) * 100) : 0}%`,
          }}
        />
        {leading?.image ? <ResilientImage src={leading.image.url} alt="" /> : null}
        <strong>{leading ? `${poll.state === "closed" && poll.totalVotes ? outcome.tied ? "TIED TOP RESULT · " : "TOP RESULT · " : ""}${outcome.tied ? outcome.leaders.map((option) => option.label).join(" + ") : leading.label}` : "Awaiting first vote"}</strong>
        <b>
          {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
        </b>
      </div>
      {poll.state === "closed" ? <div className="poll-card__finals" aria-label={`Final results for ${poll.title}`}>{ranked.slice(0, 3).map((option) => { const percentage = poll.totalVotes ? (option.votes / poll.totalVotes) * 100 : 0; return <div key={option.id}><span><b>{option.label}</b><em>{percentage.toFixed(poll.totalVotes ? 1 : 0)}% · {option.votes}</em></span><i aria-hidden="true"><i style={{ width: `${percentage}%` }} /></i></div>; })}</div> : null}
      {!preview ? <footer>
        <span>
          By {poll.owner.displayName} ·{" "}
          {poll.closedAt
            ? `Closed ${freshness(poll.closedAt).replace("Updated ", "")}`
            : freshness(poll.updatedAt)}
        </span>
        <button type="button" onClick={() => onQuickView(poll)}>
          Quick view
        </button>
        <Link
          to={`/polls/${poll.slug}`}
          onClick={(event) => event.stopPropagation()}
        >
          Open detail ↗
        </Link>
      </footer> : null}
    </article>
  );
}

function pollOutcome(poll: Poll) {
  const ranked = [...poll.options].sort((a, b) => b.votes - a.votes || a.position - b.position);
  const highest = ranked[0]?.votes || 0;
  const leaders = highest > 0 ? ranked.filter((option) => option.votes === highest) : [];
  return { leaders, tied: leaders.length > 1, topIds: new Set(leaders.map((option) => option.id)) };
}

function PollQuickView({
  poll,
  account,
  openAuth,
  onClose,
  onChanged,
}: {
  poll: Poll;
  account: unknown;
  openAuth: (mode?: "signin") => void;
  onClose: () => void;
  onChanged: (poll: Poll) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useModalDialog(root, close, onClose);
  const { csrfToken } = useAuth();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const vote = async (optionId: string) => {
    if (poll.webVotingMode === "signed_in" && !account) {
      openAuth("signin");
      return;
    }
    setBusy(optionId);
    setError("");
    try {
      const result = await votePoll(
        poll.slug,
        optionId,
        account ? csrfToken : "",
      );
      onChanged(result.poll);
      setNotice(
        result.vote.repeated
          ? "Your vote was already counted once."
          : result.vote.changed
            ? "Vote changed."
            : "Vote recorded.",
      );
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy("");
    }
  };
  return (
    <div
      className="poll-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="poll-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="poll-quick-title"
        ref={root}
      >
        <PollCover poll={poll}>
          <div className="poll-modal__cover-copy">
            <Status poll={poll} />
            <h2 id="poll-quick-title">{poll.title}</h2>
            <p>By {poll.owner.displayName}</p>
          </div>
          <button ref={close} className="poll-modal__close" type="button" onClick={onClose} aria-label="Close Poll quick view">
            <span aria-hidden="true">&times;</span>
          </button>
        </PollCover>
        {poll.state === "closed" ? <div className="poll-modal__summary"><strong>{pollOutcome(poll).tied ? "Tied top result" : poll.totalVotes ? "Final top result" : "Final result"}</strong><span>{poll.totalVotes} total vote{poll.totalVotes === 1 ? "" : "s"}</span></div> : null}
        <ResultOptions poll={poll} busy={busy} vote={vote} />
        <EphemeralNotices notice={notice} error={error} noticeTitle="Vote received" errorTitle="Vote unavailable" onDismissNotice={() => setNotice("")} onDismissError={() => setError("")} />
        <footer>
          <Link to={`/polls/${poll.slug}`}>Full Poll</Link>
          <a
            href={`/polls/${poll.slug}/popout`}
            target="_blank"
            rel="noreferrer"
          >
            Open popout ↗
          </a>
        </footer>
      </div>
    </div>
  );
}

export function PollDetailPage({ popout = false }: { popout?: boolean }) {
  const { slug = "" } = useParams();
  const { account, csrfToken, openAuth } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [access, setAccess] = useState<PollAccess>({ canManage: false, canManageAll: false, isOwner: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const payload = await getPoll(slug);
        setPoll(payload.poll);
        setAccess(payload.access);
        setError("");
      } catch (reason) {
        setError(message(reason));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [slug],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useCoordinatedPollRefresh(
    useCallback(() => {
      if (poll?.state === "open") void load(true);
    }, [load, poll?.state]),
    poll?.state === "open",
  );
  usePageSeo(poll ? pollSeo(poll, popout) : null);
  const vote = async (optionId: string) => {
    if (!poll) return;
    if (poll.webVotingMode === "signed_in" && !account) {
      openAuth("signin");
      return;
    }
    setBusy(optionId);
    setError("");
    try {
      const result = await votePoll(
        poll.slug,
        optionId,
        account ? csrfToken : "",
      );
      setPoll(result.poll);
      setNotice(
        result.vote.repeated
          ? "Your current vote remains counted once."
          : result.vote.changed
            ? "Vote changed and totals moved atomically."
            : "Vote recorded.",
      );
    } catch (reason) {
      const known = reason as PollError;
      setError(
        known.code === "poll_closed_during_submission"
          ? "The Poll closed during submission. Results have been refreshed."
          : message(reason),
      );
      void load(true);
    } finally {
      setBusy("");
    }
  };
  const closeOwnedPoll = async () => {
    if (!poll || !access.isOwner || !csrfToken || poll.state !== "open") return;
    if (!window.confirm(`Close “${poll.title}” and settle its final results? New votes will be rejected.`)) return;
    setBusy("close"); setError("");
    try { const result = await lifecyclePoll(poll.slug, poll.revision, "close", csrfToken); setPoll(result.poll); setNotice("Poll closed. Final results are now settled."); }
    catch (reason) { setError(message(reason)); void load(true); }
    finally { setBusy(""); }
  };
  const manageVisibility = async () => {
    if (!poll || !access.isOwner || !csrfToken || poll.state !== "closed") return;
    const nextPublic = !poll.public;
    if (!nextPublic && !window.confirm(`Hide “${poll.title}” from the public Poll gallery? Its owner management view will remain available.`)) return;
    setBusy("visibility"); setError("");
    try { const result = await visibilityPoll(poll.slug, poll.revision, nextPublic, csrfToken); setPoll(result.poll); setNotice(nextPublic ? "Poll is visible in the public gallery." : "Poll is hidden from the public gallery."); }
    catch (reason) { setError(message(reason)); void load(true); }
    finally { setBusy(""); }
  };
  if (loading) return <State title="Loading Poll…" />;
  if (!poll)
    return <State kind="error" title="Poll unavailable" copy={error} />;
  return (
    <div className={popout ? "poll-popout" : "poll-detail-page"}>
      <section className="poll-stage" style={{ "--poll-accent": poll.theme?.accent || "#f3c928" } as React.CSSProperties}>
        <PollCover poll={poll}>
          <div className="poll-stage__cover-copy">
            <Status poll={poll} />
            <p className="eyebrow">
              {poll.rumbleEnabled ? "WEB + RUMBLE LIVE CHAT" : "WEB POLL"}
            </p>
            <h1>{poll.title}</h1>
            <p>{poll.description}</p>
            <div className="poll-stage__meta">
              <span>By {poll.owner.displayName}</span>
              <span>
                {poll.webVotingMode === "anyone"
                  ? "Anonymous or account voting"
                  : "Signed-in accounts only"}
              </span>
              <span>{freshness(poll.updatedAt)}</span>
              <span>{poll.public ? "Publicly listed" : "Hidden from gallery"}</span>
            </div>
          </div>
          {!popout ? (
            <div className="poll-stage__actions">
              <Link className="button button--primary poll-back-to-gallery" to="/polls">
                ← Back to Polls
              </Link>
              {access.canManage ? (
                <Link
                  className="button button--secondary"
                  to={`/polls/${poll.slug}/edit`}
                >
                  Edit Poll
                </Link>
              ) : null}
              {access.isOwner && poll.state === "open" ? (
                <button className="button poll-owner-close" type="button" disabled={Boolean(busy)} onClick={() => void closeOwnedPoll()}>
                  {busy === "close" ? "Closing…" : "Close Poll"}
                </button>
              ) : null}
              {access.isOwner && poll.state === "closed" ? (
                <button className="button button--secondary poll-owner-visibility" type="button" disabled={Boolean(busy)} onClick={() => void manageVisibility()} aria-label={poll.public ? "Hide this closed Poll from the gallery" : "Show this closed Poll in the gallery"}>
                  {busy === "visibility" ? "Updating…" : poll.public ? "Hide from gallery" : "Show in gallery"}
                </button>
              ) : null}
              <button
                className="button button--ghost"
                onClick={() =>
                  void navigator.clipboard?.writeText(window.location.href)
                }
              >
                Copy link
              </button>
              <a
                className="button button--ghost"
                href={`/polls/${poll.slug}/popout`}
                target="_blank"
                rel="noreferrer"
              >
                Popout ↗
              </a>
            </div>
          ) : null}
        </PollCover>
        <ResultOptions
          poll={poll}
          busy={busy}
          vote={popout ? undefined : vote}
        />
        {poll.totalVotes === 0 ? (
          <p className="poll-zero">
            Zero votes is a valid live result. The first authoritative choice
            will animate this stage.
          </p>
        ) : null}
        <EphemeralNotices notice={notice} error={error} noticeTitle="Poll updated" errorTitle="Poll action unavailable" onDismissNotice={() => setNotice("")} onDismissError={() => setError("")} />
        <footer>
          <strong>
            {poll.totalVotes} total vote{poll.totalVotes === 1 ? "" : "s"}
          </strong>
          <span>
            {poll.state === "open"
              ? "Refreshing every 7 seconds while visible"
              : "Final result"}
          </span>
          <span>
            {poll.rumbleEnabled
              ? "Rumble votes may lag 10–30 seconds"
              : "Web result authority"}
          </span>
        </footer>
      </section>
    </div>
  );
}

function ResultOptions({
  poll,
  busy,
  vote,
}: {
  poll: Poll;
  busy: string;
  vote?: (optionId: string) => void;
}) {
  const outcome = pollOutcome(poll);
  return (
    <div className="poll-options">
      {poll.options.map((option) => {
        const percentage = poll.totalVotes
          ? (option.votes / poll.totalVotes) * 100
          : 0;
        const current = poll.currentVoteOptionId === option.id;
        return (
          <article key={option.id} className={`${current ? "is-current" : ""}${option.image ? " has-image" : ""}${poll.state === "closed" && outcome.topIds.has(option.id) ? " is-top-result" : ""}`}>
            <div
              className="poll-option__bar"
              style={
                {
                  "--poll-result": `${percentage}%`,
                  "--poll-accent": poll.theme?.accent || "#f3c928",
                } as React.CSSProperties
              }
            />
            {option.image ? <ResilientImage className="poll-option__image" src={option.image.url} alt={`${option.label} option`} /> : null}
            <div className="poll-option__identity">
              <span>{String(option.position + 1).padStart(2, "0")}</span>
              <strong>{option.label}</strong>
              {poll.state === "closed" && outcome.topIds.has(option.id) ? <small className="poll-option__outcome">{outcome.tied ? "TIED TOP RESULT" : "TOP RESULT"}</small> : null}
              {option.description ? <small>{option.description}</small> : null}
            </div>
            <b>{percentage.toFixed(poll.totalVotes ? 1 : 0)}%</b>
            <em>{option.votes}</em>
            {vote && poll.state === "open" ? (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => vote(option.id)}
              >
                {busy === option.id
                  ? "Recording…"
                  : current
                    ? "Your vote"
                    : "Vote"}
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function ResilientImage({ src, alt, className, onFailure }: { src: string; alt: string; className?: string; onFailure?: () => void }) {
  const [failedUrl, setFailedUrl] = useState("");
  if (!src || failedUrl === src) return null;
  return <img className={className} src={src} alt={alt} onError={() => { setFailedUrl(src); onFailure?.(); }} />;
}

type EditorOption = {
  id?: string;
  label: string;
  description: string;
  trigger: string;
  image?: PollMediaAsset | null;
  imageFile?: File | null;
  imagePreview?: string;
};
export function PollEditorPage({ create = false }: { create?: boolean }) {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { loading: authLoading, account, csrfToken, openAuth } = useAuth();
  const [canCreate, setCanCreate] = useState(false);
  const [source, setSource] = useState<Poll | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [webVotingMode, setWebVotingMode] = useState<"anyone" | "signed_in">(
    "anyone",
  );
  const [rumbleEnabled, setRumbleEnabled] = useState(false);
  const [sourceScope, setSourceScope] = useState("");
  const [customSource, setCustomSource] = useState(false);
  const [discovery, setDiscovery] = useState<RumbleDiscovery | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [livestreamMode, setLivestreamMode] = useState<"automatic" | "exact">(
    "automatic",
  );
  const [streamChoice, setStreamChoice] = useState<"automatic" | "detected" | "custom">("automatic");
  const [livestreamId, setLivestreamId] = useState("");
  const [themeAccent, setThemeAccent] = useState("#f3c928");
  const [customTint, setCustomTint] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [options, setOptions] = useState<EditorOption[]>([
    { label: "Option one", description: "", trigger: "1" },
    { label: "Option two", description: "", trigger: "2" },
  ]);
  const [testMessage, setTestMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveStage, setSaveStage] = useState<"saving" | "uploading" | "">("");
  const [mediaWarnings, setMediaWarnings] = useState<string[]>([]);
  const previewUrls = useRef(new Set<string>());
  const createPreview = (file: File) => { const url = URL.createObjectURL(file); previewUrls.current.add(url); return url; };
  const releasePreview = (url = "") => { if (!url || !previewUrls.current.delete(url)) return; URL.revokeObjectURL(url); };
  const releaseAllPreviews = () => { for (const url of previewUrls.current) URL.revokeObjectURL(url); previewUrls.current.clear(); };
  useEffect(() => () => { for (const url of previewUrls.current) URL.revokeObjectURL(url); previewUrls.current.clear(); }, []);
  useEffect(() => {
    if (!account) return;
    void getCreatorAccess()
      .then((value) => setCanCreate(value.canCreate))
      .catch(() => setCanCreate(false));
    if (!create)
      void getPoll(slug)
        .then(({ poll, access }) => {
          if (!access.canManage)
            throw new Error("Owner or Admin access is required.");
          setSource(poll);
          setTitle(poll.title);
          setDescription(poll.description || "");
          setWebVotingMode(poll.webVotingMode);
          setRumbleEnabled(poll.rumbleEnabled);
          setSourceScope(poll.rumbleSourceScope || "");
          setLivestreamMode(poll.livestreamMode || "automatic");
          setLivestreamId(poll.livestreamId || "");
          setStreamChoice(poll.livestreamMode === "exact" ? "custom" : "automatic");
          setThemeAccent(poll.theme?.accent || "#f3c928");
          setOptions(
            poll.options.map((option) => ({
              id: option.id,
              label: option.label,
              description: option.description || "",
              trigger: option.trigger,
              image: option.image || null,
            })),
          );
        })
        .catch((reason) => setError(message(reason)));
  }, [account, create, slug]);
  useEffect(() => {
    if (!account) return;
    setDiscoveryLoading(true);
    void getRumbleDiscovery().then((value) => {
      setDiscovery(value);
      if (create && !sourceScope && value.source && value.botState !== "offline") setSourceScope(value.source.scope);
    }).catch(() => setDiscovery(null)).finally(() => setDiscoveryLoading(false));
  }, [account, create]);
  useEffect(() => {
    if (!source || !discovery?.source) return;
    setCustomSource(source.rumbleSourceScope !== discovery.source.scope);
    if (source.livestreamMode === "exact") setStreamChoice(discovery.livestreams.some((item) => item.id === source.livestreamId) ? "detected" : "custom");
  }, [discovery, source]);
  const normalized = options.map((option) =>
    normalizePollTrigger(option.trigger),
  );
  const collisions = new Set(
    normalized.filter(
      (value, index) => value && normalized.indexOf(value) !== index,
    ),
  );
  const match = options.find(
    (option) => option.trigger && matchPollTrigger(option.trigger, testMessage),
  );
  const structuralLocked = source?.state === "open";
  const liveStreams = discovery?.livestreams.filter((item) => item.isLive) || [];
  const streamNeedsChoice = rumbleEnabled && streamChoice === "automatic" && liveStreams.length > 1;
  const sourceInvalid = rumbleEnabled && !/^(?:user|channel):[A-Za-z0-9_-]{1,180}$/.test(sourceScope);
  const payload = () => ({
    title,
    description,
    webVotingMode,
    rumbleEnabled,
    rumbleSourceScope: sourceScope,
    livestreamMode,
    livestreamId,
    requestedIntervalSeconds: 15,
    revision: source?.revision,
    theme: { accent: themeAccent, layout: "bars" },
    options: options.map((option) => ({ id: option.id, label: option.label, description: option.description, trigger: option.trigger })),
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!csrfToken || collisions.size || sourceInvalid || streamNeedsChoice) { if (streamNeedsChoice) setError("Several live streams are detected. Choose the stream this Poll should use."); return; }
    setBusy(true);
    setSaveStage("saving");
    setError("");
    try {
      const creatingDraft = create && !source;
      const result = creatingDraft
        ? await createPoll(payload(), csrfToken)
        : await savePoll(source?.slug || slug, payload(), csrfToken);
      setSource(result.poll);
      setOptions((current) => current.map((item, index) => ({ ...item, id: result.poll.options[index]?.id || item.id })));
      if (bannerFile || options.some((item) => item.imageFile)) setSaveStage("uploading");
      if (bannerFile) await uploadPollMedia(result.poll.slug, "banner", bannerFile, csrfToken);
      for (let index = 0; index < options.length; index += 1) if (options[index].imageFile && result.poll.options[index]) await uploadPollMedia(result.poll.slug, "option", options[index].imageFile as File, csrfToken, result.poll.options[index].id);
      const finalPoll = bannerFile || options.some((item) => item.imageFile) ? (await getPoll(result.poll.slug)).poll : result.poll;
      releaseAllPreviews(); setSource(finalPoll); setBannerFile(null); setBannerPreview(""); setMediaWarnings([]);
      setOptions(finalPoll.options.map((option) => ({ id: option.id, label: option.label, description: option.description || "", trigger: option.trigger, image: option.image || null })));
      setNotice(
        creatingDraft ? "Draft created." : "Draft saved at the latest revision.",
      );
      if (create) navigate(`/polls/${finalPoll.slug}/edit`, { replace: true });
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaveStage("");
      setBusy(false);
    }
  };
  const removeBanner = async () => {
    if (bannerFile) { releasePreview(bannerPreview); setBannerFile(null); setBannerPreview(""); return; }
    if (!source || !csrfToken) return; setBusy(true); try { await removePollMedia(source.slug, "banner", csrfToken); setSource((await getPoll(source.slug)).poll); setNotice("Poll cover removed. The generated fallback is active."); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  const removeOptionImage = async (index: number) => {
    const option = options[index]; if (option.imageFile) { releasePreview(option.imagePreview); setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, imageFile: null, imagePreview: "" } : item)); return; }
    if (!source || !csrfToken || !option.id) return; setBusy(true); try { await removePollMedia(source.slug, "option", csrfToken, option.id); const poll = (await getPoll(source.slug)).poll; setSource(poll); setOptions(poll.options.map((item) => ({ id: item.id, label: item.label, description: item.description || "", trigger: item.trigger, image: item.image || null }))); setNotice("Option image removed."); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  const previewPoll: Poll = {
    id: source?.id || "preview", slug: source?.slug || "preview", title: title || "Your Poll title", description: description || "A polished audience choice, ready for the live signal.", state: source?.state || "draft", public: source?.public || false,
    webVotingMode, rumbleEnabled, rumbleSourceScope: sourceScope || null, livestreamMode, livestreamId: livestreamId || null, revision: source?.revision || 1, totalVotes: source?.totalVotes || 0,
    options: options.map((option, index) => ({ id: option.id || `preview-${index}`, position: index, label: option.label || `Option ${index + 1}`, description: option.description || null, trigger: option.trigger, normalizedTrigger: normalizePollTrigger(option.trigger), votes: source?.options[index]?.votes || 0, image: option.imagePreview ? { id: `preview-image-${index}`, purpose: "option", optionId: option.id, url: option.imagePreview, contentType: option.imageFile?.type || "image/png", byteSize: option.imageFile?.size || 0, width: 1, height: 1, createdAt: new Date().toISOString() } : option.image || null })),
    owner: source?.owner || { id: account?.id || "creator", displayName: account?.displayName || "Poll creator", avatarUrl: account?.avatarUrl || null }, theme: { accent: themeAccent, layout: "bars" },
    media: { banner: bannerPreview ? { id: "preview-banner", purpose: "banner", url: bannerPreview, contentType: bannerFile?.type || "image/png", byteSize: bannerFile?.size || 0, width: 1, height: 1, createdAt: new Date().toISOString() } : source?.media?.banner || null },
    updatedAt: source?.updatedAt || new Date().toISOString(), openedAt: source?.openedAt || null, closedAt: source?.closedAt || null,
  };
  const lifecycle = async (
    action: "open" | "close" | "archive" | "restore",
  ) => {
    if (!source || !csrfToken) return;
    setBusy(true);
    try {
      const result = await lifecyclePoll(
        source.slug,
        source.revision,
        action,
        csrfToken,
      );
      setSource(result.poll);
      setNotice(
        `Poll ${action === "open" ? "opened" : action === "close" ? "closed" : action === "archive" ? "archived" : "restored to draft"}.`,
      );
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  };
  if (authLoading) return <State title="Loading creator access…" />;
  if (!account)
    return (
      <State
        title="Sign in required"
        copy="Approved Third Railify accounts can create and manage Polls."
        action={
          <button
            className="button button--primary"
            onClick={() => openAuth("signin")}
          >
            Log in
          </button>
        }
      />
    );
  if (create && !canCreate)
    return (
      <State
        title="Creator approval required"
        copy="Your account may vote, but Poll creation remains disabled until Admin grants creator access."
      />
    );
  return (
    <form className="poll-editor" onSubmit={save}>
      <header className="container">
        <div>
          <p className="eyebrow">APPROVED POLL CREATOR</p>
          <h1>
            {create ? "Build a live Poll" : `Edit ${source?.title || "Poll"}`}
          </h1>
          <p>
            Whole-message exact triggers, versioned drafts, and server-owned
            results.
          </p>
        </div>
        <div>
          <Link
            className="button button--ghost"
            to={source ? `/polls/${source.slug}` : "/polls"}
          >
            Exit
          </Link>
          <button
            className="button button--primary"
            disabled={busy || Boolean(collisions.size)}
          >
            {saveStage === "uploading" ? "Uploading images…" : busy ? "Saving…" : "Save draft"}
          </button>
        </div>
      </header>
      <EphemeralNotices notice={notice} error={error} noticeTitle="Poll draft updated" errorTitle="Poll could not be updated" onDismissNotice={() => setNotice("")} onDismissError={() => setError("")} />
      {mediaWarnings.length ? <div className="container poll-media-warning" role="alert"><strong>Some saved Poll media could not be displayed.</strong><span>{mediaWarnings.join(" ")} Re-upload or remove the affected image.</span></div> : null}
      <div className="container poll-editor__layout">
        <div>
          <section className="poll-editor-panel">
            <p className="eyebrow">01 · POLL IDENTITY</p>
            <label>
              <span>Title</span>
              <input
                required
                minLength={1}
                maxLength={140}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows={5}
                maxLength={2000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </section>
          <section className="poll-editor-panel">
            <p className="eyebrow">02 · OPTIONS</p>
            <p>
              Leading and trailing spaces and letter case are ignored. The
              entire chat message must equal the trigger.
            </p>
            <div className="poll-editor-options">
              {options.map((option, index) => (
                <article key={option.id || index}>
                  <span>{index + 1}</span>
                  <label>
                    <b>Option</b>
                    <input
                      value={option.label}
                      maxLength={160}
                      disabled={structuralLocked}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    <b>Chat trigger</b>
                    <input
                      value={option.trigger}
                      maxLength={64}
                      disabled={structuralLocked}
                      className={
                        collisions.has(normalizePollTrigger(option.trigger))
                          ? "is-invalid"
                          : ""
                      }
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, trigger: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="poll-editor-option__description">
                    <b>Short description</b>
                    <input value={option.description} maxLength={240} disabled={structuralLocked} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} />
                  </label>
                  <div className="poll-editor-option__media">
                    {option.imagePreview || option.image ? <ResilientImage src={option.imagePreview || option.image?.url || ""} alt={`${option.label} preview`} onFailure={() => setMediaWarnings((current) => current.includes(`Option ${index + 1} image is unavailable.`) ? current : [...current, `Option ${index + 1} image is unavailable.`])} /> : <span>IMAGE OPTIONAL</span>}
                    <label><b>1:1 image</b><input key={option.imagePreview || option.image?.id || `option-${index}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0] || null; releasePreview(option.imagePreview); setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, imageFile: file, imagePreview: file ? createPreview(file) : "" } : item)); }} /></label>
                    {option.imagePreview || option.image ? <button type="button" onClick={() => void removeOptionImage(index)}>Remove image</button> : null}
                  </div>
                  <div className="poll-editor-option__order" aria-label={`Reorder ${option.label}`}>
                    <button
                      type="button"
                      aria-label={`Move ${option.label} up`}
                      disabled={structuralLocked || index === 0}
                      onClick={() => setOptions((current) => moveOption(current, index, index - 1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${option.label} down`}
                      disabled={structuralLocked || index === options.length - 1}
                      onClick={() => setOptions((current) => moveOption(current, index, index + 1))}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    className="poll-editor-option__remove"
                    type="button"
                    disabled={structuralLocked || options.length <= 2}
                    onClick={() =>
                      setOptions((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
            <button
              type="button"
              disabled={structuralLocked || options.length >= 12}
              onClick={() =>
                setOptions((current) => [
                  ...current,
                  {
                    label: `Option ${current.length + 1}`,
                    description: "",
                    trigger: String(current.length + 1),
                  },
                ])
              }
            >
              Add option
            </button>
            {structuralLocked ? (
              <p className="poll-lock">
                Close the Poll before deleting, reordering, or changing
                triggers.
              </p>
            ) : null}
            {collisions.size ? (
              <p className="poll-error">
                Two triggers normalize to the same complete message.
              </p>
            ) : null}
          </section>
          <section className="poll-editor-panel">
            <p className="eyebrow">03 · VOTING ACCESS</p>
            <label><span>Web voting</span><select value={webVotingMode} onChange={(event) => setWebVotingMode(event.target.value as "anyone" | "signed_in")}><option value="anyone">Anyone — anonymous cookie or account</option><option value="signed_in">Signed-in accounts only</option></select></label>
          </section>
          <section className="poll-editor-panel poll-rumble-config">
            <p className="eyebrow">04 · RUMBLE AUTOMATION</p>
            <label className="poll-toggle"><input type="checkbox" checked={rumbleEnabled} onChange={(event) => setRumbleEnabled(event.target.checked)} /><span>Enable exact-chat voting when this Poll opens</span></label>
            {rumbleEnabled ? <>
              <div className={`poll-discovery-state poll-discovery-state--${discovery?.botState || "offline"}`}><strong>{discoveryLoading ? "Detecting Rumble source…" : discovery?.source && discovery.botState !== "offline" ? "Bot discovery connected" : "Rumble source discovery temporarily unavailable."}</strong><span>{discovery?.freshness ? `${discovery.botState} · heartbeat ${discovery.freshness.ageSeconds}s ago` : "Disable automation or use the advanced source field."}</span></div>
              {!customSource && discovery?.source ? <label><span>Rumble source</span><select value={sourceScope} onChange={(event) => setSourceScope(event.target.value)}><option value={discovery.source.scope}>{discovery.source.displayName}</option>{sourceScope !== discovery.source.scope ? <option value={sourceScope}>{sourceScope.replace(/^(?:user|channel):/, "Saved source · ")}</option> : null}</select><small>Detected from Third Railify Bot · {discovery.source.type} source</small></label> : null}
              {!customSource && !discovery?.source && sourceScope ? <div className="poll-saved-source"><strong>Saved Rumble source</strong><span>{sourceScope.replace(/^(user|channel):/, "$1 source · ")}</span></div> : null}
              <button className="poll-advanced-toggle" type="button" onClick={() => setCustomSource((value) => !value)}>{customSource ? "Use detected source" : "Advanced / Custom source"}</button>
              {customSource ? <label><span>Canonical source scope</span><input value={sourceScope} onChange={(event) => setSourceScope(event.target.value.trim())} placeholder="user:id or channel:id" className={sourceInvalid ? "is-invalid" : ""} /><small>Advanced only. The provider response timestamp is not a source ID.</small></label> : null}
              <fieldset className="poll-stream-choices"><legend>Live stream</legend>
                <label><input type="radio" name="stream-choice" checked={streamChoice === "automatic"} onChange={() => { setStreamChoice("automatic"); setLivestreamMode("automatic"); setLivestreamId(""); }} /><span><strong>Automatically use the current live stream</strong><small>The bot attaches this Poll when exactly one Rumble stream is active.</small></span></label>
                {streamChoice === "automatic" ? <div className="poll-stream-current">{liveStreams.length === 1 ? <><b>LIVE</b><strong>{liveStreams[0].title}</strong><span>{liveStreams[0].watchingNow ?? 0} watching now</span></> : liveStreams.length === 0 ? <span>No live stream currently detected</span> : <strong>Multiple live streams detected — choose one below.</strong>}</div> : null}
                <label><input type="radio" name="stream-choice" checked={streamChoice === "detected"} disabled={!discovery?.livestreams.length} onChange={() => { setStreamChoice("detected"); setLivestreamMode("exact"); setLivestreamId(liveStreams.length === 1 ? liveStreams[0].id : ""); }} /><span><strong>Choose a detected stream</strong><small>Select by title; the safe provider ID stays technical metadata.</small></span></label>
                {streamChoice === "detected" ? <label className="poll-stream-select"><span>Detected stream</span><select required value={livestreamId} onChange={(event) => setLivestreamId(event.target.value)}><option value="">Choose a stream</option>{discovery?.livestreams.map((stream) => <option key={stream.id} value={stream.id}>{stream.isLive ? "LIVE · " : ""}{stream.title}</option>)}</select>{livestreamId ? <small>Stream reference: {livestreamId}</small> : null}</label> : null}
                <label><input type="radio" name="stream-choice" checked={streamChoice === "custom"} onChange={() => { setStreamChoice("custom"); setLivestreamMode("exact"); }} /><span><strong>Advanced / custom stream reference</strong><small>Use only when the bot cannot detect a known stream.</small></span></label>
                {streamChoice === "custom" ? <label className="poll-stream-select"><span>Livestream reference</span><input required value={livestreamId} onChange={(event) => setLivestreamId(event.target.value.trim())} /></label> : null}
              </fieldset>
            </> : null}
          </section>
          <section className="poll-editor-panel poll-appearance">
            <p className="eyebrow">05 · APPEARANCE</p>
            <div className="poll-cover-editor"><div>{bannerPreview || source?.media?.banner ? <ResilientImage src={bannerPreview || source?.media?.banner?.url || ""} alt="Poll cover preview" onFailure={() => setMediaWarnings((current) => current.includes("Poll cover is unavailable.") ? current : [...current, "Poll cover is unavailable."])} /> : <PollCover poll={previewPoll} compact />}</div><label><span>Poll cover</span><input key={bannerPreview || source?.media?.banner?.id || "banner"} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0] || null; releasePreview(bannerPreview); setBannerFile(file); setBannerPreview(file ? createPreview(file) : ""); }} /></label>{bannerPreview || source?.media?.banner ? <button type="button" onClick={() => void removeBanner()}>Remove cover</button> : <small>Generated electric artwork is used when no image is set.</small>}</div>
            <fieldset className="poll-tint-picker"><legend>Feature tint</legend>{[["Gold","#f3c928"],["Violet","#8f6cff"],["Magenta","#ed4da9"],["Electric blue","#36a9ff"],["Red","#e34b5f"]].map(([label, value]) => <button key={value} type="button" className={themeAccent === value ? "is-selected" : ""} style={{ "--swatch": value } as React.CSSProperties} onClick={() => { setThemeAccent(value); setCustomTint(false); }}><i />{label}</button>)}<button type="button" className={customTint ? "is-selected" : ""} onClick={() => setCustomTint(true)}><i className="is-custom" />Custom</button></fieldset>
            {customTint ? <label><span>Custom six-digit hex</span><input type="text" pattern="#[0-9A-Fa-f]{6}" value={themeAccent} onChange={(event) => setThemeAccent(event.target.value)} /></label> : null}
          </section>
        </div>
        <aside>
          <section className="poll-editor-panel poll-live-preview">
            <p className="eyebrow">LIVE CARD PREVIEW</p>
            <PollCard poll={previewPoll} onQuickView={() => undefined} preview />
          </section>
          <section className="poll-editor-panel trigger-tester">
            <p className="eyebrow">TRIGGER TESTER</p>
            <label>
              <span>Sample chat message</span>
              <input
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
                placeholder="Type the complete message"
              />
            </label>
            <div className={match ? "is-match" : ""}>
              <strong>
                {testMessage
                  ? match
                    ? `Matches ${match.label}`
                    : "No match"
                  : "Awaiting sample"}
              </strong>
              <span>
                {testMessage
                  ? `Normalized: ${normalizePollTrigger(testMessage) || "empty"}`
                  : "Exact, case-insensitive NFKC matching"}
              </span>
            </div>
          </section>
          {source ? (
            <section className="poll-editor-panel poll-lifecycle">
              <p className="eyebrow">06 · LIFECYCLE · {source.state}</p>
              {new Set(["draft", "closed"]).has(source.state) ? (
                <button
                  className="poll-lifecycle__primary"
                  type="button"
                  onClick={() => void lifecycle("open")}
                  disabled={busy}
                >
                  Open Poll
                </button>
              ) : null}
              {source.state === "open" ? (
                <button
                  className="poll-lifecycle__close"
                  type="button"
                  onClick={() => void lifecycle("close")}
                  disabled={busy}
                >
                  Close Poll
                </button>
              ) : null}
              {new Set(["draft", "closed"]).has(source.state) ? (
                <button
                  className="poll-lifecycle__archive"
                  type="button"
                  onClick={() => void lifecycle("archive")}
                  disabled={busy}
                >
                  Archive
                </button>
              ) : null}
              {source.state === "archived" ? (
                <button
                  className="poll-lifecycle__primary"
                  type="button"
                  onClick={() => void lifecycle("restore")}
                  disabled={busy}
                >
                  Restore draft
                </button>
              ) : null}
              {busy ? <small className="poll-lifecycle__reason">Finishing the current save or lifecycle command.</small> : null}
            </section>
          ) : <section className="poll-editor-panel poll-lifecycle"><p className="eyebrow">06 · LIFECYCLE</p><button className="poll-lifecycle__primary" type="button" disabled>Open Poll</button><small className="poll-lifecycle__reason">Save this draft before opening.</small></section>}
        </aside>
      </div>
    </form>
  );
}

function Status({ poll }: { poll: Poll }) {
  return (
    <span className={`poll-state poll-state--${poll.state}`}>{poll.state}</span>
  );
}
function State({
  title,
  copy,
  kind = "empty",
  action,
}: {
  title: string;
  copy?: string;
  kind?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`poll-page-state poll-page-state--${kind}`}>
      <span aria-hidden="true">⚡</span>
      <h2>{title}</h2>
      {copy ? <p>{copy}</p> : null}
      {action}
    </div>
  );
}
function message(value: unknown) {
  return value instanceof Error
    ? value.message
    : "The Poll service is unavailable.";
}
function moveOption(values: EditorOption[], from: number, to: number) {
  if (to < 0 || to >= values.length || from === to) return values;
  const next = [...values];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
function freshness(value: string) {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - Date.parse(value)) / 1000),
  );
  return seconds < 60
    ? `Updated ${seconds}s ago`
    : `Updated ${Math.round(seconds / 60)}m ago`;
}
function pollSeo(poll: Poll, popout: boolean): SeoDocument {
  const origin = window.location.origin;
  const canonicalUrl = `${origin}/polls/${poll.slug}`;
  return {
    key: `poll:${poll.id}:${popout ? "popout" : "detail"}`,
    title: `${poll.title} | Third Railify Poll`,
    description:
      poll.description || `Vote and view live results for ${poll.title}.`,
    robots:
      popout || !poll.public
        ? "noindex, follow, noarchive"
        : "index, follow, max-image-preview:large",
    canonicalUrl,
    imageUrl: `${origin}/social/shawn-gina-hero.webp`,
    imageAlt: "Third Railify live Poll",
    pageType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [{ "@type": "WebPage", name: poll.title, url: canonicalUrl }],
    },
  };
}
