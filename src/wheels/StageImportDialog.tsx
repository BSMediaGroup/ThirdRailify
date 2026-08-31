import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { EphemeralNotices } from "../components/EphemeralNotices";
import { createStage, getCreatorAccess, getWheel } from "./client";
import {
  ImportedWheelCreationError,
  createImportedWheel,
  persistImportedWheelMedia,
} from "./importCreation";
import {
  createMultiWheelImportPlan,
  preflightMultiWheelImport,
} from "./multiWheelImport.mjs";
import {
  parseWheelImport,
  THIRD_RAIL_GOLD_CONFIG,
  WHEEL_FILE_LIMITS,
  type WheelImportProposal,
  type WheelImportResult,
} from "./portable.mjs";
import { parsePortableStage, STAGE_FILE_MAX_BYTES } from "./stagePortable.mjs";
import type { AccessibleWheelSummary, Stage } from "./types";
import { useModalDialog } from "./dialog";
import { CloseIcon } from "../components/Icons";
import { WheelsBrandMark } from "./WheelsBrandMark";
import { applyPaletteStylesToEntries } from "./segmentStyles.mjs";
import { hasPaletteRepairs } from "./paletteNormalization.mjs";
import "../styles/wheels-hotfix.css";

type TwsResult = Awaited<ReturnType<typeof parsePortableStage>>;
type Props = {
  csrfToken: string;
  accessible: AccessibleWheelSummary[];
  onClose: () => void;
  onLoadStage: (
    title: string,
    description: string,
    wheelSlugs: string[],
  ) => void;
  onImportedWheels: (wheelSlugs: string[]) => void;
  onCreatedStages: (stages: Stage[]) => void;
};

