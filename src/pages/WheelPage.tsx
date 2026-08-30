import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { wheelSeo } from "../../seo/site-seo.js";
import { BackIcon, CloseIcon, EditIcon, FullscreenIcon, OfficialIcon, PaletteIcon, PracticeIcon, ShareIcon, SoundIcon } from "../components/Icons";
import { useAuth } from "../auth/AuthProvider";
import { getCreatorAccess, getWheel, listWheels, officialSpin, prefetchWheel, winnerAction } from "../wheels/client";
import { formatProbability, participantOdds, selectWeightedEntry, spinPlan } from "../wheels/engine.mjs";
import { wheelGalleryNeighbours, wheelNavigationDirection } from "../wheels/navigation.mjs";
import type { Wheel, WheelAccess, WheelEntry, WheelSummary } from "../wheels/types";
import { AppearanceDialog } from "../wheels/AppearanceDialog";
import { WheelCanvas } from "../wheels/WheelCanvas";
import { WinnerCelebration } from "../wheels/WinnerCelebration";
import { resolvedEntryStyle } from "../wheels/segmentStyles.mjs";
import { spinSoundProfile, winnerSoundProfile } from "../wheels/soundPresets.mjs";
import { WheelEditorDialog, type WheelEditorDraft } from "../wheels/WheelEditorDialog";
import { ParticipantManagerDialog } from "../wheels/ParticipantManagerDialog";
import { ParticipantDetails } from "../wheels/ParticipantDetails";
import { WheelsBrandMark } from "../wheels/WheelsBrandMark";
import { usePageSeo } from "../seo/SeoProvider";
import "../styles/wheels.css";
import "../styles/wheels-stage.css";

type LoadedWheel = { ok?: true; wheel: Wheel; access: WheelAccess };
type WheelDirection = "next" | "previous";
type WheelSceneTransition = { outgoing: LoadedWheel; incoming: LoadedWheel; direction: WheelDirection };

export function WheelPage({ presentation = false, editorRequested = false }: { presentation?: boolean; editorRequested?: boolean }) {
  const { slug = "" } = useParams();
  const location = useLocation(); const navigate = useNavigate(); const [searchParams] = useSearchParams();
  const { account, csrfToken, openAuth } = useAuth(); const audio = useWheelAudio();
  const [activePayload, setActivePayload] = useState<LoadedWheel | null>(null); const activeRef = useRef<LoadedWheel | null>(null); const [canCreateStage, setCanCreateStage] = useState(false);
  const [gallery, setGallery] = useState<WheelSummary[]>([]); const galleryRef = useRef<WheelSummary[]>([]);
  const [transition, setTransition] = useState<WheelSceneTransition | null>(null); const transitionTimer = useRef<number | null>(null); const scrollGuardTimer = useRef<number | null>(null); const navigationFocus = useRef<WheelDirection | null>(null); const loadSequence = useRef(0);
  const sceneScroll = useRef<number | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const noticeTimer = useRef<number | null>(null); const [loading, setLoading] = useState(true); const [routePending, setRoutePending] = useState(false);
  const [mode, setMode] = useState<"practice" | "official">("practice"); const [rotation, setRotation] = useState(0); const [spinning, setSpinning] = useState(false); const [spinRequestPending, setSpinRequestPending] = useState(false); const [soundMuted, setSoundMuted] = useState(false);
  const [result, setResult] = useState<{ entry: WheelEntry; official: boolean } | null>(null); const [busyAction, setBusyAction] = useState(false); const [appearanceOpen, setAppearanceOpen] = useState(false); const [appearanceDraft, setAppearanceDraft] = useState<WheelEditorDraft | undefined>();
  const [pointerTarget, setPointerTarget] = useState<WheelEntry | null>(null); const [participantDetail, setParticipantDetail] = useState<{ entry: WheelEntry; trigger: HTMLElement | null } | null>(null); const pending = useRef<{ entry: WheelEntry; official: boolean } | null>(null);
  const wheel = activePayload?.wheel || null; const access = activePayload?.access || null;
  const seo = useMemo(() => wheel ? wheelSeo(wheel, window.location.origin, presentation ? "present" : "view") : null, [presentation, wheel]);
  usePageSeo(seo);

  const dismissNotice = useCallback(() => {
    if (noticeTimer.current != null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = null;
    setNotice("");
  }, []);
  const showNotice = useCallback((message: string) => {
    if (noticeTimer.current != null) window.clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = window.setTimeout(() => { noticeTimer.current = null; setNotice(""); }, 4_000);
  }, []);

  useEffect(() => {
    let active = true;
    listWheels("", "recent").then((payload) => { if (!active) return; galleryRef.current = payload.items; setGallery(payload.items); }).catch(() => { if (!active) return; galleryRef.current = []; setGallery([]); });
    return () => { active = false; };
  }, []);
  useEffect(() => { let active = true; if (!account) { setCanCreateStage(false); return; } void getCreatorAccess().then((payload) => { if (active) setCanCreateStage(Boolean(payload.canCreate)); }).catch(() => { if (active) setCanCreateStage(false); }); return () => { active = false; }; }, [account]);

  const stopTicks = audio.stopTicks;
  useEffect(() => {
    const sequence = ++loadSequence.current; const outgoing = activeRef.current; const changingWheel = Boolean(outgoing && outgoing.wheel.slug !== slug);
    if (changingWheel) { if (sceneScroll.current == null) sceneScroll.current = window.scrollY; if (scrollGuardTimer.current != null) window.clearInterval(scrollGuardTimer.current); scrollGuardTimer.current = window.setInterval(() => { if (sceneScroll.current != null) window.scrollTo({ top: sceneScroll.current, behavior: "instant" }); }, 32); setRoutePending(true); } else if (!outgoing) setLoading(true);
    getWheel(slug).then((payload) => {
      if (sequence !== loadSequence.current) return;
      const incoming = payload as LoadedWheel; const current = activeRef.current;
      setError(""); setLoading(false); setRoutePending(false);
      if (current && current.wheel.slug !== incoming.wheel.slug) {
        const routeState = location.state as { wheelNavigationDirection?: WheelDirection } | null;
        const direction = wheelNavigationDirection(galleryRef.current, current.wheel.slug, incoming.wheel.slug) || routeState?.wheelNavigationDirection || "next";
        pending.current = null; stopTicks(); setSpinning(false); setSpinRequestPending(false); setResult(null); setBusyAction(false); setMode("practice"); setRotation(0); setPointerTarget(null); setParticipantDetail(null); setAppearanceOpen(false); setAppearanceDraft(undefined);
        activeRef.current = incoming; setActivePayload(incoming); setTransition({ outgoing: current, incoming, direction });
        if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.requestAnimationFrame(() => { if (sceneScroll.current != null) window.scrollTo({ top: sceneScroll.current, behavior: "instant" }); });
        transitionTimer.current = window.setTimeout(() => { setTransition(null); window.requestAnimationFrame(() => { if (sceneScroll.current != null) window.scrollTo({ top: sceneScroll.current, behavior: "instant" }); if (scrollGuardTimer.current != null) window.clearInterval(scrollGuardTimer.current); scrollGuardTimer.current = null; sceneScroll.current = null; const requestedFocus = navigationFocus.current; navigationFocus.current = null; if (requestedFocus) (document.querySelector<HTMLElement>(`[data-wheel-scene="active"] .wheel-navigator__direction--${requestedFocus}:not(:disabled)`) || document.querySelector<HTMLElement>('[data-wheel-scene="active"] h1'))?.focus({ preventScroll: true }); }); }, reduced ? 90 : 620);
      } else {
        activeRef.current = incoming; setActivePayload(incoming); if (!incoming.access.canSpinOfficially) setMode("practice");
      }
    }).catch((reason) => {
      if (sequence !== loadSequence.current) return;
      if (scrollGuardTimer.current != null) window.clearInterval(scrollGuardTimer.current); scrollGuardTimer.current = null; sceneScroll.current = null;
      setLoading(false); setRoutePending(false); setError(message(reason));
      const current = activeRef.current;
      if (current && current.wheel.slug !== slug) {
        showNotice("That public wheel is no longer available. Gallery order has been refreshed.");
        void listWheels("", "recent").then((payload) => { galleryRef.current = payload.items; setGallery(payload.items); }).catch(() => undefined);
        navigate(`/wheels/${current.wheel.slug}${presentation ? "/present" : ""}`, { replace: true, state: { wheelSceneNavigation: true } });
      } else { activeRef.current = null; setActivePayload(null); }
    });
  }, [location.state, navigate, presentation, showNotice, slug, stopTicks]);

  useEffect(() => () => { if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current); if (scrollGuardTimer.current != null) window.clearInterval(scrollGuardTimer.current); if (noticeTimer.current != null) window.clearTimeout(noticeTimer.current); }, []);
  useEffect(() => {
    if (!notice) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismissNotice(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismissNotice, notice]);
  useEffect(() => { const rememberScroll = () => { sceneScroll.current = window.scrollY; }; window.addEventListener("popstate", rememberScroll, true); return () => window.removeEventListener("popstate", rememberScroll, true); }, []);
  useEffect(() => {
    if (!wheel) return;
    const neighbours = wheelGalleryNeighbours(gallery, wheel.slug); let active = true;
    for (const summary of [neighbours.previous, neighbours.next]) if (summary) void prefetchWheel(summary.slug).then((payload) => { if (active) preloadWheelMedia(payload.wheel); }).catch(() => undefined);
    return () => { active = false; };
  }, [gallery, wheel]);
  const cleanupAudio = audio.cleanup;
  useEffect(() => () => { cleanupAudio(); }, [cleanupAudio]);
  useEffect(() => { if (!presentation) return; document.documentElement.classList.add("wheel-presentation-root"); return () => document.documentElement.classList.remove("wheel-presentation-root"); }, [presentation]);

  const finishSpin = useCallback(() => { setSpinning(false); audio.stopTicks(); const next = pending.current; pending.current = null; if (!next) return; setResult(next); const config = activeRef.current?.wheel.config; if (config?.winnerSoundEnabled && !soundMuted) audio.playWinner(config.winnerSoundPreset || "gold-rise"); }, [audio, soundMuted]);
  const spin = async () => {
    audio.unlock(); const current = activeRef.current; if (!current || spinning || spinRequestPending) return; const { wheel: activeWheel, access: activeAccess } = current; const active = activeWheel.entries.filter((entry) => entry.state === "active");
    if (!active.length) { setError("This wheel has no active participants."); return; }
    if (mode === "official" && active.length < 2) { setError("Official draws require at least two active participants."); return; }
    setError(""); setResult(null);
    try {
      let entry: WheelEntry; let official = false;
      if (mode === "official") {
        if (!activeAccess.canSpinOfficially || !csrfToken || !activeWheel.revision) throw new Error("Official spinner access is unavailable.");
        setSpinRequestPending(true); const response = await officialSpin(activeWheel.slug, activeWheel.revision, crypto.randomUUID(), csrfToken);
        entry = active.find((candidate) => candidate.id === response.spin.winningEntryId) || { id: response.spin.winningEntryId, label: response.spin.winningLabel, order: 0, weight: 1, colour: null, style: null, state: "active" }; official = true;
      } else entry = selectWeightedEntry(active);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; const plan = spinPlan(active, entry.id, reduced ? 2000 : activeWheel.config.spinDurationMs, rotation);
      pending.current = { entry, official }; setSpinning(true); setRotation(plan.finalRotation);
      if (!soundMuted && activeWheel.config.tickingSoundEnabled && !reduced) audio.startTicks(plan.durationMs, activeWheel.config.spinSoundPreset || "classic-tick"); if (reduced) window.requestAnimationFrame(() => finishSpin());
    } catch (reason) { setError(message(reason)); setSpinning(false); pending.current = null; audio.stopTicks(); } finally { setSpinRequestPending(false); }
  };
  const applyWheel = (nextWheel: Wheel) => { setActivePayload((current) => { if (!current) return current; const next = { ...current, wheel: nextWheel }; activeRef.current = next; return next; }); };
  const mutateWinner = async (action: "keep" | "hide" | "remove" | "remove-matching") => {
    const current = activeRef.current; if (!result || !csrfToken || !current?.access.canEdit) return; if (action === "keep") { setResult(null); return; }
    setBusyAction(true); try { const payload = await winnerAction(current.wheel.slug, result.entry.id, action, csrfToken); activeRef.current = payload; setActivePayload(payload); setResult(null); } catch (reason) { setError(message(reason)); } finally { setBusyAction(false); }
  };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setError("Fullscreen is unavailable in this browser. Presentation mode still fills the page."); } };
  const toggleSound = () => { if (soundMuted) audio.unlock(); setSoundMuted((value) => !value); };
  const shareWheel = async () => {
    const current = activeRef.current?.wheel; if (!current) return;
    const url = new URL(`/wheels/${current.slug}`, window.location.origin).href;
    setError("");
    try {
      if (navigator.share) { await navigator.share({ title: current.title, text: current.description || `Spin ${current.title} on Third Railify.`, url }); showNotice("Share options opened for this wheel."); }
      else { await copyText(url); showNotice("Wheel link copied to your clipboard."); }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      try { await copyText(url); showNotice("Share options were unavailable, so the wheel link was copied instead."); }
      catch { showNotice(`Sharing is unavailable here. Copy this wheel link: ${url}`); }
    }
  };
  const participantManagerOpen = !presentation && searchParams.get("dialog") === "participants";
  const wheelUrl = (dialog?: string) => { const next = new URLSearchParams(location.search); if (dialog) next.set("dialog", dialog); else next.delete("dialog"); const query = next.toString(); return `/wheels/${activeRef.current?.wheel.slug || slug}${query ? `?${query}` : ""}`; };
  const openParticipantManager = () => navigate(wheelUrl("participants")); const closeParticipantManager = () => navigate(wheelUrl()); const closeEditor = () => navigate(wheelUrl());

  if (loading && !wheel) return <WheelState presentation={presentation} title="Tuning the wheel signal…" />;
  if (!wheel || !activePayload || !access) return <WheelState presentation={presentation} title="Wheel unavailable" message={error || "This wheel was not found."} />;
  const messageTemplate = wheel.config.winnerMessageTemplate || "Signal locked: {winner}"; const neighbours = wheelGalleryNeighbours(gallery, wheel.slug);
  const navigationLocked = spinning || spinRequestPending || Boolean(result) || busyAction || routePending || Boolean(transition) || editorRequested || participantManagerOpen || appearanceOpen;
  const navigateToWheel = (summary: WheelSummary | null, direction: WheelDirection) => { if (!summary || navigationLocked) return; sceneScroll.current = window.scrollY; navigationFocus.current = direction; setParticipantDetail(null); dismissNotice(); navigate(`/wheels/${summary.slug}${presentation ? "/present" : ""}`, { state: { wheelSceneNavigation: true, wheelNavigationDirection: direction } }); };
  const sceneProps: ActiveSceneProps = { presentation, mode, rotation, spinning, spinRequestPending, soundMuted, result, error, neighbours, navigationLocked, account: Boolean(account), canCreateStage, canOpenAppearance: Boolean(access.canEdit && csrfToken), onNavigate: navigateToWheel, onShare: shareWheel, onSpin: spin, onFinishSpin: finishSpin, onMode: setMode, onToggleSound: toggleSound, onToggleFullscreen: toggleFullscreen, onPointerTarget: setPointerTarget, onParticipant: (entry, trigger) => setParticipantDetail({ entry, trigger }), onOpenParticipants: openParticipantManager, onOpenAppearance: () => setAppearanceOpen(true), onLogin: () => openAuth("signin"), pointerTarget };

  return <div className={`wheel-control-page${presentation ? " wheel-control-page--presentation" : ""} intensity--${wheel.config.backgroundIntensity}${wheelBackground(wheel) ? " has-custom-background" : ""}${transition ? " is-scene-transitioning" : ""}`} style={wheelSurfaceStyle(wheel)} data-wheel-transition={transition ? transition.direction : "settled"}>
    <div className="wheel-scene-backgrounds" aria-hidden="true">{transition ? <><div className={`wheel-control-page__background wheel-control-page__background--outgoing is-${transition.direction}`} style={wheelSurfaceStyle(transition.outgoing.wheel)} /><div className={`wheel-control-page__background wheel-control-page__background--incoming is-${transition.direction}`} style={wheelSurfaceStyle(transition.incoming.wheel)} /></> : <div className="wheel-control-page__background wheel-control-page__background--active" style={wheelSurfaceStyle(wheel)} />}</div>
    {presentation ? <header className="presentation-bar"><Link to={`/wheels/${wheel.slug}`} aria-label="Exit presentation mode"><BackIcon /><span>Exit</span></Link><span>{wheel.title}</span><button type="button" onClick={toggleFullscreen}><FullscreenIcon /><span>Fullscreen</span></button></header> : null}
    <div className="wheel-scene-viewport" data-wheel-scene-viewport>{transition ? <WheelScene payload={transition.outgoing} role="outgoing" direction={transition.direction} {...sceneProps} interactive={false} neighbours={wheelGalleryNeighbours(gallery, transition.outgoing.wheel.slug)} /> : null}<WheelScene payload={activePayload} role={transition ? "incoming" : "active"} direction={transition?.direction || null} {...sceneProps} interactive /></div>
    {routePending ? <div className="wheel-transition-loading" role="status"><WheelsBrandMark /><span>Tuning next wheel…</span></div> : null}
    {notice ? createPortal(<div className="wheel-transition-notice wheel-info" role="alert" aria-atomic="true"><span>{notice}</span><button className="wheel-transition-notice__close" type="button" onClick={dismissNotice} aria-label="Dismiss wheel notice"><CloseIcon /></button></div>, document.body) : null}
    <div className="wheel-navigation-live sr-only" role="status" aria-live="polite">{notice || (!transition && !routePending ? `Loaded wheel ${wheel.title}` : "")}</div>
    {result ? <WinnerCelebration entry={result.entry} official={result.official} message={messageTemplate} celebrationEnabled={wheel.config.celebrationEnabled !== false} confettiEnabled={wheel.config.confettiEnabled !== false} fireworksEnabled={wheel.config.fireworksEnabled !== false} lightingEnabled={wheel.config.winnerLightingEnabled !== false} intensity={new Set(["subtle", "normal", "strong"]).has(wheel.config.celebrationIntensity) ? wheel.config.celebrationIntensity : "normal"} palette={wheel.config.palette} accent={wheel.config.pointerAccent} canEdit={Boolean(access.canEdit)} busy={busyAction} onClose={() => setResult(null)} onAction={(action) => void mutateWinner(action)} /> : null}
    {participantDetail ? <ParticipantDetails entry={participantDetail.entry} entries={wheel.entries} config={wheel.config} trigger={participantDetail.trigger} onClose={() => setParticipantDetail(null)} /> : null}
    {editorRequested && access.canEdit && csrfToken ? <WheelEditorDialog wheel={wheel} csrfToken={csrfToken} suspended={appearanceOpen} onClose={closeEditor} onSaved={applyWheel} onOpenAppearance={(draft) => { setAppearanceDraft(draft); setAppearanceOpen(true); }} /> : null}
    {editorRequested && !access.canEdit ? <EditorAccessDialog wheel={wheel} account={Boolean(account)} locked={Boolean(access.editingLocked)} onLogin={() => openAuth("signin")} /> : null}
    {participantManagerOpen && access.canEdit && csrfToken ? <ParticipantManagerDialog wheel={wheel} csrfToken={csrfToken} onClose={closeParticipantManager} onSaved={applyWheel} /> : null}
    {appearanceOpen && access.canEdit && csrfToken ? <AppearanceDialog wheel={{ ...wheel, media: wheel.media || { background: null, centre: null, segmentFills: [] } }} draft={appearanceDraft} csrfToken={csrfToken} onClose={() => { setAppearanceOpen(false); setAppearanceDraft(undefined); }} onSaved={applyWheel} /> : null}
  </div>;
}

type ActiveSceneProps = { presentation: boolean; mode: "practice" | "official"; rotation: number; spinning: boolean; spinRequestPending: boolean; soundMuted: boolean; result: { entry: WheelEntry; official: boolean } | null; error: string; neighbours: ReturnType<typeof wheelGalleryNeighbours>; navigationLocked: boolean; account: boolean; canCreateStage: boolean; canOpenAppearance: boolean; pointerTarget: WheelEntry | null; onNavigate: (wheel: WheelSummary | null, direction: WheelDirection) => void; onShare: () => Promise<void>; onSpin: () => Promise<void>; onFinishSpin: () => void; onMode: (mode: "practice" | "official") => void; onToggleSound: () => void; onToggleFullscreen: () => void; onPointerTarget: (entry: WheelEntry | null) => void; onParticipant: (entry: WheelEntry, trigger: HTMLElement) => void; onOpenParticipants: () => void; onOpenAppearance: () => void; onLogin: () => void };

function WheelScene({ payload, role, direction, interactive, ...props }: { payload: LoadedWheel; role: "active" | "incoming" | "outgoing"; direction: WheelDirection | null; interactive: boolean } & ActiveSceneProps) {
  const { wheel, access } = payload; const active = wheel.entries.filter((entry) => entry.state === "active"); const officialAvailable = Boolean(access.canSpinOfficially && wheel.officialEnabled && wheel.lifecycle === "active"); const locked = props.navigationLocked || !interactive; const spinDisabled = !interactive || props.spinning || props.spinRequestPending || !active.length || (!wheel.demoEnabled && props.mode === "practice");
  return <div className={`wheel-scene wheel-scene--${role}${direction ? ` is-${direction}` : ""}`} data-wheel-scene={role} data-wheel-slug={wheel.slug} aria-hidden={!interactive || undefined}>
    <div className={props.presentation ? "wheel-presentation-layout" : "container wheel-control-layout"}>
      <main className="wheel-control-stage">
        {!props.presentation ? <><nav className="wheel-breadcrumb" aria-label="Breadcrumb"><Link to="/wheels"><BackIcon /> Back to wheels</Link><span>WHEELS / {wheel.visibility === "public" ? "PUBLIC DRAW" : "PRIVATE DRAW"} / {wheel.title}</span></nav><WheelNavigator neighbours={props.neighbours} locked={locked} onNavigate={props.onNavigate} /><header className="wheel-control-heading"><div><p className="eyebrow">THIRD RAILIFY WHEEL</p><h1 tabIndex={-1}>{wheel.title}</h1><p>{wheel.description}</p></div><div className="wheel-control-heading__actions"><button type="button" className="icon-control" disabled={!interactive} onClick={() => void props.onShare()} aria-label="Share wheel link"><ShareIcon /> Share</button><Link className="icon-control" aria-disabled={!interactive} tabIndex={interactive ? 0 : -1} to={`/wheels/${wheel.slug}/present`}><FullscreenIcon /> Present</Link>{props.canCreateStage ? <Link className="icon-control" aria-disabled={!interactive} tabIndex={interactive ? 0 : -1} to={`/wheels/stages/new?wheel=${encodeURIComponent(wheel.slug)}`}>Add to Stage</Link> : null}{access.canEdit ? <Link className="icon-control" aria-disabled={!interactive} tabIndex={interactive ? 0 : -1} to={`/wheels/${wheel.slug}/edit`}><EditIcon /> Edit</Link> : null}</div></header></> : <><h1 className="sr-only">{wheel.title} presentation</h1><WheelNavigator neighbours={props.neighbours} locked={locked} onNavigate={props.onNavigate} /></>}
        <div className="wheel-visual-wrap"><WheelCanvas entries={wheel.entries} config={wheel.config} rotation={interactive ? props.rotation : 0} durationMs={wheel.config.spinDurationMs} spinning={interactive && props.spinning} winner={interactive && Boolean(props.result)} centreImageUrl={wheel.media?.centre?.url} segmentMedia={wheel.media?.segmentFills} onSpinEnd={interactive ? props.onFinishSpin : undefined} onPointerTargetChange={interactive ? props.onPointerTarget : undefined} onSegmentSelect={!props.presentation && interactive ? (entry, trigger) => props.onParticipant(entry, trigger) : undefined} onCentreSpin={interactive ? () => void props.onSpin() : undefined} centreSpinDisabled={spinDisabled} centreSpinLabel={props.mode === "official" ? "Start recorded official draw from wheel centre" : "Spin wheel from centre"} /><PointerTargetHud entry={interactive ? props.pointerTarget : null} entries={wheel.entries} config={wheel.config} presentation={props.presentation} /></div>
        <div className="wheel-spin-console"><div className="wheel-spin-console__secondary">{officialAvailable ? <fieldset className="draw-mode-switch"><legend>Draw mode</legend><button type="button" className={props.mode === "practice" ? "is-active" : ""} aria-label="Practice spin" aria-pressed={props.mode === "practice"} onClick={() => props.onMode("practice")} disabled={!interactive || props.spinning || props.spinRequestPending}><PracticeIcon /> Practice</button><button type="button" className={props.mode === "official" ? "is-active is-official" : ""} aria-label="Official draw" aria-pressed={props.mode === "official"} onClick={() => props.onMode("official")} disabled={!interactive || props.spinning || props.spinRequestPending}><OfficialIcon /> Official</button></fieldset> : <p className="draw-badge">DEMO / NOT RECORDED</p>}</div><button className={`spin-trigger${props.mode === "official" ? " spin-trigger--official" : ""}`} type="button" onClick={() => void props.onSpin()} disabled={spinDisabled} aria-label={props.mode === "official" ? "Start recorded official draw" : "Start demo spin"}><span>{props.spinRequestPending ? "REQUESTING AUTHORITY" : props.spinning ? "SIGNAL IN MOTION" : "SPIN WHEEL"}</span><small>{props.mode === "official" ? "Server-selected · recorded" : "Local demo · not recorded"}</small></button><div className="wheel-spin-console__tools"><button className="sound-toggle" type="button" disabled={!interactive} aria-pressed={!props.soundMuted} onClick={props.onToggleSound} aria-label={props.soundMuted ? "Turn wheel sound on" : "Turn wheel sound off"}><SoundIcon muted={props.soundMuted} /> {props.soundMuted ? "Sound off" : "Sound on"}</button>{props.canOpenAppearance ? <button className="sound-toggle" type="button" disabled={!interactive} onClick={props.onOpenAppearance}><PaletteIcon /> Appearance</button> : null}{props.presentation ? <button className="sound-toggle" type="button" disabled={!interactive} onClick={props.onToggleFullscreen}><FullscreenIcon /> Fullscreen</button> : null}</div></div>
        <div className="wheel-live-region sr-only" role="status" aria-live="polite">{props.result ? `${props.result.official ? "Official" : "Demo"} result: ${props.result.entry.label}` : ""}</div>{interactive && props.error ? <div className="wheel-alert" role="alert">{props.error}</div> : null}
      </main>
      {!props.presentation ? <aside className="wheel-result-rail"><section><p className="eyebrow">DRAW STATUS</p><StatusRows wheel={wheel} access={access} /></section><section><div className="rail-section-title"><h2>Participants</h2><span>{active.length}</span>{access.canEdit ? <button type="button" className="rail-manage" disabled={!interactive} onClick={props.onOpenParticipants} aria-label="Manage participants"><EditIcon /> Manage</button> : null}</div><ol className="participant-list">{wheel.entries.map((entry) => <li key={entry.id} className={entry.state === "hidden" ? "is-hidden" : ""}><button type="button" disabled={!interactive} onClick={(event) => props.onParticipant(entry, event.currentTarget)}><i style={{ background: entry.colour || wheel.config.palette[entry.order % wheel.config.palette.length] }} /><span>{entry.label}</span>{entry.weight !== 1 ? <b>{entry.weight}×</b> : null}{entry.state === "hidden" ? <em>Hidden</em> : null}</button></li>)}</ol></section><section><div className="rail-section-title"><h2>Official history</h2><span>{wheel.recentOfficialResults.length}</span></div>{wheel.recentOfficialResults.length ? <ol className="result-history">{wheel.recentOfficialResults.map((item) => <li key={item.id}><strong>{item.winningLabel}</strong><span>{formatDate(item.createdAt)}{item.voided ? " · voided" : ""}</span></li>)}</ol> : <p className="rail-empty">No recorded official results.</p>}</section>{!props.account ? <button type="button" className="button button--secondary" disabled={!interactive} onClick={props.onLogin}>Log in for approved controls</button> : null}</aside> : null}
    </div>
  </div>;
}

