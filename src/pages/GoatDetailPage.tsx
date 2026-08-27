import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowIcon } from "../components/Icons";
import { useAuth } from "../auth/AuthProvider";
import { deleteGoatComment, getGoatComments, getGoatListing, postGoatComment, reactToGoat } from "../goats/client";
import type { GoatComment, GoatListing, GoatMedia } from "../goats/types";

export function GoatDetailPage() {
  const { slug = "" } = useParams();
  const { account, csrfToken, openAuth } = useAuth();
  const [item, setItem] = useState<GoatListing | null>(null);
  const [comments, setComments] = useState<GoatComment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentPage, setCommentPage] = useState(1);
  const [commentSort, setCommentSort] = useState<"newest" | "oldest">("newest");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setSelected(0);
    Promise.all([getGoatListing(slug, controller.signal), getGoatComments(slug, commentSort, 1, controller.signal)])
      .then(([listing, commentPayload]) => { setItem(listing); setComments(commentPayload.items); setCommentsTotal(commentPayload.total); setCommentPage(1); document.title = `${listing.displayName} · GOATS in the Wild · Third Railify`; updateDescription(`${listing.displayName} in ${listing.location.label}, wearing ${listing.product.name}. ${listing.description}`); })
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "This listing is unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, commentSort]);

  const gallery = item ? [item.media.main, ...item.media.gallery].filter(Boolean) as GoatMedia[] : [];
  const current = gallery[selected] || null;
  const react = async (value: -1 | 1) => {
    if (!account || !csrfToken) { openAuth("signin"); return; }
    if (!item || reactionBusy) return;
    const previous = item; const priorReaction = Number(item.currentReaction || 0); const active = priorReaction === value ? 0 : value;
    setItem({ ...item, currentReaction: active, counts: { ...item.counts, likes: Math.max(0, item.counts.likes - (priorReaction === 1 ? 1 : 0) + (active === 1 ? 1 : 0)), dislikes: Math.max(0, item.counts.dislikes - (priorReaction === -1 ? 1 : 0) + (active === -1 ? 1 : 0)) } });
    setReactionBusy(true);
    try { const next = await reactToGoat(item.slug, value, csrfToken); setItem((entry) => entry ? { ...entry, currentReaction: next.currentReaction, counts: { ...entry.counts, likes: next.likes, dislikes: next.dislikes } } : entry); }
    catch { setItem(previous); }
    finally { setReactionBusy(false); }
  };
  const submitComment = async (event: FormEvent) => {
    event.preventDefault(); setCommentError("");
    if (!account || !csrfToken) { openAuth("signin"); return; }
    try { const result = await postGoatComment(slug, comment, csrfToken); setComments((currentComments) => commentSort === "newest" ? [result.item, ...currentComments] : [...currentComments, result.item]); setCommentsTotal((total) => total + 1); setComment(""); setItem((entry) => entry ? { ...entry, counts: { ...entry.counts, comments: entry.counts.comments + 1 } } : entry); }
    catch (reason) { setCommentError(reason instanceof Error ? reason.message : "The comment could not be posted."); }
  };
  const removeComment = async (id: string) => { if (!csrfToken) return; try { await deleteGoatComment(id, csrfToken); setComments((currentComments) => currentComments.filter((entry) => entry.id !== id)); setCommentsTotal((total) => Math.max(0, total - 1)); setItem((entry) => entry ? { ...entry, counts: { ...entry.counts, comments: Math.max(0, entry.counts.comments - 1) } } : entry); } catch (reason) { setCommentError(reason instanceof Error ? reason.message : "The comment could not be deleted."); } };
  const loadMoreComments = async () => { if (commentsLoading || comments.length >= commentsTotal) return; setCommentsLoading(true); setCommentError(""); try { const next = await getGoatComments(slug, commentSort, commentPage + 1); setComments((current) => [...current, ...next.items]); setCommentPage(next.page); setCommentsTotal(next.total); } catch (reason) { setCommentError(reason instanceof Error ? reason.message : "More comments could not be loaded."); } finally { setCommentsLoading(false); } };

  if (loading) return <main className="container goat-detail-loading" aria-busy="true"><p className="eyebrow">GOATS in the Wild</p><h1>Acquiring the approved signal…</h1></main>;
  if (error || !item) return <main className="container goat-detail-loading"><p className="eyebrow">Listing unavailable</p><h1>This GOAT is not on the public rail.</h1><p>{error || "Pending, rejected, hidden, and unknown slugs are not published."}</p><Link className="button button--primary" to="/goats">Return to GOATS</Link></main>;

  return <main className="goat-detail">
    <div className="container goat-detail__crumbs"><Link to="/goats">GOATS in the Wild</Link><span>/</span><strong>{item.displayName}</strong></div>
    <section className="container goat-detail__hero"><div className="goat-detail__media">{current ? <button type="button" className="goat-detail__stage" onClick={() => setLightbox(true)} aria-label="Open enlarged image"> <img src={current.url} alt={`${item.displayName} wearing ${item.product.name}`} width="1100" height="900" /></button> : <div className="goat-media-fallback">TR / GOAT</div>}{gallery.length > 1 ? <div className="goat-detail__thumbs" aria-label="Gallery images">{gallery.map((media, index) => <button type="button" key={media.id} className={selected === index ? "is-active" : ""} onClick={() => setSelected(index)} aria-label={`Show image ${index + 1}`}><img src={media.url} alt="" width="120" height="100" /></button>)}</div> : null}</div>
      <div className="goat-detail__copy"><p className="eyebrow">Approved community dispatch</p><div className="goat-detail__identity">{item.media.profile ? <img src={item.media.profile.url} alt="" width="76" height="76" /> : null}<div><h1>{item.displayName}</h1><p>{item.location.label}</p></div></div><p className="goat-detail__date">Published {formatDate(item.publishedAt)}</p>{item.rating ? <div className="goat-rating goat-rating--large" aria-label={`${item.rating} out of 5 stars`}>{"★".repeat(item.rating)}<span>{"★".repeat(5 - item.rating)}</span></div> : null}<blockquote>{item.description}</blockquote><Link className="goat-detail__product" to={`/products/all/${item.product.slug}`}><span>Seen wearing</span><strong>{item.product.name}</strong><ArrowIcon /></Link>
        <div className="goat-reactions" aria-label="Community reactions"><button type="button" aria-pressed={item.currentReaction === 1} disabled={reactionBusy} onClick={() => void react(1)}>↑ <strong>{item.counts.likes}</strong><span>Like</span></button><button type="button" aria-pressed={item.currentReaction === -1} disabled={reactionBusy} onClick={() => void react(-1)}>↓ <strong>{item.counts.dislikes}</strong><span>Dislike</span></button></div>
        <div className="button-row"><button type="button" className="button button--secondary" onClick={() => void share(item)}>Copy link</button><Link className="button button--primary" to="/goats/submit">Submit another GOAT</Link></div>
      </div></section>
    <nav className="container goat-neighbours" aria-label="Approved GOAT navigation"><span>{item.neighbours?.previous ? <Link to={`/goats/${item.neighbours.previous.slug}`}>← {item.neighbours.previous.displayName}</Link> : "Start of the approved rail"}</span><Link to="/goats">All GOATS</Link><span>{item.neighbours?.next ? <Link to={`/goats/${item.neighbours.next.slug}`}>{item.neighbours.next.displayName} →</Link> : "End of the approved rail"}</span></nav>
    <section className="container goat-comments" aria-labelledby="goat-comments-title"><header><div><p className="eyebrow">Authenticated community</p><h2 id="goat-comments-title">Comments <span>{item.counts.comments}</span></h2></div><div><p>Plain text only. Email addresses are never shown.</p><label className="goat-comment-sort">Order<select value={commentSort} onChange={(event) => setCommentSort(event.target.value === "oldest" ? "oldest" : "newest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div></header>
      <form onSubmit={(event) => void submitComment(event)}><label htmlFor="goat-comment">Add a comment</label><textarea id="goat-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1200} rows={4} placeholder={account ? "Join the conversation…" : "Sign in to comment"} disabled={!account} /><div><span>{comment.length} / 1200</span>{account ? <button type="submit" className="button button--primary" disabled={!comment.trim()}>Post comment</button> : <button type="button" className="button button--primary" onClick={() => openAuth("signin")}>Sign in to comment</button>}</div>{commentError ? <p role="alert">{commentError}</p> : null}</form>
      {comments.length ? <><ol>{comments.map((entry) => <li key={entry.id}>{entry.avatarUrl ? <img src={entry.avatarUrl} alt="" width="44" height="44" /> : <span aria-hidden="true">TR</span>}<div><header><strong>{entry.displayName}</strong><span><time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>{entry.isOwn ? <button type="button" onClick={() => void removeComment(entry.id)}>Delete</button> : null}</span></header><p>{entry.body}</p></div></li>)}</ol>{comments.length < commentsTotal ? <button type="button" className="button button--secondary goat-comments__more" onClick={() => void loadMoreComments()} disabled={commentsLoading}>{commentsLoading ? "Loading…" : `Load more comments (${commentsTotal - comments.length})`}</button> : null}</> : <div className="goats-empty"><span>00</span><div><strong>No approved comments yet.</strong><p>Sign in to start the conversation.</p></div></div>}
    </section>
    {lightbox && current ? <Lightbox media={current} label={`${item.displayName} wearing ${item.product.name}`} onClose={() => setLightbox(false)} onPrevious={gallery.length > 1 ? () => setSelected((selected - 1 + gallery.length) % gallery.length) : undefined} onNext={gallery.length > 1 ? () => setSelected((selected + 1) % gallery.length) : undefined} /> : null}
  </main>;
}

function Lightbox({ media, label, onClose, onPrevious, onNext }: { media: GoatMedia; label: string; onClose: () => void; onPrevious?: () => void; onNext?: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; close.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "ArrowLeft") onPrevious?.(); if (event.key === "ArrowRight") onNext?.(); if (event.key === "Tab") { const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled])") || []); if (!controls.length) return; const first = controls[0]; const last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }; document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); previous?.focus(); }; }, [onClose, onNext, onPrevious]);
  return <div ref={dialog} className="goat-lightbox" role="dialog" aria-modal="true" aria-label="Enlarged GOAT image"><button ref={close} type="button" className="goat-lightbox__close" onClick={onClose}>Close</button>{onPrevious ? <button type="button" className="goat-lightbox__previous" onClick={onPrevious} aria-label="Previous image">←</button> : null}<img src={media.url} alt={label} />{onNext ? <button type="button" className="goat-lightbox__next" onClick={onNext} aria-label="Next image">→</button> : null}</div>;
}

async function share(item: GoatListing) { try { await navigator.clipboard.writeText(window.location.href); } catch { window.prompt(`Copy the link to ${item.displayName}`, window.location.href); } }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date); }
function updateDescription(value: string) { let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]'); if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.append(meta); } meta.content = value.slice(0, 155); }
