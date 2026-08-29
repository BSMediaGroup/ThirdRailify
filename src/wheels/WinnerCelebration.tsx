import { useEffect, useMemo, useRef, useState } from "react";
import type { WheelEntry } from "./types";

type Props = {
  entry: WheelEntry; official: boolean; message: string; celebrationEnabled: boolean; confettiEnabled: boolean; lightingEnabled: boolean;
  intensity: "subtle" | "normal" | "strong"; palette: string[]; canEdit: boolean; busy: boolean; onClose: () => void;
  onAction: (action: "keep" | "hide" | "remove" | "remove-matching") => void;
};

export function WinnerCelebration({ entry, official, message, celebrationEnabled, confettiEnabled, lightingEnabled, intensity, palette, canEdit, busy, onClose, onAction }: Props) {
  const dialog = useRef<HTMLDivElement>(null); const close = useRef<HTMLButtonElement>(null); const [effectsActive, setEffectsActive] = useState(true);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particles = useMemo(() => Array.from({ length: reduced ? 36 : intensity === "strong" ? 84 : intensity === "normal" ? 58 : 34 }, (_, index) => ({ index, x: (index * 47) % 101, delay: (index % 12) * 55, drift: ((index * 31) % 181) - 90, colour: ["#F3C928", "#B8182F", "#FFFDF3", ...palette][index % (3 + palette.length)] })), [intensity, palette, reduced]);
  useEffect(() => { const timer = window.setTimeout(() => setEffectsActive(false), intensity === "strong" ? 6200 : 5000); return () => window.clearTimeout(timer); }, [intensity]);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; close.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab" && dialog.current) trapFocus(event, dialog.current); }; document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); previous?.focus(); }; }, [onClose]);
  const active = celebrationEnabled && effectsActive;
  return <div className={`winner-backdrop celebration--${intensity}${active ? " is-celebrating" : ""}${lightingEnabled && active ? " has-lighting" : ""}`} role="presentation" style={{ "--winner-accent": palette[0] || "#F3C928" } as React.CSSProperties} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {active && lightingEnabled ? <div className="winner-lightshow" aria-hidden="true"><i /><i /><i /><i /><span /><span /></div> : null}
    {active && confettiEnabled ? <div className={`winner-confetti${reduced ? " is-static" : ""}`} aria-hidden="true">{particles.map(({ index, x, delay, drift, colour }) => <i key={index} style={{ "--i": index, "--x": `${x}%`, "--delay": `${delay}ms`, "--drift": `${drift}px`, "--confetti": colour } as React.CSSProperties} />)}</div> : null}
    <div ref={dialog} className="winner-dialog" role="dialog" aria-modal="true" aria-labelledby="winner-title" aria-describedby="winner-status winner-detail">
      <button ref={close} type="button" className="winner-dialog__close" onClick={onClose} aria-label="Close result">×</button>
      <div className="winner-dialog__mark" aria-hidden="true"><span>★</span></div><p className={`draw-badge ${official ? "is-official" : ""}`}>{official ? "OFFICIAL DRAW · RECORDED" : "DEMO / NOT RECORDED"}</p>
      <p id="winner-status" className="eyebrow">{message.replace("{winner}", entry.label)}</p><h2 id="winner-title">{entry.label}</h2>
      <p id="winner-detail">{official ? "This result was selected and persisted by the Third Railify authority before the animation began." : "Demo result — not recorded as an official draw."}</p>
      {canEdit ? <div className="winner-actions"><button type="button" onClick={() => onAction("keep")} disabled={busy}>Keep participant</button><button type="button" onClick={() => onAction("hide")} disabled={busy}>Hide winner</button><button type="button" onClick={() => onAction("remove")} disabled={busy}>Remove entry</button><button type="button" className="danger" onClick={() => { if (window.confirm(`Remove every entry labelled “${entry.label}”?`)) onAction("remove-matching"); }} disabled={busy}>Remove all matching</button></div> : null}
    </div>
  </div>;
}

function trapFocus(event: KeyboardEvent, root: HTMLElement) { const focusable = [...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]; if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