export function StageImportDialog({
  csrfToken,
  accessible,
  onClose,
  onLoadStage,
  onImportedWheels,
  onCreatedStages,
}: Props) {
  const [wheelResult, setWheelResult] = useState<WheelImportResult | null>(
    null,
  );
  const [twsResult, setTwsResult] = useState<TwsResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [resetPalettes, setResetPalettes] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"individual" | "stages">("individual");
  const [baseTitle, setBaseTitle] = useState("");
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const requestClose = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  useModalDialog(root, close, requestClose);
  const created = useRef(
    new Map<number, { slug: string; mediaReady: boolean }>(),
  );
  const createdStages = useRef(new Map<number, Stage>());
  const plan = useMemo(
    () =>
      wheelResult
        ? createMultiWheelImportPlan(wheelResult, {
            mode,
            selectedIndexes: [...selected],
            baseTitle,
          })
        : null,
    [baseTitle, mode, selected, wheelResult],
  );
  const read = async (file: File) => {
    setError("");
    setNotice("");
    if (
      file.size > Math.max(STAGE_FILE_MAX_BYTES, WHEEL_FILE_LIMITS.fileBytes)
    ) {
      setError("The selected file is too large.");
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (/\.tws$/i.test(file.name)) {
        const parsed = await parsePortableStage(bytes, {
          sourceName: file.name,
          defaultConfig: THIRD_RAIL_GOLD_CONFIG,
        });
        setTwsResult(parsed);
        setWheelResult(null);
        setMappings(
          Object.fromEntries(
            parsed.proposals.map((item) => [item.key, "create"]),
          ),
        );
        setResetPalettes(new Set());
        setNotice(
          "Stage integrity verified. Map or create each embedded Wheel before loading.",
        );
      } else {
        const parsed = await parseWheelImport(bytes, {
          sourceName: file.name,
          defaultConfig: THIRD_RAIL_GOLD_CONFIG,
        });
        setWheelResult(parsed);
        setTwsResult(null);
        setSelected(new Set(parsed.proposals.map((_, index) => index)));
        setResetPalettes(new Set());
        setBaseTitle(
          parsed.topLevelTitle ||
            file.name.replace(/\.(?:wheel|json|twl)$/i, ""),
        );
        setNotice(
          `${parsed.proposals.length} Wheel configuration${parsed.proposals.length === 1 ? "" : "s"} parsed. Preview created zero records.`,
        );
      }
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  };
  const ensureCreated = async (
    proposal: WheelImportProposal,
    index: number,
  ) => {
    proposal = resetPalettes.has(index) ? resetProposalPalette(proposal) : proposal;
    const existing = created.current.get(index);
    if (existing) {
      if (!existing.mediaReady) {
        const wheel = await persistImportedWheelMedia(
          (await getWheel(existing.slug, { force: true })).wheel,
          proposal,
          csrfToken,
        );
        created.current.set(index, { slug: wheel.slug, mediaReady: true });
        return wheel.slug;
      }
      return existing.slug;
    }
    try {
      const wheel = await createImportedWheel(proposal, csrfToken, (value) =>
        created.current.set(index, { slug: value.slug, mediaReady: false }),
      );
      created.current.set(index, { slug: wheel.slug, mediaReady: true });
      return wheel.slug;
    } catch (reason) {
      if (reason instanceof ImportedWheelCreationError)
        created.current.set(index, {
          slug: reason.createdWheel.slug,
          mediaReady: false,
        });
      throw reason;
    }
  };
  const confirmWheels = async () => {
    if (!wheelResult || !plan) return;
    setBusy(true);
    setError("");
    try {
      const allowance = await getCreatorAccess();
      const preflight = preflightMultiWheelImport(plan, allowance);
      if (!preflight.ok)
        throw new Error(
          `Creator allowance is insufficient: ${preflight.wheelsNeeded} Wheels / ${preflight.wheelsAvailable} available; ${preflight.stagesNeeded} Stages / ${preflight.stagesAvailable} available.`,
        );
      const slugs = [];
      for (const item of plan.wheels)
        slugs.push(await ensureCreated(item.proposal, item.sourceIndex));
      if (mode === "individual") {
        onImportedWheels(slugs);
        setNotice(
          `${slugs.length} imported Wheel${slugs.length === 1 ? "" : "s"} created. They remain hidden until explicitly published.`,
        );
        onClose();
        return;
      }
      const stages = [];
      let offset = 0;
      for (let index = 0; index < plan.stages.length; index += 1) {
        const complete = createdStages.current.get(index);
        if (complete) {
          stages.push(complete);
          offset += plan.stages[index].wheels.length;
          continue;
        }
        const count = plan.stages[index].wheels.length;
        const payload = await createStage(
          {
            title: plan.stages[index].title,
            description:
              "Imported from a multi-configuration Wheel of Names file.",
            visibility: "private",
            wheelSlugs: slugs.slice(offset, offset + count),
          },
          csrfToken,
        );
        createdStages.current.set(index, payload.stage);
        stages.push(payload.stage);
        offset += count;
      }
      onCreatedStages(stages);
      onClose();
    } catch (reason) {
      setError(
        `${message(reason)} Created child records are retained and retry resumes remaining work.`,
      );
    } finally {
      setBusy(false);
    }
  };
  const confirmTws = async () => {
    if (!twsResult) return;
    setBusy(true);
    setError("");
    try {
      const createCount = twsResult.proposals.filter(
        (item) => mappings[item.key] === "create",
      ).length;
      const allowance = await getCreatorAccess();
      const available = allowance.isMasterAdmin
        ? Number.POSITIVE_INFINITY
        : Number(allowance.maximumOwnedWheels || 0) -
          Number(allowance.ownedWheelCount || 0);
      if (createCount > available)
        throw new Error(
          `This import needs ${createCount} new Wheels but only ${available} are available.`,
        );
      const slugs = [];
      for (let index = 0; index < twsResult.proposals.length; index += 1) {
        const item = twsResult.proposals[index];
        const mapping = mappings[item.key] || "create";
        if (mapping.startsWith("map:")) slugs.push(mapping.slice(4));
        else slugs.push(await ensureCreated(item.proposal, index));
      }
      onLoadStage(twsResult.title, twsResult.description, slugs);
      onClose();
    } catch (reason) {
      setError(
        `${message(reason)} Created child records are retained and retry resumes remaining work.`,
      );
    } finally {
      setBusy(false);
    }
  };
  const manifest =
    wheelResult?.proposals.map((proposal, index) => ({
      key: `wheel-${proposal.sourceIndex}`,
      proposal,
      selected: selected.has(index),
      index,
    })) ||
    twsResult?.proposals.map((item, index) => ({
      key: item.key,
      proposal: item.proposal,
      selected: true,
      index,
    })) ||
    [];
  const sourceName = wheelResult?.sourceName || twsResult?.sourceName || "";
  const fileInput = (
    <input
      type="file"
      accept=".tws,.twl,.json,.wheel,application/json,application/vnd.thirdrailify.stage+json"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.currentTarget.value = "";
        if (file) void read(file);
      }}
    />
  );
  return createPortal(
    <div
      className="wheel-modal-backdrop stage-import-backdrop"
      role="presentation"
    >
      <div
        ref={root}
        className="wheel-modal stage-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-import-title"
      >
        <header className="wheel-modal__header">
          <div>
            <p className="eyebrow">STAGE PORTABILITY</p>
            <h2 id="stage-import-title">Import Wheels or Stage</h2>
            <span>.tws · .twl · .json · Wheel of Names .wheel</span>
          </div>
          <button
            ref={close}
            type="button"
            disabled={busy}
            onClick={requestClose}
            aria-label="Close Stage import"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="stage-import-dialog__body">
          {manifest.length ? (
            <section
              className="stage-import-manifest"
              aria-label="Pending Wheel import preview"
            >
              <header>
                <div>
                  <p className="eyebrow">FILE READY · ZERO RECORDS CREATED</p>
                  <strong>{sourceName}</strong>
                  <span>
                    {manifest.length} Wheel{manifest.length === 1 ? "" : "s"}{" "}
                    detected and waiting for confirmation.
                  </span>
                </div>
                <label className="stage-import-replace">
                  Replace file{fileInput}
                </label>
              </header>
              <div className="stage-import-wheel-gallery" role="list">
                {manifest.map((item) => (
                  <article
                    key={item.key}
                    className={item.selected ? "is-selected" : "is-excluded"}
                    role="listitem"
                  >
                    <div
                      className="stage-import-wheel-icon"
                      style={
                        {
                          "--import-wheel-palette": wheelGradient(
                            item.proposal,
                          ),
                        } as CSSProperties
                      }
                    >
                      <span>
                        <WheelsBrandMark />
                      </span>
                    </div>
                    <div>
                      <strong>{item.proposal.title}</strong>
                      <small>
                        {item.proposal.entries.length} entries · weight{" "}
                        {item.proposal.summary.totalWeight}
                      </small>
                      <span>
                        {item.proposal.summary.mediaDetected
                          ? "Media included"
                          : "No media"}
                      </span>
                    </div>
                    {wheelResult ? (
                      <button
                        type="button"
                        aria-pressed={item.selected}
                        onClick={() =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(item.index)) next.delete(item.index);
                            else next.add(item.index);
                            return next;
                          })
                        }
                      >
                        {item.selected ? "Included" : "Excluded"}
                      </button>
                    ) : (
                      <span className="stage-import-wheel-state">Embedded</span>
                    )}
                    {hasPaletteRepairs(item.proposal.messages) ? <fieldset className="wheel-import-palette-choice"><legend>Palette repaired</legend><label><input type="radio" name={`stage-import-palette-${item.index}`} checked={!resetPalettes.has(item.index)} onChange={() => setResetPalettes((current) => { const next = new Set(current); next.delete(item.index); return next; })} /> Use normalized palette</label><label><input type="radio" name={`stage-import-palette-${item.index}`} checked={resetPalettes.has(item.index)} onChange={() => setResetPalettes((current) => new Set(current).add(item.index))} /> Reset to Third Rail Gold</label></fieldset> : <span className="stage-import-wheel-state">Palette canonical</span>}
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <label className="wheel-drop-zone stage-import-drop">
              <WheelsBrandMark />
              <strong>Choose a portable Wheel or Stage file</strong>
              <span>
                Preview and full validation happen before any record is created.
              </span>
              <b>Browse files</b>
              {fileInput}
            </label>
          )}
          {wheelResult ? (
            <section className="stage-import-plan">
              <header>
                <div>
                  <p className="eyebrow">MULTI-WHEEL IMPORT PLAN</p>
                  <h3>{wheelResult.topLevelTitle || wheelResult.sourceName}</h3>
                </div>
                <strong>
                  {selected.size} / {wheelResult.proposals.length} selected
                </strong>
              </header>
              <div className="stage-import-mode">
                <label>
                  <input
                    type="radio"
                    checked={mode === "individual"}
                    onChange={() => setMode("individual")}
                  />{" "}
                  Import as individual Wheels
                </label>
                <label>
                  <input
                    type="radio"
                    checked={mode === "stages"}
                    onChange={() => setMode("stages")}
                  />{" "}
                  Import as Stage(s)
                </label>
              </div>
              {mode === "stages" ? (
                <label>
                  Stage base title
                  <input
                    value={baseTitle}
                    maxLength={100}
                    onChange={(event) => setBaseTitle(event.target.value)}
                  />
                </label>
              ) : null}
              <div className="stage-import-configs">
                {wheelResult.proposals.map((proposal, index) => (
                  <label key={proposal.sourceIndex}>
                    <input
                      type="checkbox"
                      checked={selected.has(index)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(index);
                          else next.delete(index);
                          return next;
                        })
                      }
                    />
                    <span>
                      <strong>{proposal.title}</strong>
                      <small>
                        {proposal.entries.length} entries · total weight{" "}
                        {proposal.summary.totalWeight} ·{" "}
                        {proposal.summary.mediaDetected ? "media" : "no media"}{" "}
                        ·{" "}
                        {
                          proposal.messages.filter(
                            (item) => item.severity === "warning",
                          ).length
                        }{" "}
                        warnings
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              {plan?.stages.length ? (
                <ol className="stage-import-splits">
                  {plan.stages.map((stage) => (
                    <li key={stage.title}>
                      <strong>{stage.title}</strong>
                      <span>{stage.wheels.length} Wheels</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              <button
                className="button button--primary"
                type="button"
                disabled={busy || !selected.size}
                onClick={() => void confirmWheels()}
              >
                {busy
                  ? "Creating…"
                  : mode === "stages"
                    ? "Confirm and create Stage(s)"
                    : "Confirm and create Wheels"}
              </button>
            </section>
          ) : null}
          {twsResult ? (
            <section className="stage-import-plan">
              <header>
                <div>
                  <p className="eyebrow">
                    INTEGRITY VERIFIED · PRIVATE DEFAULT
                  </p>
                  <h3>{twsResult.title}</h3>
                </div>
                <strong>{twsResult.proposals.length} Wheels</strong>
              </header>
              <p>{twsResult.description || "No Stage description."}</p>
              <div className="stage-tws-mappings">
                {twsResult.proposals.map((item) => (
                  <label key={item.key}>
                    <span>
                      <strong>{item.proposal.title}</strong>
                      <small>{item.proposal.entries.length} entries</small>
                    </span>
                    <select
                      value={mappings[item.key] || "create"}
                      onChange={(event) =>
                        setMappings((current) => ({
                          ...current,
                          [item.key]: event.target.value,
                        }))
                      }
                    >
                      <option value="create">Create imported copy</option>
                      {accessible.map((wheel) => (
                        <option key={wheel.slug} value={`map:${wheel.slug}`}>
                          Map to {wheel.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                className="button button--primary"
                type="button"
                disabled={busy}
                onClick={() => void confirmTws()}
              >
                {busy ? "Preparing…" : "Load private Stage draft"}
              </button>
            </section>
          ) : null}
          <EphemeralNotices notice={notice} error={error} noticeTitle="Stage import ready" errorTitle="Stage import unavailable" onDismissNotice={() => setNotice("")} onDismissError={() => setError("")} />
        </div>
        <footer className="wheel-modal__footer">
          <button
            className="button button--secondary"
            type="button"
            disabled={busy}
            onClick={requestClose}
          >
            Return to Stage editor
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function message(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "The import could not be completed.";
}

function resetProposalPalette(proposal: WheelImportProposal): WheelImportProposal {
  const styles = THIRD_RAIL_GOLD_CONFIG.paletteStyles!.map((style) => ({ ...style }));
  return { ...proposal, config: { ...proposal.config, themePreset: "third-rail-gold", palette: [...THIRD_RAIL_GOLD_CONFIG.palette], paletteStyles: styles, pointerAccent: THIRD_RAIL_GOLD_CONFIG.pointerAccent }, entries: applyPaletteStylesToEntries(proposal.entries, styles) };
}
function wheelGradient(proposal: WheelImportProposal) {
  const palette = proposal.config.palette?.length
    ? proposal.config.palette
    : ["#f3c928", "#b8182f", "#f3f0e5", "#20201a"];
  const colours = proposal.entries
    .slice(0, 12)
    .map((entry, index) => entry.colour || palette[index % palette.length]);
  const slices = colours.length ? colours : palette;
  const step = 100 / slices.length;
  return `conic-gradient(${slices.map((colour, index) => `${colour} ${index * step}% ${(index + 1) * step}%`).join(",")})`;
}
