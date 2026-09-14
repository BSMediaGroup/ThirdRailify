import {
  effectiveAppearance,
  FEATURE_PRESETS,
} from "../lib/entrant-appearance.mjs";
import { entryDisplayLabel } from "../lib/entrant-label.mjs";
import { entryIdentityLabel } from "../lib/entrant-identity.mjs";
import { FEATURE_PATHS } from "../lib/entrant-feature-drawing";
import { FeatureSlicePreview } from "../components/EntrantAppearanceControls";
import { EntrantAvatar } from "./EntrantAvatar";
import { participantOdds, formatProbability } from "./engine.mjs";
import type { WheelEntry } from "./types";
import "./winner-entrant-details.css";

// Render the accepted winner snapshot, never a fresh lookup of a mutable entrant.
export function WinnerEntrantDetails({
  entry,
  entries,
  titleId,
  compact = false,
}: {
  entry: WheelEntry;
  entries?: WheelEntry[];
  titleId?: string;
  compact?: boolean;
}) {
  const feature = effectiveAppearance(entry);
  const icons = feature.icons || [];
  const Heading = compact ? "h3" : "h2";
  const odds = entries ? participantOdds(entries, entry.id) : null;
  const displayLabel = entryDisplayLabel(entry);
  const suffix = entry.suffix?.trim() || "";
  return (
    <section
      className={`winner-entrant${compact ? " winner-entrant--compact" : ""}`}
      aria-label="Winner participant details"
    >
      <div className="winner-entrant__identity">
        <EntrantAvatar url={entry.avatarUrl} />
        <Heading
          id={titleId}
          className="winner-entrant__name"
          title={displayLabel}
        >
          <span className="winner-entrant__base-name">{entry.label}</span>
          {suffix ? (
            <span className="winner-entrant__suffix" aria-hidden="true">
              {suffix}
            </span>
          ) : null}
        </Heading>
        {icons.length ? (
          <span
            className="winner-entrant__icons"
            aria-label={`Feature icons: ${icons.join(", ")}`}
            role="img"
          >
            {icons.map((icon) => (
              <svg key={icon} viewBox="0 0 24 24" aria-hidden="true">
                <path d={FEATURE_PATHS[icon]} fillRule="evenodd" />
              </svg>
            ))}
          </span>
        ) : null}
      </div>
      <dl className="winner-entrant__facts">
        <div className="winner-entrant__full-name">
          <dt>Full name</dt>
          <dd>{displayLabel}</dd>
        </div>
        <div>
          <dt>Entry code</dt>
          <dd>{entry.code || "Not recorded"}</dd>
        </div>
        <div className="winner-entrant__entry-type">
          <dt>Entry type</dt>
          <dd>{entryIdentityLabel(entry.identity)}</dd>
        </div>
        <div>
          <dt>Entry weight</dt>
          <dd>
            {entry.weight}
            {odds ? ` of ${odds.totalWeight}` : ""}
          </dd>
        </div>
        <div>
          <dt>Participant state</dt>
          <dd>{entry.state === "hidden" ? "Hidden" : "Active"}</dd>
        </div>
        {odds ? (
          <>
            <div>
              <dt>Segment share</dt>
              <dd>{formatProbability(odds.probability)}</dd>
            </div>
            <div>
              <dt>Eligible entries</dt>
              <dd>{odds.eligibleCount}</dd>
            </div>
          </>
        ) : null}
        {entry.appearance ? (
          <>
            <div>
              <dt>Preset</dt>
              <dd>
                {feature.preset
                  ? FEATURE_PRESETS[feature.preset]?.label || feature.preset
                  : "None"}
              </dd>
            </div>
            <div>
              <dt>Features</dt>
              <dd>{icons.length ? icons.join(", ") : "No feature badges"}</dd>
            </div>
          </>
        ) : null}
      </dl>
      <div className="winner-entrant__appearance">
        <FeatureSlicePreview value={feature} />
        <div>
          <small>SLICE IDENTITY</small>
          <strong>
            {feature.preset
              ? FEATURE_PRESETS[feature.preset]?.label || feature.preset
              : "Wheel default"}
          </strong>
          <span>
            {icons.length
              ? `${icons.length} feature badge${icons.length === 1 ? "" : "s"}`
              : "No feature badges"}
          </span>
        </div>
      </div>
    </section>
  );
}