function WheelNavigator({ neighbours, locked, onNavigate }: { neighbours: ReturnType<typeof wheelGalleryNeighbours>; locked: boolean; onNavigate: (wheel: WheelSummary | null, direction: WheelDirection) => void }) {
  if (neighbours.currentPosition == null) return null;
  return <nav className="wheel-navigator" aria-label="Public wheel gallery navigation" data-wheel-navigator><button type="button" className="wheel-navigator__direction wheel-navigator__direction--previous" disabled={locked || !neighbours.previous} onClick={() => onNavigate(neighbours.previous, "previous")} aria-label={neighbours.previous ? `Previous wheel: ${neighbours.previous.title}` : "Previous wheel unavailable; start of gallery"}><span>← Previous</span><small>{neighbours.previous?.title || "Start of gallery"}</small></button><p aria-label={`Wheel ${neighbours.currentPosition} of ${neighbours.total}`}><span>Wheel</span><strong>{String(neighbours.currentPosition).padStart(2, "0")} / {String(neighbours.total).padStart(2, "0")}</strong></p><button type="button" className="wheel-navigator__direction wheel-navigator__direction--next" disabled={locked || !neighbours.next} onClick={() => onNavigate(neighbours.next, "next")} aria-label={neighbours.next ? `Next wheel: ${neighbours.next.title}` : "Next wheel unavailable; end of gallery"}><span>Next →</span><small>{neighbours.next?.title || "End of gallery"}</small></button></nav>;
}

