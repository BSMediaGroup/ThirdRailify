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
  lifecyclePoll,
  listPolls,
  savePoll,
  votePoll,
  type PollError,
} from "../polls/client";
import { matchPollTrigger, normalizePollTrigger } from "../polls/normalization";
import type { Poll } from "../polls/types";
import { useCoordinatedPollRefresh } from "../polls/live";
import { usePageSeo } from "../seo/SeoProvider";
import type { SeoDocument } from "../../seo/site-seo.js";
import "../styles/polls.css";

export function PollsPage() {
  const { account, openAuth } = useAuth();
  const [view, setView] = useState("open");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Poll[]>([]);
  const [selected, setSelected] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canCreate, setCanCreate] = useState(false);
  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const [payload, access] = await Promise.all([
          listPolls(view, search),
          account
            ? getCreatorAccess().catch(() => null)
            : Promise.resolve(null),
        ]);
        setItems(payload.items);
        setCanCreate(Boolean(access?.canCreate));
        setError("");
        setSelected((current) =>
          current
            ? payload.items.find((item) => item.id === current.id) || current
            : null,
        );
      } catch (reason) {
        setError(message(reason));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [account, search, view],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useCoordinatedPollRefresh(
    useCallback(() => {
      if (items.some((item) => item.state === "open")) void load(true);
    }, [items, load]),
    items.some((item) => item.state === "open"),
  );
  return (
    <div className="polls-page">
      <section className="polls-hero">
        <div className="container">
          <p className="eyebrow">THIRD RAILIFY LIVE CHOICE</p>
          <h1>
            READ THE <em>ROOM.</em>
          </h1>
          <p>
            Audience Polls built for the web and the live Rumble signal, with
            one authoritative current vote per source and visible result
            freshness.
          </p>
          <div>
            {canCreate ? (
              <Link className="button button--primary" to="/polls/new">
                Create a Poll
              </Link>
            ) : account ? (
              <span>Creator access is granted by Admin.</span>
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
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="recent">Recent</option>
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
        {error ? (
          <State
            kind="error"
            title="Polls temporarily unavailable"
            copy={error}
          />
        ) : loading ? (
          <State title="Tuning the Poll signal…" />
        ) : !items.length ? (
          <State
            title={view === "open" ? "No open Polls" : "No Polls found"}
            copy="That is an authoritative empty state—not a loading failure."
          />
        ) : (
          <div className="poll-card-grid">
            {items.map((poll) => (
              <PollCard key={poll.id} poll={poll} onQuickView={setSelected} />
            ))}
          </div>
        )}
      </section>
      {selected ? (
        <PollQuickView
          poll={selected}
          account={account}
          openAuth={openAuth}
          onClose={() => setSelected(null)}
          onChanged={(poll) => {
            setSelected(poll);
            setItems((current) =>
              current.map((item) => (item.id === poll.id ? poll : item)),
            );
          }}
        />
      ) : null}
    </div>
  );
}

function PollCard({
  poll,
  onQuickView,
}: {
  poll: Poll;
  onQuickView: (poll: Poll) => void;
}) {
  const leading = [...poll.options].sort((a, b) => b.votes - a.votes)[0];
  return (
    <article className={`poll-card poll-card--${poll.state}`}>
      <button
        className="poll-card__quick"
        type="button"
        onClick={() => onQuickView(poll)}
        aria-label={`Quick view ${poll.title}`}
      />
      <div className="poll-card__signal">
        <Status poll={poll} />
        <span>{poll.rumbleEnabled ? "Rumble + Web" : "Web"}</span>
      </div>
      <div>
        <p className="eyebrow">
          {poll.webVotingMode === "anyone"
            ? "OPEN AUDIENCE"
            : "SIGNED-IN AUDIENCE"}
        </p>
        <h3>{poll.title}</h3>
        <p>{poll.description || "A Third Railify audience Poll."}</p>
      </div>
      <div className="poll-card__result">
        <span
          style={{
            width: `${poll.totalVotes && leading ? Math.round((leading.votes / poll.totalVotes) * 100) : 0}%`,
          }}
        />
        <strong>{leading ? leading.label : "Awaiting first vote"}</strong>
        <b>
          {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
        </b>
      </div>
      <footer>
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
      </footer>
    </article>
  );
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
        <header>
          <div>
            <Status poll={poll} />
            <h2 id="poll-quick-title">{poll.title}</h2>
            <p>By {poll.owner.displayName}</p>
          </div>
          <button ref={close} type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <ResultOptions poll={poll} busy={busy} vote={vote} />
        {notice ? (
          <p className="poll-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="poll-error" role="alert">
            {error}
          </p>
        ) : null}
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
  const [access, setAccess] = useState({ canManage: false });
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
  if (loading) return <State title="Loading Poll…" />;
  if (!poll)
    return <State kind="error" title="Poll unavailable" copy={error} />;
  return (
    <div className={popout ? "poll-popout" : "poll-detail-page"}>
      <section className="poll-stage">
        <header>
          <div>
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
            </div>
          </div>
          {!popout ? (
            <div className="poll-stage__actions">
              {access.canManage ? (
                <Link
                  className="button button--secondary"
                  to={`/polls/${poll.slug}/edit`}
                >
                  Edit Poll
                </Link>
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
        </header>
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
        {notice ? (
          <p className="poll-notice" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="poll-error" role="alert">
            {error}
          </p>
        ) : null}
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
  return (
    <div className="poll-options">
      {poll.options.map((option) => {
        const percentage = poll.totalVotes
          ? (option.votes / poll.totalVotes) * 100
          : 0;
        const current = poll.currentVoteOptionId === option.id;
        return (
          <article key={option.id} className={current ? "is-current" : ""}>
            <div
              className="poll-option__bar"
              style={
                {
                  "--poll-result": `${percentage}%`,
                  "--poll-accent": poll.theme?.accent || "#f3c928",
                } as React.CSSProperties
              }
            />
            <div>
              <span>{String(option.position + 1).padStart(2, "0")}</span>
              <strong>{option.label}</strong>
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

type EditorOption = {
  id?: string;
  label: string;
  description: string;
  trigger: string;
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
  const [livestreamMode, setLivestreamMode] = useState<"automatic" | "exact">(
    "automatic",
  );
  const [livestreamId, setLivestreamId] = useState("");
  const [options, setOptions] = useState<EditorOption[]>([
    { label: "Option one", description: "", trigger: "1" },
    { label: "Option two", description: "", trigger: "2" },
  ]);
  const [testMessage, setTestMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
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
          setOptions(
            poll.options.map((option) => ({
              id: option.id,
              label: option.label,
              description: option.description || "",
              trigger: option.trigger,
            })),
          );
        })
        .catch((reason) => setError(message(reason)));
  }, [account, create, slug]);
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
    options: options.map((option) => ({ ...option })),
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!csrfToken || collisions.size) return;
    setBusy(true);
    setError("");
    try {
      const result = create
        ? await createPoll(payload(), csrfToken)
        : await savePoll(slug, payload(), csrfToken);
      setSource(result.poll);
      setNotice(
        create ? "Draft created." : "Draft saved at the latest revision.",
      );
      if (create)
        navigate(`/polls/${result.poll.slug}/edit`, { replace: true });
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
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
            {busy ? "Saving…" : "Save draft"}
          </button>
        </div>
      </header>
      {error ? (
        <p className="container poll-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="container poll-notice" role="status">
          {notice}
        </p>
      ) : null}
      <div className="container poll-editor__layout">
        <div>
          <section className="poll-editor-panel">
            <p className="eyebrow">01 · IDENTITY</p>
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
            <label>
              <span>Web voting</span>
              <select
                value={webVotingMode}
                onChange={(event) =>
                  setWebVotingMode(event.target.value as "anyone" | "signed_in")
                }
              >
                <option value="anyone">
                  Anyone — signed anonymous cookie or account
                </option>
                <option value="signed_in">Signed-in accounts only</option>
              </select>
            </label>
          </section>
          <section className="poll-editor-panel">
            <p className="eyebrow">02 · OPTIONS + EXACT TRIGGERS</p>
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
            <p className="eyebrow">03 · RUMBLE VOTING</p>
            <label className="poll-toggle">
              <input
                type="checkbox"
                checked={rumbleEnabled}
                onChange={(event) => setRumbleEnabled(event.target.checked)}
              />
              <span>Enable exact-chat voting when this Poll opens</span>
            </label>
            {rumbleEnabled ? (
              <>
                <label>
                  <span>Source scope</span>
                  <input
                    value={sourceScope}
                    onChange={(event) => setSourceScope(event.target.value)}
                    placeholder="user:12345 or channel:12345"
                  />
                </label>
                <label>
                  <span>Livestream selection</span>
                  <select
                    value={livestreamMode}
                    onChange={(event) =>
                      setLivestreamMode(
                        event.target.value as "automatic" | "exact",
                      )
                    }
                  >
                    <option value="automatic">
                      Exactly one current live stream
                    </option>
                    <option value="exact">Exact live stream ID</option>
                  </select>
                </label>
                {livestreamMode === "exact" ? (
                  <label>
                    <span>Livestream ID</span>
                    <input
                      value={livestreamId}
                      onChange={(event) => setLivestreamId(event.target.value)}
                    />
                  </label>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
        <aside>
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
              <p className="eyebrow">LIFECYCLE · {source.state}</p>
              {new Set(["draft", "closed"]).has(source.state) ? (
                <button
                  type="button"
                  onClick={() => void lifecycle("open")}
                  disabled={busy}
                >
                  Open Poll
                </button>
              ) : null}
              {source.state === "open" ? (
                <button
                  type="button"
                  onClick={() => void lifecycle("close")}
                  disabled={busy}
                >
                  Close Poll
                </button>
              ) : null}
              {new Set(["draft", "closed"]).has(source.state) ? (
                <button
                  type="button"
                  onClick={() => void lifecycle("archive")}
                  disabled={busy}
                >
                  Archive
                </button>
              ) : null}
              {source.state === "archived" ? (
                <button
                  type="button"
                  onClick={() => void lifecycle("restore")}
                  disabled={busy}
                >
                  Restore draft
                </button>
              ) : null}
            </section>
          ) : null}
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
