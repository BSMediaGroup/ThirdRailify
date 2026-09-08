import { effectiveAppearance } from '../lib/entrant-appearance.mjs';
import { entryIdentityLabel } from '../lib/entrant-identity.mjs';
import { FeatureSlicePreview } from '../components/EntrantAppearanceControls';
import { EntrantAvatar } from "./EntrantAvatar";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "../components/Icons";
import { formatProbability, participantOdds } from "./engine.mjs";
import type { WheelConfig, WheelEntry } from "./types";

export function ParticipantDetails({ entry, entries, config, trigger, onClose }: { entry: WheelEntry; entries: WheelEntry[]; config: WheelConfig; trigger: HTMLElement | null; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null); const close = useRef<HTMLButtonElement>(null); const odds = participantOdds(entries, entry.id); const duplicates = entries.filter((candidate) => candidate.state === "active" && candidate.label === entry.label).length;
  const colour = entry.colour || config.palette[entry.order % config.palette.length];
  useEffect(() => {
    close.current?.focus();
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const pointer = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node) && event.target !== trigger) onClose(); };
    document.addEventListener("keydown", key); document.addEventListener("pointerdown", pointer);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", pointer); trigger?.focus(); };
  }, [onClose, trigger]);
  return createPortal(<div ref={root} className="participant-detail" role="dialog" aria-modal="false" aria-labelledby="participant-detail-title">
    <header><div><p>PARTICIPANT SIGNAL</p><div className="participant-detail__identity"><EntrantAvatar url={entry.avatarUrl} /><h2 id="participant-detail-title">{entry.label}</h2></div></div><button ref={close} type="button" onClick={onClose} aria-label="Close participant details"><CloseIcon /></button></header>
    <div className="participant-detail__chance"><i style={{ background: colour }} aria-hidden="true" /><div><strong>{formatProbability(odds.probability)}</strong><span>chance on the next spin</span></div></div>
    <dl><div><dt>Entry type</dt><dd>{entryIdentityLabel(entry.identity)}</dd></div><div><dt>Eligibility</dt><dd>{entry.state === "active" ? "Active / eligible" : "Hidden / not eligible"}</dd></div><div><dt>Entry weight</dt><dd>{entry.weight} of {odds.totalWeight}</dd></div><div><dt>Segment share</dt><dd>{formatProbability(odds.probability)}</dd></div><div><dt>Eligible entries</dt><dd>{odds.eligibleCount}</dd></div></dl>
    {duplicates > 1 ? <p className="participant-detail__duplicate">This is one of {duplicates} separate entries named “{entry.label}”. Across all active entry types with this label: <b>{formatProbability(odds.combinedProbability)} combined chance</b> ({odds.combinedWeight} of {odds.totalWeight} total weight).</p> : null}
    {entry.appearance ? <div className="participant-feature-summary"><FeatureSlicePreview value={effectiveAppearance(entry)} /><p>Decorative appearance</p><dl>{Object.entries(effectiveAppearance(entry)).filter(([key]) => key !== 'sources').map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null || Array.isArray(value) && !value.length ? 'None / Wheel default' : typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : 'colors' in value ? value.colors.join(' / ') : 'kinds' in value ? `${value.kinds.join(', ')} (intensity ${value.intensity}, speed ${value.speed}, density ${value.density})` : 'placement' in value ? `${value.placement} ${value.color}` : 'Inherited'} / {effectiveAppearance(entry).sources[key as keyof ReturnType<typeof effectiveAppearance>['sources']]}</dd></div>)}</dl></div> : null}
    <p className="participant-detail__note">Current configured odds only. They change when entries, visibility, or weights change.</p>
  </div>, document.body);
}
