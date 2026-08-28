import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { getWheel, officialSpin, winnerAction } from "../wheels/client";
import { selectWeightedEntry, spinPlan } from "../wheels/engine.mjs";
import type { Wheel, WheelAccess, WheelEntry } from "../wheels/types";
import { WheelCanvas } from "../wheels/WheelCanvas";
import { WinnerCelebration } from "../wheels/WinnerCelebration";
import "../styles/wheels.css";

export function WheelPage({ presentation = false }: { presentation?: boolean }) {
  const { slug = "" } = useParams(); const { account, csrfToken, openAuth } = useAuth();
  const [wheel, setWheel] = useState<Wheel | null>(null); const [access, setAccess] = useState<WheelAccess | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [mode, setMode] = useState<"practice" | "official">("practice"); const [rotation, setRotation] = useState(0); const [spinning, setSpinning] = useState(false); const [soundMuted, setSoundMuted] = useState(false); const [result, setResult] = useState<{ entry: WheelEntry; official: boolean } | null>(null); const [busyAction, setBusyAction] = useState(false); const pending = useRef<{ entry: WheelEntry; official: boolean } | null>(null);

  const load = useCallback(async () => { setLoading(true); try { const payload = await getWheel(slug); setWheel(payload.wheel); setAccess(payload.access); setError(""); if (!payload.access.canSpinOfficially) setMode("practice"); } catch (reason) { setError(message(reason)); setWheel(null); } finally { setLoading(false); } }, [slug]);
  useEffect(() => { void load(); return stopTicks; }, [load]);
  useEffect(() => { if (!presentation) return; document.documentElement.classList.add("wheel-presentation-root"); return () => document.documentElement.classList.remove("wheel-presentation-root"); }, [presentation]);

  const finishSpin = useCallback(() => { setSpinning(false); stopTicks(); const next = pending.current; pending.current = null; if (!next) return; setResult(next); if (wheel?.config.winnerSoundEnabled && !soundMuted) playWinnerSound(); }, [soundMuted, wheel?.config.winnerSoundEnabled]);
  const spin = async () => {
    if (!wheel || spinning) return; const active = wheel.entries.filter((entry) => entry.state === "active"); if (!active.length) { setError("This wheel has no active participants."); return; }
    if (mode === "official" && active.length < 2) { setError("Official draws require at least two active participants."); return; }
    setError(""); setResult(null);
    try {
      let entry: WheelEntry; let official = false;
      if (mode === "official") {
        if (!access?.canSpinOfficially || !csrfToken || !wheel.revision) throw new Error("Official spinner access is unavailable.");
        const response = await officialSpin(slug, wheel.revision, crypto.randomUUID(), csrfToken); entry = active.find((candidate) => candidate.id === response.spin.winningEntryId) || { id: response.spin.winningEntryId, label: response.spin.winningLabel, order: 0, weight: 1, colour: null, state: "active" }; official = true;
      } else { entry = selectWeightedEntry(active); }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; const plan = spinPlan(active, entry.id, reduced ? 2000 : wheel.config.spinDurationMs, rotation); pending.current = { entry, official }; setSpinning(true); setRotation(plan.finalRotation);
      if (!soundMuted && wheel.config.tickingSoundEnabled && !reduced) startTicks(plan.durationMs);
      if (reduced) window.requestAnimationFrame(() => finishSpin());
    } catch (reason) { setError(message(reason)); setSpinning(false); pending.current = null; stopTicks(); }
  };
  const mutateWinner = async (action: "keep" | "hide" | "remove" | "remove-matching") => { if (!result || !csrfToken || !access?.canEdit) return; if (action === "keep") { setResult(null); return; } setBusyAction(true); try { const payload = await winnerAction(slug, result.entry.id, action, csrfToken); setWheel(payload.wheel); setAccess(payload.access); setResult(null); } catch (reason) { setError(message(reason)); } finally { setBusyAction(false); } };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setError("Fullscreen is unavailable in this browser. Presentation mode still fills the page."); } };

  if (loading) return <WheelState presentation={presentation} title="Tuning the wheel signal…" />;
  if (!wheel) return <WheelState presentation={presentation} title="Wheel unavailable" message={error || "This wheel was not found."} />;
  const active = wheel.entries.filter((entry) => entry.state === "active"); const officialAvailable = Boolean(access?.canSpinOfficially && wheel.officialEnabled && wheel.lifecycle === "active"); const messageTemplate = wheel.config.winnerMessageTemplate || "Signal locked: {winner}";
  return <div className={`wheel-control-page${presentation ? " wheel-control-page--presentation" : ""} intensity--${wheel.config.backgroundIntensity}`}>
    {presentation ? <header className="presentation-bar"><Link to={`/wheels/${wheel.slug}`} aria-label="Exit presentation mode">← Exit</Link><span>{wheel.title}</span><button type="button" onClick={toggleFullscreen}>Fullscreen</button></header> : null}
    <div className={presentation ? "wheel-presentation-layout" : "container wheel-control-layout"}>
      <main className="wheel-control-stage">
        {!presentation ? <header className="wheel-control-heading"><div><p className="eyebrow">THIRD RAILIFY WHEEL</p><h1>{wheel.title}</h1><p>{wheel.description}</p></div><div className="wheel-control-heading__actions"><button type="button" className="icon-control" onClick={() => navigator.clipboard?.writeText(window.location.href)} aria-label="Copy wheel link">Share</button><Link className="icon-control" to={`/wheels/${wheel.slug}/present`}>Present</Link>{access?.canEdit ? <Link className="icon-control" to={`/wheels/${wheel.slug}/edit`}>Edit</Link> : null}</div></header> : <h1 className="sr-only">{wheel.title} presentation</h1>}
        <div className="wheel-visual-wrap"><WheelCanvas entries={wheel.entries} config={wheel.config} rotation={rotation} durationMs={wheel.config.spinDurationMs} spinning={spinning} onSpinEnd={finishSpin} /></div>
        <div className="wheel-spin-console">
          {officialAvailable ? <fieldset className="draw-mode-switch"><legend>Draw mode</legend><button type="button" className={mode === "practice" ? "is-active" : ""} aria-pressed={mode === "practice"} onClick={() => setMode("practice")} disabled={spinning}>Practice spin</button><button type="button" className={mode === "official" ? "is-active is-official" : ""} aria-pressed={mode === "official"} onClick={() => setMode("official")} disabled={spinning}>Official draw</button></fieldset> : <p className="draw-badge">DEMO / NOT RECORDED</p>}
          <button className={`spin-trigger${mode === "official" ? " spin-trigger--official" : ""}`} type="button" onClick={() => void spin()} disabled={spinning || !active.length || (!wheel.demoEnabled && mode === "practice")} aria-label={mode === "official" ? "Start recorded official draw" : "Start demo spin"}><span>{spinning ? "SIGNAL IN MOTION" : mode === "official" ? "DRAW OFFICIALLY" : "SPIN THE RAIL"}</span><small>{mode === "official" ? "Server-selected · recorded" : "Local demo · not recorded"}</small></button>
          <button className="sound-toggle" type="button" aria-pressed={soundMuted} onClick={() => setSoundMuted((value) => !value)}>{soundMuted ? "Sound off" : "Sound on"}</button>
        </div>
        <div className="wheel-live-region sr-only" role="status" aria-live="polite">{result ? `${result.official ? "Official" : "Demo"} result: ${result.entry.label}` : ""}</div>
        {error ? <div className="wheel-alert" role="alert">{error}</div> : null}
      </main>
      {!presentation ? <aside className="wheel-result-rail"><section><p className="eyebrow">DRAW STATUS</p><StatusRows wheel={wheel} access={access} /></section><section><div className="rail-section-title"><h2>Participants</h2><span>{active.length}</span></div><ol className="participant-list">{wheel.entries.map((entry) => <li key={entry.id} className={entry.state === "hidden" ? "is-hidden" : ""}><i style={{ background: entry.colour || wheel.config.palette[entry.order % wheel.config.palette.length] }} /><span>{entry.label}</span>{entry.weight !== 1 ? <b>{entry.weight}×</b> : null}{entry.state === "hidden" ? <em>Hidden</em> : null}</li>)}</ol></section><section><div className="rail-section-title"><h2>Official history</h2><span>{wheel.recentOfficialResults.length}</span></div>{wheel.recentOfficialResults.length ? <ol className="result-history">{wheel.recentOfficialResults.map((item) => <li key={item.id}><strong>{item.winningLabel}</strong><span>{formatDate(item.createdAt)}{item.voided ? " · voided" : ""}</span></li>)}</ol> : <p className="rail-empty">No recorded official results.</p>}</section>{!account ? <button type="button" className="secondary-button" onClick={() => openAuth("signin")}>Log in for approved controls</button> : null}</aside> : null}
    </div>
    {result ? <WinnerCelebration entry={result.entry} official={result.official} message={messageTemplate} intensity={wheel.config.celebrationIntensity} canEdit={Boolean(access?.canEdit)} busy={busyAction} onClose={() => setResult(null)} onAction={(action) => void mutateWinner(action)} /> : null}
  </div>;
}

