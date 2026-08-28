import { useEffect, useRef } from "react";
import type { WheelEntry } from "./types";

type Props = { entry: WheelEntry; official: boolean; message: string; intensity: "off" | "restrained" | "full"; canEdit: boolean; busy: boolean; onClose: () => void; onAction: (action: "keep" | "hide" | "remove" | "remove-matching") => void };

export function WinnerCelebration({ entry, official, message, intensity, canEdit, busy, onClose, onAction }: Props) {
  const dialog = useRef<HTMLDivElement>(null); const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; close.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab" && dialog.current) trapFocus(event, dialog.current); }; document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); previous?.focus(); }; }, [onClose]);
  return <div className={`winner-backdrop celebration--${intensity}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {intensity === "full" ? <div className="winner-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ "--i": index, "--x": `${(index * 47) % 101}%`, "--delay": `${(index % 9) * 45}ms` } as React.CSSProperties} />)}</div> : null}
    <div ref={dialog} className="winner-dialog" role="dialog" aria-modal="true" aria-labelledby="winner-title" aria-describedby="winner-status">
      <button ref={close} type="button" className="winner-dialog__close" onClick={onClose} aria-label="Close result">×</button>
      <div className="winner-dialog__bolt" aria-hidden="true">ϟ</div><p className={`draw-badge ${official ? "is-official" : ""}`}>{official ? "OFFICIAL DRAW · RECORDED" : "DEMO / NOT RECORDED"}</p>
      <p id="winner-status" className="eyebrow">{message.replace("{winner}", entry.label)}</p><h2 id="winner-title">{entry.label}</h2>
      <p>{official ? "This result was selected and persisted by the Third Railify authority before the animation began." : "Demo result — not recorded as an official draw."}</p>
      {canEdit ? <div className="winner-actions"><button type="button" onClick={() => onAction("keep")} disabled={busy}>Keep participant</button><button type="button" onClick={() => onAction("hide")} disabled={busy}>Hide winner</button><button type="button" onClick={() => onAction("remove")} disabled={busy}>Remove entry</button><button type="button" className="danger" onClick={() => { if (window.confirm(`Remove every entry labelled “${entry.label}”?`)) onAction("remove-matching"); }} disabled={busy}>Remove all matching</button></div> : null}
    </div>
  </div>;
}

function trapFocus(event: KeyboardEvent, root: HTMLElement) { const focusable = [...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]; if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }

