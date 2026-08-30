import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { Wheel, WheelEntry } from "./types";
import { CELEBRATION_PROFILES } from "./celebrationProfiles.mjs";
import { resolvedEntryStyle } from "./segmentStyles.mjs";
import { aggregateStageCelebration } from "./stageSpinAll.mjs";
import { FireworksCanvas, Lightshow } from "./WinnerCelebration";
import { trapFocus } from "./focusTrap";
import { WheelsBrandMark } from "./WheelsBrandMark";

export type StageResultMode = "demo" | "practice" | "official";
export type StageWinnerResult = { position: number; wheel: Wheel; entry: WheelEntry; mode: StageResultMode };
export function StageWinnerCelebration({ results, portalRoot, onClose }: { results: StageWinnerResult[]; portalRoot: HTMLElement; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null); const close = useRef<HTMLButtonElement>(null); const aggregate = useMemo(() => aggregateStageCelebration(results), [results]);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; const profile = CELEBRATION_PROFILES[aggregate.intensity];
  const colours = useMemo(() => results.flatMap(({ wheel }) => [wheel.config.pointerAccent, ...wheel.config.palette]).filter((value) => /^#[0-9a-f]{6}$/i.test(value)), [results]);
  const particles = useMemo(() => reduced ? [] : Array.from({ length: profile.confettiCount }, (_, index) => ({ index, x: (index * 47 + (index % 5) * 7) % 101, delay: 80 + (index % 19) * 24, drift: ((index * 37) % 241) - 120, size: 6 + ((index * 5) % 7), duration: Math.round(profile.confettiDuration * (.64 + ((index * 83) % 37) / 100)), colour: colours[index % Math.max(1, colours.length)] || "#F3C928", shape: index % 3 === 0 ? "diamond" : index % 3 === 1 ? "strip" : "rect", cannon: index % 6 === 0 ? "left" : index % 6 === 1 ? "right" : "stage" })), [colours, profile, reduced]);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; close.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); else if (event.key === "Tab" && dialog.current) trapFocus(event, dialog.current); }; document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; previous?.focus(); }; }, [onClose]);
  const active = aggregate.enabled; const style = { "--winner-accent": results[0]?.wheel.config.pointerAccent || "#F3C928", "--lighting-strength": profile.lightingStrength, "--rim-strength": profile.rimStrength, "--bloom-opacity": profile.bloomOpacity, "--stage-energy": profile.stageEnergy } as React.CSSProperties;
  return createPortal(<div className={`winner-backdrop stage-results-backdrop celebration--${aggregate.intensity}${active ? " is-celebrating" : ""}${active && aggregate.lighting ? " has-lighting" : ""}`} role="presentation" style={style} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {active && aggregate.lighting ? <Lightshow profile={profile} reduced={reduced} /> : null}
    {active && aggregate.fireworks && !reduced ? <FireworksCanvas profile={profile} colours={colours} /> : null}
    {active && aggregate.confetti && !reduced ? <div className="winner-confetti" aria-hidden="true" data-confetti-count={particles.length}>{particles.map((particle) => <i key={particle.index} className={`is-${particle.shape} from-${particle.cannon}`} style={{ "--i": particle.index, "--x": `${particle.x}%`, "--delay": `${particle.delay}ms`, "--drift": `${particle.drift}px`, "--size": `${particle.size}px`, "--duration": `${particle.duration}ms`, "--confetti": particle.colour } as React.CSSProperties} />)}</div> : null}
    <div ref={dialog} className={`winner-dialog stage-results-dialog stage-results-dialog--${Math.min(6, results.length)}`} role="dialog" aria-modal="true" aria-labelledby="stage-results-title" aria-describedby="stage-results-detail">
      <button ref={close} type="button" className="winner-dialog__close" onClick={onClose} aria-label="Close Stage results">×</button>
      <div className="winner-dialog__mark" aria-hidden="true"><WheelsBrandMark /></div><p className="eyebrow">STAGE RESULTS</p><h2 id="stage-results-title">WINNERS LOCKED.</h2>
      <p id="stage-results-detail">{results.every((result) => result.mode === "official") ? "Every result was selected and persisted by the Third Railify authority before animation." : "Stage summary · results marked not recorded are non-binding."}</p>
      <div className="stage-results-grid">{results.map(({ position, wheel, entry, mode }) => { const colour = resolvedEntryStyle(entry, wheel.config).color; return <article key={`${position}:${wheel.slug}`} style={{ "--stage-result-colour": colour } as React.CSSProperties}><div><i aria-hidden="true" /><span>{wheel.title}</span></div><strong>{entry.label}</strong><small className={mode === "official" ? "is-official" : ""}>{mode === "official" ? "OFFICIAL · RECORDED" : `${mode.toUpperCase()} · NOT RECORDED`}</small></article>; })}</div>
      <button type="button" className="button button--primary stage-results-close" onClick={onClose}>CLOSE RESULTS</button>
    </div>
  </div>, portalRoot);
}
