import {
  effectiveAppearance,
  FEATURE_PRESETS,
} from "../lib/entrant-appearance.mjs";
import { entryDisplayLabel } from "../lib/entrant-label.mjs";
import { entryIdentityLabel } from "../lib/entrant-identity.mjs";
import { FeatureSlicePreview } from "../components/EntrantAppearanceControls";
import { EntrantAvatar } from "./EntrantAvatar";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "../components/Icons";
import { formatProbability, participantOdds } from "./engine.mjs";
import type { WheelConfig, WheelEntry } from "./types";

export function ParticipantDetails({
  entry,
  entries,
  config,
  trigger,
  onClose,
}: {
  entry: WheelEntry;
  entries: WheelEntry[];
  config: WheelConfig;
  trigger: HTMLElement | null;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const odds = participantOdds(entries, entry.id);
  const duplicates = entries.filter(
    (candidate) =>
      candidate.state === "active" && candidate.label === entry.label,
  ).length;
  const colour =
    entry.colour || config.palette[entry.order % config.palette.length];
  useEffect(() => {
    close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const pointer = (event: PointerEvent) => {
      if (
        root.current &&
        !root.current.contains(event.target as Node) &&
        event.target !== trigger
      )
        onClose();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", pointer);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", pointer);
      trigger?.focus();
    };
  }, [onClose, trigger]);
  const appearance = effectiveAppearance(entry);
  const displayLabel = entryDisplayLabel(
    entry,
    config.showEntrySuffix !== false,
  );
  return createPortal(
    <div
      ref={root}
      className="participant-detail"
      role="dialog"
      aria-modal="false"
      aria-labelledby="participant-detail-title"
    >
      <header>
        <div>
          <p>PARTICIPANT SIGNAL</p>
          <div className="participant-detail__identity">
            <EntrantAvatar url={entry.avatarUrl} />
            <h2 id="participant-detail-title">{displayLabel}</h2>
          </div>
        </div>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label="Close participant details"
        >
          <CloseIcon />
        </button>
      </header>
      <div className="participant-detail__chance">
        <i style={{ background: colour }} aria-hidden="true" />
        <div>
          <strong>{formatProbability(odds.probability)}</strong>
          <span>chance on the next spin</span>
        </div>
      </div>
      <dl>
        <div>
          <dt>Entry code</dt>
          <dd>{entry.code || "Not recorded"}</dd>
        </div>
        <div>
          <dt>Entry type</dt>
          <dd>{entryIdentityLabel(entry.identity)}</dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>
            {entry.provenance?.ruleName ||
              entry.provenance?.origin?.replaceAll("_", " ") ||
              "Legacy"}
          </dd>
        </div>
        <div>
          <dt>Eligibility</dt>
          <dd>
            {entry.state === "active"
              ? "Active / eligible"
              : "Hidden / not eligible"}
          </dd>
        </div>
        <div>
          <dt>Entry weight</dt>
          <dd>
            {entry.weight} of {odds.totalWeight}
          </dd>
        </div>
        <div>
          <dt>Segment share</dt>
          <dd>{formatProbability(odds.probability)}</dd>
        </div>
        <div>
          <dt>Eligible entries</dt>
          <dd>{odds.eligibleCount}</dd>
        </div>
      </dl>
      {duplicates > 1 ? (
        <p className="participant-detail__duplicate">
          This is one of {duplicates} separate entries named “{entry.label}”.
          Across all active entry types with this label:{" "}
          <b>{formatProbability(odds.combinedProbability)} combined chance</b> (
          {odds.combinedWeight} of {odds.totalWeight} total weight).
        </p>
      ) : null}
      {entry.appearance ? (
        <div className="participant-feature-summary">
          <FeatureSlicePreview value={appearance} />
          <p>Decorative appearance</p>
          <dl>
            <div>
              <dt>Preset</dt>
              <dd>
                {appearance.preset
                  ? FEATURE_PRESETS[appearance.preset]?.label ||
                    appearance.preset
                  : "Wheel default"}
              </dd>
            </div>
            <div>
              <dt>Feature badges</dt>
              <dd>
                {appearance.icons?.length
                  ? appearance.icons.join(", ")
                  : "None"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
      <p className="participant-detail__note">
        Current configured odds only. They change when entries, visibility, or
        weights change.
      </p>
    </div>,
    document.body,
  );
}
