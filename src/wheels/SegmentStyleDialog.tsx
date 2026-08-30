import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WheelMediaAsset } from "./types";
import { SEGMENT_PATTERN_IDS, SEGMENT_PATTERN_LABELS, normalizeSegmentStyle, type SegmentStyle } from "./segmentStyles.mjs";
import { useModalDialog } from "./dialog";

export function SegmentStyleDialog({ label, value, media, previewUrls = {}, onFile, onApply, onClose }: { label: string; value: SegmentStyle; media: WheelMediaAsset[]; previewUrls?: Record<string, string>; onFile: (file: File) => string; onApply: (style: SegmentStyle) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<SegmentStyle>(() => normalizeSegmentStyle(value)); const [error, setError] = useState("");
  const root = useRef<HTMLElement>(null); const close = useRef<HTMLButtonElement>(null); useModalDialog(root, close, onClose);
  const color = draft.color;
  const mode = draft.mode;
  const setMode = (next: SegmentStyle["mode"]) => { if (next === "solid") setDraft({ mode: "solid", color }); else if (next === "pattern") setDraft({ mode: "pattern", color, pattern: "diagonal-stripes", patternColor: "#FFFFFF" }); else { const first = media[0]; if (first) setDraft({ mode: "image", color, imageAssetId: first.id }); else setError("Upload a segment image before selecting Image fill."); } };
  const setColor = (next: string) => { if (!/^#[0-9a-f]{6}$/i.test(next)) return; setDraft((current) => ({ ...current, color: next.toUpperCase() })); };
  const apply = () => { try { onApply(normalizeSegmentStyle(draft)); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : "The segment style is invalid."); } };
  return createPortal(<div className="segment-style-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={root} className="segment-style-dialog" role="dialog" aria-modal="true" aria-labelledby="segment-style-title">
    <header><div><p className="eyebrow">WHEEL APPEARANCE</p><h3 id="segment-style-title">Segment style</h3><small>{label}</small></div><button ref={close} type="button" onClick={onClose} aria-label="Close segment style">×</button></header>
    <SegmentStylePreview style={draft} media={media} previewUrls={previewUrls} label={`${label} fill preview`} />
    <fieldset className="segment-style-modes"><legend>Fill</legend>{(["solid", "pattern", "image"] as const).map((item) => <label key={item}><input type="radio" name="segment-fill-mode" checked={mode === item} onChange={() => setMode(item)} /><span>{item}</span></label>)}</fieldset>
    <div className="segment-style-fields"><label><span>Base colour</span><span className="segment-style-colour"><input aria-label={`Base colour for ${label}`} type="color" value={color} onChange={(event) => setColor(event.target.value)} /><HexTextInput label={`Base colour hex for ${label}`} value={color} onValid={setColor} /></span></label>
      {mode === "pattern" ? <><label><span>Pattern</span><select aria-label={`Pattern for ${label}`} value={draft.pattern} onChange={(event) => setDraft({ ...draft, pattern: event.target.value as typeof draft.pattern })}>{SEGMENT_PATTERN_IDS.map((id) => <option key={id} value={id}>{SEGMENT_PATTERN_LABELS[id]}</option>)}</select></label><label><span>Pattern colour</span><span className="segment-style-colour"><input aria-label={`Pattern colour for ${label}`} type="color" value={draft.patternColor} onChange={(event) => setDraft({ ...draft, patternColor: event.target.value.toUpperCase() })} /><HexTextInput label={`Pattern colour hex for ${label}`} value={draft.patternColor} onValid={(value) => setDraft({ ...draft, patternColor: value })} /></span></label></> : null}
      {mode === "image" ? <div className="segment-style-image-fields"><label><span>Wheel image</span><select aria-label={`Segment image for ${label}`} value={draft.imageAssetId} onChange={(event) => setDraft({ ...draft, imageAssetId: event.target.value })}>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.fileName || `${asset.contentType} · ${Math.round(asset.byteSize / 1024)} KiB`}</option>)}</select></label><p>Image fills crop to cover the wheel segment.</p><button type="button" onClick={() => setDraft({ mode: "solid", color })}>Remove image</button></div> : null}
      <label className="segment-style-upload"><span>{mode === "image" ? "Upload / Change" : "Upload image fill"}</span><input aria-label={`Upload segment image for ${label}`} type="file" accept=".svg,.bmp,.jpg,.jpeg,.gif,.webp,.png,image/svg+xml,image/bmp,image/jpeg,image/gif,image/webp,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { setError("Segment images must be 2 MiB or smaller; SVG and static formats have stricter server limits."); return; } const id = onFile(file); setDraft({ mode: "image", color, imageAssetId: id }); setError(""); }} /><small>SVG ≤ 512 KiB · static raster ≤ 1.5 MiB · GIF ≤ 2 MiB · up to 2048×2048.</small></label>
    </div>
    {error ? <p className="wheel-alert" role="alert">{error}</p> : null}<footer><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><button type="button" className="button button--primary" onClick={apply}>Apply style</button></footer>
  </section></div>, document.body);
}

function HexTextInput({ label, value, onValid }: { label: string; value: string; onValid: (value: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return <input aria-label={label} value={text} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => { const next = event.target.value; setText(next); if (/^#[0-9a-f]{6}$/i.test(next)) onValid(next.toUpperCase()); }} onBlur={() => setText(value)} />;
}

export function SegmentStylePreview({ style, media, previewUrls = {}, label = "Segment fill preview" }: { style: SegmentStyle; media: WheelMediaAsset[]; previewUrls?: Record<string, string>; label?: string }) {
  const source = style.mode === "image" ? previewUrls[style.imageAssetId] || media.find((asset) => asset.id === style.imageAssetId)?.url : "";
  return <span className={`segment-style-preview is-${style.mode}${style.mode === "pattern" ? ` pattern-${style.pattern}` : ""}`} style={{ "--segment-base": style.color, "--segment-pattern": style.mode === "pattern" ? style.patternColor : style.color } as React.CSSProperties} role="img" aria-label={label}>{source ? <img src={source} alt="" /> : null}{style.mode === "pattern" && style.pattern === "third-rail-bolts" ? <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 21H9L34 3l-6 15h9l-7 10h9L14 45l6-15h-9z" /></svg> : null}</span>;
}
