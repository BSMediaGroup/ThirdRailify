import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WheelEntry } from "./types";
import { WheelsBrandMark } from "./WheelsBrandMark";
import { CheckIcon, EyeOffIcon, TrashIcon } from "../components/Icons";

type Props = {
  entry: WheelEntry; official: boolean; message: string; celebrationEnabled: boolean; confettiEnabled: boolean; lightingEnabled: boolean;
  intensity: "subtle" | "normal" | "strong"; palette: string[]; canEdit: boolean; busy: boolean; onClose: () => void;
  onAction: (action: "keep" | "hide" | "remove" | "remove-matching") => void;
};

export function WinnerCelebration({ entry, official, message, celebrationEnabled, confettiEnabled, lightingEnabled, intensity, palette, canEdit, busy, onClose, onAction }: Props) {
  const dialog = useRef<HTMLDivElement>(null); const close = useRef<HTMLButtonElement>(null); const [effectsActive, setEffectsActive] = useState(true);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const particles = useMemo(() => {
    const count = reduced ? 0 : intensity === "strong" ? 148 : intensity === "normal" ? 96 : 44;
    const colours = ["#F3C928", "#B8182F", "#FFFDF3", "#6D3A93", ...palette];
    return Array.from({ length: count }, (_, index) => ({
      index,
      x: (index * 47 + (index % 5) * 7) % 101,
      delay: 100 + (index % 18) * 38,
      drift: ((index * 37) % 241) - 120,
      size: 6 + ((index * 5) % 7),
      duration: 2700 + ((index * 83) % 1500),
      colour: colours[index % colours.length],
      shape: index % 3 === 0 ? "diamond" : index % 3 === 1 ? "strip" : "rect",
      cannon: index % 6 === 0 ? "left" : index % 6 === 1 ? "right" : "stage",
    }));
  }, [intensity, palette, reduced]);
  useEffect(() => { const timer = window.setTimeout(() => setEffectsActive(false), intensity === "strong" ? 6200 : 5000); return () => window.clearTimeout(timer); }, [intensity]);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; const priorOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; close.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab" && dialog.current) trapFocus(event, dialog.current); }; document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); document.body.style.overflow = priorOverflow; previous?.focus(); }; }, [onClose]);
  const active = celebrationEnabled && effectsActive;
  return createPortal(<div className={`winner-backdrop celebration--${intensity}${active ? " is-celebrating" : ""}${lightingEnabled && active ? " has-lighting" : ""}`} role="presentation" style={{ "--winner-accent": palette[0] || "#F3C928" } as React.CSSProperties} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {active && lightingEnabled ? <div className={`winner-lightshow${reduced ? " is-static" : ""}`} aria-hidden="true"><div className="winner-lightshow__bloom" /><i /><i /><i /><i /><span /><span /><b /><b /><em /></div> : null}
    {active && confettiEnabled && !reduced ? <div className="winner-confetti" aria-hidden="true">{particles.map(({ index, x, delay, drift, size, duration, colour, shape, cannon }) => <i key={index} className={`is-${shape} from-${cannon}`} style={{ "--i": index, "--x": `${x}%`, "--delay": `${delay}ms`, "--drift": `${drift}px`, "--size": `${size}px`, "--duration": `${duration}ms`, "--confetti": colour } as React.CSSProperties} />)}</div> : null}
    <div ref={dialog} className="winner-dialog" role="dialog" aria-modal="true" aria-labelledby="winner-title" aria-describedby="winner-status winner-detail">
      <button ref={close} type="button" className="winner-dialog__close" onClick={onClose} aria-label="Close result">×</button>
      <div className="winner-dialog__mark" aria-hidden="true"><WheelsBrandMark /></div><p className={`draw-badge ${official ? "is-official" : ""}`}>{official ? "OFFICIAL DRAW · RECORDED" : "DEMO / NOT RECORDED"}</p>
      <p id="winner-status" className="eyebrow">{message.replace("{winner}", entry.label)}</p><h2 id="winner-title">{entry.label}</h2>
      <p id="winner-detail">{official ? "This result was selected and persisted by the Third Railify authority before the animation began." : "Demo result — not recorded as an official draw."}</p>
      {canEdit ? <div className="winner-actions"><button className="button button--secondary button--compact" type="button" onClick={() => onAction("keep")} disabled={busy}><CheckIcon /> Keep participant</button><button className="button button--ghost button--compact" type="button" onClick={() => onAction("hide")} disabled={busy}><EyeOffIcon /> Hide winner</button><button className="button button--danger-outline button--compact" type="button" onClick={() => onAction("remove")} disabled={busy}><TrashIcon /> Remove entry</button><button className="button button--danger button--compact" type="button" onClick={() => { if (window.confirm(`Remove every entry labelled “${entry.label}”?`)) onAction("remove-matching"); }} disabled={busy}><TrashIcon /> Remove all matching</button></div> : null}
    </div>
  </div>, document.body);
}

function trapFocus(event: KeyboardEvent, root: HTMLElement) { const focusable = [...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]; if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