function wheelBackground(wheel: Wheel) { return wheel.config.backgroundEnabled !== false ? wheel.media?.background?.url || null : null; }
function wheelSurfaceStyle(wheel: Wheel) { const background = wheelBackground(wheel); return { "--wheel-accent": wheel.config.pointerAccent || "#F3C928", "--wheel-bg-image": background ? `url("${background}")` : "none", "--wheel-bg-x": `${wheel.config.backgroundFocalX ?? 50}%`, "--wheel-bg-y": `${wheel.config.backgroundFocalY ?? 50}%`, "--wheel-bg-opacity": (wheel.config.backgroundImageOpacity ?? 72) / 100, "--wheel-overlay": (wheel.config.backgroundOverlayIntensity ?? 58) / 100 } as React.CSSProperties; }
function preloadWheelMedia(wheel: Wheel) { for (const url of [wheelBackground(wheel), wheel.media?.centre?.url, ...(wheel.media?.segmentFills || []).map((asset) => asset.url)]) if (url) { const image = new Image(); image.decoding = "async"; if (new URL(url, window.location.origin).origin !== window.location.origin) image.crossOrigin = "anonymous"; image.src = url; } }
async function copyText(value: string) { if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(value); return; } catch { /* use the bounded document fallback */ } } const input = document.createElement("textarea"); input.value = value; input.readOnly = true; input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select(); const copied = document.execCommand("copy"); input.remove(); if (!copied) throw new Error("Clipboard unavailable"); }
function PointerTargetHud({ entry, entries, config, presentation }: { entry: WheelEntry | null; entries: WheelEntry[]; config: Wheel["config"]; presentation: boolean }) { const odds = entry ? participantOdds(entries, entry.id) : null; const colour = entry ? resolvedEntryStyle(entry, config).color : config.pointerAccent; return <div className={`pointer-target-hud${presentation ? " pointer-target-hud--presentation" : ""}`} aria-live="off"><span>POINTER TARGET</span><div><i style={{ background: colour }} aria-hidden="true" /><strong key={entry?.id || "none"}>{entry?.label || "No active segment"}</strong></div>{entry && odds ? <small>{formatProbability(odds.probability)} chance{entry.weight !== 1 ? ` · weight ${entry.weight}` : ""}</small> : null}</div>; }
function EditorAccessDialog({ wheel, account, locked, onLogin }: { wheel: Wheel; account: boolean; locked: boolean; onLogin: () => void }) { return createPortal(<div className="wheel-modal-backdrop" role="presentation"><div className="wheel-modal editor-access-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-access-title"><p className="eyebrow">WHEEL CONTROL</p><h2 id="editor-access-title">{account ? "Editor access required" : "Sign in required"}</h2><p>{locked ? "Admin has locked editing for this wheel." : account ? "Owner or editor access is required. No draft configuration is available to this account." : "Approved Third Railify accounts can edit wheels."}</p><div>{!account ? <button type="button" className="button button--primary" onClick={onLogin}>Log in</button> : null}<Link className="button button--secondary" to={`/wheels/${wheel.slug}`}>Return to {wheel.title}</Link></div></div></div>, document.body); }
function StatusRows({ wheel, access }: { wheel: Wheel; access: WheelAccess | null }) { return <dl className="wheel-status-list"><div><dt>Mode</dt><dd>{access?.canSpinOfficially ? "Official available" : "Public demo"}</dd></div><div><dt>Wheel</dt><dd>{wheel.lifecycle === "archived" ? "Archived" : wheel.visibility === "hidden" ? "Hidden" : "Public"}</dd></div><div><dt>Weighting</dt><dd>{wheel.weighted ? "Weighted segments" : "Equal segments"}</dd></div><div><dt>Official lock</dt><dd>{access?.officialSpinLocked ? "Locked by Admin" : "Open"}</dd></div>{wheel.latestOfficialResult ? <div><dt>Latest result</dt><dd>{wheel.latestOfficialResult.winningLabel}</dd></div> : null}</dl>; }
function WheelState({ presentation, title, message: detail }: { presentation: boolean; title: string; message?: string }) { return <div className={`wheel-route-state${presentation ? " wheel-route-state--presentation" : ""}`}><div><WheelsBrandMark className="wheel-route-state__mark" /><h1>{title}</h1>{detail ? <p>{detail}</p> : null}<Link to="/wheels">Return to Wheels</Link></div></div>; }
function useWheelAudio() { const context = useRef<AudioContext | null>(null); const tickTimer = useRef<number | null>(null); const stingerNodes = useRef<OscillatorNode[]>([]); const closeTimer = useRef<number | null>(null); const unlock = useCallback(() => { try { context.current ||= new AudioContext(); if (context.current.state === "suspended") void context.current.resume(); } catch { /* optional */ } }, []); const stopTicks = useCallback(() => { if (tickTimer.current != null) window.clearInterval(tickTimer.current); tickTimer.current = null; }, []); const startTicks = useCallback((duration: number, preset: string) => { stopTicks(); const audio = context.current; const profile = spinSoundProfile(preset); if (!audio || !profile) return; let elapsed = 0; tickTimer.current = window.setInterval(() => { elapsed += 150; const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.type = profile.waveform; oscillator.frequency.value = profile.frequency; oscillator.detune.value = profile.detune; gain.gain.setValueAtTime(.0001, audio.currentTime); gain.gain.exponentialRampToValueAtTime(profile.gain, audio.currentTime + profile.attack); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + profile.decay); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + profile.decay + .01); if (elapsed >= duration) stopTicks(); }, 150); }, [stopTicks]); const stopWinner = useCallback(() => { for (const node of stingerNodes.current) try { node.stop(); } catch { /* stopped */ } stingerNodes.current = []; if (closeTimer.current != null) window.clearTimeout(closeTimer.current); closeTimer.current = null; }, []); const playWinner = useCallback((preset: string) => { stopWinner(); const audio = context.current; const profile = winnerSoundProfile(preset); if (!audio || audio.state !== "running" || !profile) return; profile.notes.forEach((frequency, index) => { const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.type = profile.waveform; oscillator.frequency.value = frequency; const start = audio.currentTime + index * profile.spacing; gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(profile.gain, start + .018); gain.gain.exponentialRampToValueAtTime(.0001, start + profile.decay); oscillator.connect(gain).connect(audio.destination); oscillator.start(start); oscillator.stop(start + profile.decay + .03); stingerNodes.current.push(oscillator); }); closeTimer.current = window.setTimeout(stopWinner, Math.ceil((profile.notes.length * profile.spacing + profile.decay + .2) * 1000)); }, [stopWinner]); const cleanup = useCallback(() => { stopTicks(); stopWinner(); const audio = context.current; context.current = null; if (audio) void audio.close(); }, [stopTicks, stopWinner]); return { unlock, startTicks, stopTicks, playWinner, cleanup }; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
function message(reason: unknown) { return reason instanceof Error ? reason.message : "The wheel service is unavailable."; }