function StatusRows({ wheel, access }: { wheel: Wheel; access: WheelAccess | null }) { return <dl className="wheel-status-list"><div><dt>Mode</dt><dd>{access?.canSpinOfficially ? "Official available" : "Public demo"}</dd></div><div><dt>Wheel</dt><dd>{wheel.lifecycle === "archived" ? "Archived" : wheel.visibility === "hidden" ? "Hidden" : "Public"}</dd></div><div><dt>Weighting</dt><dd>{wheel.weighted ? "Weighted segments" : "Equal segments"}</dd></div><div><dt>Official lock</dt><dd>{access?.officialSpinLocked ? "Locked by Admin" : "Open"}</dd></div>{wheel.latestOfficialResult ? <div><dt>Latest result</dt><dd>{wheel.latestOfficialResult.winningLabel}</dd></div> : null}</dl>; }
function WheelState({ presentation, title, message }: { presentation: boolean; title: string; message?: string }) { return <div className={`wheel-route-state${presentation ? " wheel-route-state--presentation" : ""}`}><div><span aria-hidden="true">ϟ</span><h1>{title}</h1>{message ? <p>{message}</p> : null}<Link to="/wheels">Return to Wheels</Link></div></div>; }
function startTicks(duration: number) { stopTicks(); let context: AudioContext | null = null; try { context = new AudioContext(); } catch { return; } let elapsed = 0; const interval = window.setInterval(() => { elapsed += 150; const oscillator = context!.createOscillator(); const gain = context!.createGain(); oscillator.frequency.value = 880; gain.gain.setValueAtTime(.025, context!.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context!.currentTime + .035); oscillator.connect(gain).connect(context!.destination); oscillator.start(); oscillator.stop(context!.currentTime + .04); if (elapsed >= duration) { window.clearInterval(interval); void context!.close(); } }, 150); activeTickTimer = interval; }
let activeTickTimer: number | null = null; function stopTicks() { if (activeTickTimer != null) window.clearInterval(activeTickTimer); activeTickTimer = null; }
function playWinnerSound() { try { const context = new AudioContext(); [523, 659, 784].forEach((frequency, index) => { const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.055, context.currentTime + index * .09); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + index * .09 + .22); oscillator.connect(gain).connect(context.destination); oscillator.start(context.currentTime + index * .09); oscillator.stop(context.currentTime + index * .09 + .24); }); window.setTimeout(() => void context.close(), 800); } catch { /* Web Audio is optional. */ } }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
function message(reason: unknown) { return reason instanceof Error ? reason.message : "The wheel service is unavailable."; }
