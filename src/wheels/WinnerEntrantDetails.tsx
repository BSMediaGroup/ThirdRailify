import { effectiveAppearance, FEATURE_PRESETS } from '../lib/entrant-appearance.mjs';
import { entryIdentityLabel } from '../lib/entrant-identity.mjs';
import { FEATURE_PATHS } from '../lib/entrant-feature-drawing';
import { EntrantAvatar } from './EntrantAvatar';
import { participantOdds, formatProbability } from './engine.mjs';
import type { WheelEntry } from './types';
import './winner-entrant-details.css';

// Render the accepted winner snapshot, never a fresh lookup of a mutable entrant.
export function WinnerEntrantDetails({ entry, entries, titleId, compact = false }: { entry: WheelEntry; entries?: WheelEntry[]; titleId?: string; compact?: boolean }) {
  const feature = effectiveAppearance(entry);
  const icons = feature.icons || [];
  const Heading = compact ? 'h3' : 'h2';
  const effects = feature.effects;
  const odds = entries ? participantOdds(entries, entry.id) : null;
  const fill = feature.fill === null ? 'Wheel palette' : feature.fill?.colors.join(' / ') || (entry.style?.mode === 'image' ? 'Participant image' : entry.style?.mode === 'pattern' ? `Pattern: ${entry.style.pattern}` : entry.colour || entry.style?.color || 'Wheel palette');
  return <section className={`winner-entrant${compact ? ' winner-entrant--compact' : ''}`} aria-label="Winner participant details">
    <div className="winner-entrant__identity">
      <EntrantAvatar url={entry.avatarUrl} />
      {icons.length ? <span className="winner-entrant__icons" aria-label={`Feature icons: ${icons.join(', ')}`} role="img">{icons.map(icon => <svg key={icon} viewBox="0 0 24 24" aria-hidden="true"><path d={FEATURE_PATHS[icon]} fillRule="evenodd" /></svg>)}</span> : null}
      <Heading id={titleId} className="winner-entrant__name" title={entry.label}>{entry.label}</Heading>
    </div>
    <dl className="winner-entrant__facts">
      <div className="winner-entrant__full-name"><dt>Full name</dt><dd>{entry.label}</dd></div>
      <div className="winner-entrant__entry-type"><dt>Entry type</dt><dd>{entryIdentityLabel(entry.identity)}</dd></div>
      <div><dt>Entry weight</dt><dd>{entry.weight}{odds ? ` of ${odds.totalWeight}` : ''}</dd></div>
      <div><dt>Participant state</dt><dd>{entry.state === 'hidden' ? 'Hidden' : 'Active'}</dd></div>
      {odds ? <><div><dt>Segment share</dt><dd>{formatProbability(odds.probability)}</dd></div><div><dt>Eligible entries</dt><dd>{odds.eligibleCount}</dd></div></> : null}
      {entry.appearance ? <>
        <div><dt>Feature icons</dt><dd>{icons.length ? icons.join(', ') : 'None'}</dd></div>
        <div><dt>Preset</dt><dd>{feature.preset ? FEATURE_PRESETS[feature.preset]?.label || feature.preset : 'None'}</dd></div>
        <div className="winner-entrant__fill"><dt>Fill</dt><dd>{fill}</dd></div>
        <div><dt>Edge</dt><dd>{feature.edge ? `${feature.edge.placement} / ${feature.edge.color}` : 'None'}</dd></div>
        <div className="winner-entrant__effects"><dt>Effects</dt><dd>{effects?.kinds.length ? `${effects.kinds.join(', ')} (intensity ${effects.intensity}, speed ${effects.speed}, density ${effects.density})` : 'None'}</dd></div>
      </> : null}
    </dl>
  </section>;
}
