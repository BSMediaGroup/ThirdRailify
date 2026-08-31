import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  BackIcon,
  EditIcon,
  FullscreenIcon,
  OfficialIcon,
  PracticeIcon,
  SoundIcon,
} from "../components/Icons";
import {
  getStage,
  getWheelMechanics,
  officialSpin,
  officialSpinAll,
  type ApiError,
} from "../wheels/client";
import {
  selectWeightedEntry,
  spinPlan,
  type WheelSpinPlan,
} from "../wheels/engine.mjs";
import {
  computeStageLayout,
  type StageDirection,
} from "../wheels/stageLayout.mjs";
import {
  spinSoundProfile,
  winnerSoundProfile,
} from "../wheels/soundPresets.mjs";
import {
  StageWinnerCelebration,
  type StageResultMode,
  type StageWinnerResult,
} from "../wheels/StageWinnerCelebration";
import {
  aggregateStageCelebration,
  stageAudioGain,
} from "../wheels/stageSpinAll.mjs";
import type {
  Stage,
  StageAccess,
  StageWheel,
  WheelEntry,
} from "../wheels/types";
import { WheelCanvas } from "../wheels/WheelCanvas";
import { StageEditorDialog } from "../wheels/StageEditorDialog";
import { WheelsBrandMark } from "../wheels/WheelsBrandMark";
import { WheelOwnerDetails } from "../wheels/WheelOwnerDetails";
import "../styles/wheels.css";
import "../styles/wheels-stage.css";
import "../styles/wheels-stage-v11.css";
import "../styles/wheels-v110.css";
import "../styles/wheels-v111.css";

type StagePhase =
  | "idle"
  | "preflighting"
  | "spinning_all"
  | "waiting_for_settlement"
  | "showing_combined_results"
  | "error";
type SpinSource = "individual" | "spin-all";
type SpinResult = {
  entry: WheelEntry;
  official: boolean;
  mode: StageResultMode;
};
type SpinState = {
  rotation: number;
  animation: WheelSpinPlan | null;
  spinning: boolean;
  requesting: boolean;
  result: SpinResult | null;
  substate: "ready" | "spinning" | "settled" | "failed";
  source: SpinSource | null;
};
type PendingSpin = SpinResult & {
  source: SpinSource;
  wheel: NonNullable<StageWheel["wheel"]>;
};
type PreflightIssue = { wheel: string; code: string; message: string };

export function WheelStagePage({
  create = false,
  editorRequested = false,
}: {
  create?: boolean;
  editorRequested?: boolean;
}) {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { account, csrfToken, openAuth } = useAuth();
  const [stage, setStage] = useState<Stage | null>(null);
  const [access, setAccess] = useState<StageAccess | null>(null);
  const [loading, setLoading] = useState(!create);
  const [error, setError] = useState("");
  const [soundMuted, setSoundMuted] = useState(false);
  const [activeSpin, setActiveSpin] = useState<number | null>(null);
  const [spins, setSpins] = useState<Record<number, SpinState>>({});
  const [modes, setModes] = useState<Record<number, "practice" | "official">>(
    {},
  );
  const [transition, setTransition] = useState<{
    direction: StageDirection | "overview";
    key: number;
  } | null>(null);
  const [phase, setPhase] = useState<StagePhase>("idle");
  const [batchMode, setBatchMode] = useState<"practice" | "official">(
    "practice",
  );
  const [combinedResults, setCombinedResults] = useState<
    StageWinnerResult[] | null
  >(null);
  const [preflightIssues, setPreflightIssues] = useState<
    PreflightIssue[] | null
  >(null);
  const pending = useRef(new Map<number, PendingSpin>());
  const settled = useRef(new Set<number>());
  const revealTimer = useRef<number | null>(null);
  const batchKey = useRef<string | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const spinAllButton = useRef<HTMLButtonElement>(null);
  const audio = useStageAudio();
  const [size, setSize] = useState({
    width: Math.max(320, window.innerWidth - 32),
    height: Math.max(520, window.innerHeight - 72),
  });
  useEffect(() => {
    if (create) return;
    let active = true;
    setLoading(true);
    getStage(slug)
      .then((payload) => {
        if (!active) return;
        setStage(payload.stage);
        setAccess(payload.access);
        setError("");
        document.title = `${payload.stage.title} Stage · Third Railify`;
      })
      .catch((reason) => active && setError(message(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [create, slug]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage, loading]);
  useEffect(
    () => () => {
      if (revealTimer.current != null) window.clearTimeout(revealTimer.current);
      audio.cleanup();
    },
    [audio],
  );
  const available = useMemo(
    () =>
      stage?.wheels.filter(
        (
          item,
        ): item is StageWheel & { wheel: NonNullable<StageWheel["wheel"]> } =>
          Boolean(item.wheel && !item.unavailable),
      ) || [],
    [stage],
  );
  const layout = useMemo(() => {
    if (!available.length) return null;
    const compactCellHeight = Math.min(330, Math.max(250, size.width * 0.82));
    const compactHeight =
      available.length * compactCellHeight +
      Math.max(0, available.length - 1) * 12;
    return computeStageLayout({
      count: available.length,
      width: size.width,
      height:
        size.width < 520 ? Math.max(size.height, compactHeight) : size.height,
    });
  }, [available.length, size.height, size.width]);
  const focused = normalizeFocus(params.get("focus"), available.length);
  const view: "overview" | "focus" = focused == null ? "overview" : "focus";
  const batchBusy = phase !== "idle";
  const officialAllEligible = Boolean(
    account &&
    stage?.revision &&
    available.length &&
    available.every(
      ({ wheel, access: wheelAccess }) =>
        wheel.lifecycle === "active" &&
        wheel.officialEnabled &&
        wheel.revision &&
        wheelAccess?.canSpinOfficially &&
        !wheelAccess.officialSpinLocked &&
        wheel.entries.filter((entry) => entry.state === "active").length >= 2,
    ),
  );
  const officialAllReason = officialAllEligible
    ? "All Stage Wheels are eligible for a recorded batch."
    : "Official All requires official-spin access to every Wheel on this Stage.";
  useEffect(() => {
    if (!officialAllEligible && batchMode === "official")
      setBatchMode("practice");
  }, [batchMode, officialAllEligible]);
  const setFocus = (
    index: number | null,
    direction: StageDirection | "overview" = "overview",
  ) => {
    if (batchBusy) return;
    setTransition({ direction, key: Date.now() });
    const next = new URLSearchParams(params);
    if (index == null) next.delete("focus");
    else next.set("focus", String(index + 1));
    setParams(next, { replace: false });
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.setTimeout(() => setTransition(null), reduced ? 80 : 540);
  };
  const finishSpin = useCallback(
    (index: number) => {
      const result = pending.current.get(index);
      if (!result || settled.current.has(index)) return;
      settled.current.add(index);
      audio.stopWheel(index);
      setSpins((current) => ({
        ...current,
        [index]: {
          ...(current[index] || emptySpin()),
          animation: null,
          spinning: false,
          requesting: false,
          result,
          substate: "settled",
        },
      }));
      if (result.source === "individual") {
        pending.current.delete(index);
        settled.current.delete(index);
        setActiveSpin(null);
        if (!soundMuted && result.wheel.config.winnerSoundEnabled)
          audio.playWinner(
            result.wheel.config.winnerSoundPreset || "gold-rise",
          );
        return;
      }
      setPhase("waiting_for_settlement");
      if (settled.current.size !== available.length) return;
      audio.stopAll();
      const ordered = available.map(({ wheel }, position) => {
        const pendingResult = pending.current.get(position)!;
        return {
          position,
          wheel,
          entry: pendingResult.entry,
          mode: pendingResult.mode,
        } satisfies StageWinnerResult;
      });
      revealTimer.current = window.setTimeout(() => {
        setCombinedResults(ordered);
        setPhase("showing_combined_results");
        const aggregate = aggregateStageCelebration(ordered);
        if (!soundMuted && aggregate.winnerSoundPreset)
          audio.playWinner(aggregate.winnerSoundPreset);
      }, 350);
    },
    [audio, available, soundMuted],
  );
  const spin = async (index: number) => {
    const item = available[index];
    if (!item || activeSpin != null || batchBusy) return;
    const wheel = item.wheel;
    const activeEntries = wheel.entries.filter(
      (entry) => entry.state === "active",
    );
    if (!activeEntries.length) return;
    const drawMode = modes[index] || "practice";
    audio.unlock();
    setError("");
    setSpins((current) => ({
      ...current,
      [index]: {
        ...(current[index] || emptySpin()),
        result: null,
        requesting: drawMode === "official",
        substate: "ready",
        source: "individual",
      },
    }));
    try {
      let entry: WheelEntry;
      let official = false;
      let officialPlan: { landingFraction: number; turnRandom: number } | null =
        null;
      let id: string = crypto.randomUUID();
      if (drawMode === "official") {
        if (!item.access?.canSpinOfficially || !csrfToken || !wheel.revision)
          throw new Error(
            "Official spinner access is unavailable for this Wheel.",
          );
        const response = await officialSpin(
          wheel.slug,
          wheel.revision,
          crypto.randomUUID(),
          csrfToken,
        );
        entry =
          activeEntries.find(
            (candidate) => candidate.id === response.spin.winningEntryId,
          ) ||
          fallbackEntry(
            response.spin.winningEntryId,
            response.spin.winningLabel,
          );
        official = true;
        officialPlan = response.spin.animationPlan;
        id = response.spin.id;
      } else entry = selectWeightedEntry(activeEntries);
      const mechanics = await getWheelMechanics();
      const current = spins[index]?.rotation || 0;
      const plan = {
        ...spinPlan(
          activeEntries,
          entry.id,
          wheel.config.spinDurationMs,
          current,
          {
            ...(officialPlan || {}),
            mechanics: mechanics.mechanics,
            mechanicsRevision: mechanics.revision,
          },
        ),
        id,
        startAt: performance.now() + 24,
      };
      pending.current.set(index, {
        entry,
        official,
        mode: official ? "official" : account ? "practice" : "demo",
        source: "individual",
        wheel,
      });
      settled.current.delete(index);
      setActiveSpin(index);
      setSpins((state) => ({
        ...state,
        [index]: {
          rotation: plan.finalRotation,
          animation: plan,
          spinning: true,
          requesting: false,
          result: null,
          substate: "spinning",
          source: "individual",
        },
      }));
    } catch (reason) {
      setError(message(reason));
      setActiveSpin(null);
      pending.current.delete(index);
      setSpins((current) => ({
        ...current,
        [index]: {
          ...(current[index] || emptySpin()),
          animation: null,
          spinning: false,
          requesting: false,
          substate: "failed",
        },
      }));
    }
  };
  const startSpinAll = async () => {
    if (
      !stage ||
      !available.length ||
      activeSpin != null ||
      batchBusy ||
      view !== "overview"
    )
      return;
    audio.unlock();
    setError("");
    setPreflightIssues(null);
    setCombinedResults(null);
    setPhase("preflighting");
    settled.current.clear();
    pending.current.clear();
    const mode: StageResultMode = account ? batchMode : "demo";
    const localIssues = preflight(stage, available, mode, officialAllEligible);
    if (localIssues.length) {
      setPreflightIssues(localIssues);
      setPhase("error");
      return;
    }
    try {
      const authoritative =
        mode === "official"
          ? await requestOfficialAll(stage, available, batchKey, csrfToken!)
          : null;
      if (authoritative && authoritative.results.length !== available.length)
        throw new Error("Official All returned an incomplete result set.");
      const mechanics = await getWheelMechanics();
      const startAt = performance.now() + 48;
      const next: Record<number, SpinState> = {};
      for (let index = 0; index < available.length; index += 1) {
        const wheel = available[index].wheel;
        const entries = wheel.entries.filter(
          (entry) => entry.state === "active",
        );
        const officialResult = authoritative?.results[index];
        const entry = officialResult
          ? entries.find(
              (candidate) =>
                candidate.id === officialResult.spin.winningEntryId,
            ) ||
            fallbackEntry(
              officialResult.spin.winningEntryId,
              officialResult.spin.winningLabel,
            )
          : selectWeightedEntry(entries);
        const plan = {
          ...spinPlan(
            entries,
            entry.id,
            wheel.config.spinDurationMs,
            spins[index]?.rotation || 0,
            {
              ...(officialResult?.spin.animationPlan || {}),
              mechanics: mechanics.mechanics,
              mechanicsRevision: mechanics.revision,
            },
          ),
          id: officialResult?.spin.id || crypto.randomUUID(),
          startAt,
        };
        pending.current.set(index, {
          entry,
          official: mode === "official",
          mode,
          source: "spin-all",
          wheel,
        });
        next[index] = {
          rotation: plan.finalRotation,
          animation: plan,
          spinning: true,
          requesting: false,
          result: null,
          substate: "spinning",
          source: "spin-all",
        };
      }
      setSpins((current) => ({ ...current, ...next }));
      setPhase("spinning_all");
    } catch (reason) {
      const failure = reason as ApiError;
      setPreflightIssues(
        failure.issues?.length
          ? failure.issues
          : [
              {
                wheel: "Stage",
                code: failure.code || "stage_spin_all_failed",
                message: message(reason),
              },
            ],
      );
      setPhase("error");
      batchKey.current = null;
    }
  };
  const closeCombined = useCallback(() => {
    audio.stopWinner();
    pending.current.clear();
    settled.current.clear();
    batchKey.current = null;
    setCombinedResults(null);
    setPhase("idle");
    window.requestAnimationFrame(() => spinAllButton.current?.focus());
  }, [audio]);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      setError("Fullscreen is unavailable in this browser.");
    }
  };
  if (create && !account)
    return (
      <StageState
        title="Sign in to build a Stage"
        action={
          <button
            type="button"
            className="button button--primary"
            onClick={() => openAuth("signin")}
          >
            Log in
          </button>
        }
      />
    );
  if (loading) return <StageState title="Tuning the Stage signal…" />;
  if (!create && !stage)
    return (
      <StageState
        title="Stage unavailable"
        detail={error || "This Stage was not found."}
      />
    );
  const background =
    focused != null ? wheelBackground(available[focused]?.wheel) : null;
  const batchSoundCount = available.filter(
    ({ wheel }) =>
      wheel.config.tickingSoundEnabled &&
      spinSoundProfile(wheel.config.spinSoundPreset || "classic-tick"),
  ).length;
  const playBoundaryTicks = (index: number, count: number) => {
    const wheel = available[index]?.wheel;
    if (!wheel || soundMuted || !wheel.config.tickingSoundEnabled) return;
    const gainScale =
      spins[index]?.source === "spin-all" ? stageAudioGain(batchSoundCount) : 1;
    audio.playWheel(
      index,
      count,
      wheel.config.spinSoundPreset || "classic-tick",
      gainScale,
    );
  };
  return (
    <div
      ref={root}
      className={`wheel-stage-page stage-view--${view}${transition ? " is-stage-transitioning" : ""}`}
      data-stage-transition={transition?.direction || "settled"}
      data-stage-spin-phase={phase}
      style={
        {
          "--stage-bg-image": background ? `url("${background}")` : "none",
        } as React.CSSProperties
      }
    >
      <div className="wheel-stage-page__background" aria-hidden="true" />
      <header className="stage-topbar">
        <Link
          className="stage-topbar__back"
          to="/wheels"
          aria-label="Exit Stage"
        >
          <BackIcon />
          <span>Wheels</span>
        </Link>
        <div className="stage-topbar__identity">
          <WheelsBrandMark />
          <span>{stage?.title || "New Stage"}</span>
          <small>
            {view === "overview"
              ? "Overview"
              : `Focus · ${available[focused || 0]?.wheel.title || "Wheel"}`}
          </small>
        </div>
        <nav
          aria-label="Stage controls"
          className={batchBusy ? "stage-controls-disabled" : ""}
        >
          {view === "focus" ? (
            <button type="button" onClick={() => setFocus(null, "overview")}>
              ▦ Overview
            </button>
          ) : null}
          <button type="button" onClick={() => void toggleFullscreen()}>
            <FullscreenIcon /> Fullscreen
          </button>
          {access?.canEdit && stage ? (
            batchBusy ? (
              <span>
                <EditIcon /> Edit Stage
              </span>
            ) : (
              <Link to={`/wheels/stages/${stage.slug}/edit`}>
                <EditIcon /> Edit Stage
              </Link>
            )
          ) : null}
        </nav>
      </header>
      {!create && available.length && view === "overview" ? (
        <section
          className="stage-spin-all-rail"
          aria-label="Stage Spin All controls"
        >
          {account ? (
            <div
              className="stage-spin-all-modes"
              role="group"
              aria-label="Spin All mode"
            >
              <button
                type="button"
                className={batchMode === "practice" ? "is-active" : ""}
                disabled={batchBusy}
                onClick={() => setBatchMode("practice")}
              >
                <PracticeIcon /> PRACTICE ALL
              </button>
              <button
                type="button"
                className={`is-official${batchMode === "official" ? " is-active" : ""}`}
                disabled={batchBusy || !officialAllEligible}
                title={officialAllReason}
                onClick={() => setBatchMode("official")}
              >
                <OfficialIcon /> OFFICIAL ALL
              </button>
            </div>
          ) : null}
          <button
            ref={spinAllButton}
            type="button"
            className={`stage-spin-all-trigger${batchMode === "official" && account ? " is-official" : ""}`}
            disabled={batchBusy || activeSpin != null}
            onClick={() => void startSpinAll()}
          >
            {phase === "preflighting"
              ? "PREFLIGHTING"
              : phase === "spinning_all" || phase === "waiting_for_settlement"
                ? "SPINNING ALL"
                : "SPIN ALL"}
          </button>
          <div className="stage-spin-all-status">
            <b>
              {account
                ? batchMode === "official"
                  ? "Official · recorded"
                  : "Practice · not recorded"
                : "Demo · not recorded"}
            </b>
            {account && !officialAllEligible
              ? officialAllReason
              : `${available.length} Wheel${available.length === 1 ? "" : "s"} · shared start`}
          </div>
        </section>
      ) : null}
      <main ref={surface} className="stage-surface">
        {create ? (
          <div className="stage-new-shell">
            <WheelsBrandMark />
            <h1>Build a Stage</h1>
            <p>
              Select up to six Wheels, create or import without leaving, then
              save explicitly.
            </p>
          </div>
        ) : !available.length ? (
          <div className="stage-new-shell">
            <h1>{stage!.title}</h1>
            <p>No Stage Wheels are currently available.</p>
          </div>
        ) : view === "overview" && layout ? (
          <div
            className="stage-overview"
            aria-label={`${stage!.title} Stage overview`}
            style={{ height: layout.height, top: size.width <= 620 ? 112 : 0 }}
          >
            {layout.cells.map((cell, index) => (
              <StageTile
                key={available[index].wheel.slug}
                item={available[index]}
                index={index}
                cell={cell}
                spin={spins[index] || emptySpin()}
                mode={modes[index] || "practice"}
                authenticated={Boolean(account)}
                soundMuted={soundMuted}
                activeSpin={activeSpin}
                batchBusy={batchBusy}
                onMode={(nextMode) =>
                  setModes((current) => ({ ...current, [index]: nextMode }))
                }
                onSpin={() => void spin(index)}
                onFinish={() => finishSpin(index)}
                onBoundaryCrossing={(count) => playBoundaryTicks(index, count)}
                onSound={() => setSoundMuted((value) => !value)}
                onFocus={() => setFocus(index)}
              />
            ))}
          </div>
        ) : focused != null && layout ? (
          <FocusedWheel
            item={available[focused]}
            index={focused}
            cell={layout.cells[focused]}
            spin={spins[focused] || emptySpin()}
            mode={modes[focused] || "practice"}
            authenticated={Boolean(account)}
            soundMuted={soundMuted}
            activeSpin={activeSpin}
            batchBusy={batchBusy}
            onMode={(nextMode) =>
              setModes((current) => ({ ...current, [focused]: nextMode }))
            }
            onSpin={() => void spin(focused)}
            onFinish={() => finishSpin(focused)}
            onBoundaryCrossing={(count) => playBoundaryTicks(focused, count)}
            onSound={() => setSoundMuted((value) => !value)}
            onOverview={() => setFocus(null, "overview")}
            onNavigate={(direction) => {
              const target = layout.cells[focused].neighbors[direction];
              if (target != null) setFocus(target, direction);
            }}
          />
        ) : null}
      </main>
      {error ? (
        <div className="stage-global-alert wheel-alert" role="alert">
          {error}
        </div>
      ) : null}
      {preflightIssues ? (
        <StagePreflightDialog
          issues={preflightIssues}
          onClose={() => {
            setPreflightIssues(null);
            setPhase("idle");
          }}
        />
      ) : null}
      {combinedResults && root.current ? (
        <StageWinnerCelebration
          results={combinedResults}
          portalRoot={root.current}
          onClose={closeCombined}
        />
      ) : null}
      {(create || editorRequested) && csrfToken ? (
        <StageEditorDialog
          stage={stage}
          access={access}
          create={create}
          csrfToken={csrfToken}
          preselect={params.get("wheel") || ""}
          onClose={() =>
            navigate(stage ? `/wheels/stages/${stage.slug}` : "/wheels")
          }
          onSaved={(nextStage, nextAccess) => {
            setStage(nextStage);
            setAccess(nextAccess);
          }}
        />
      ) : null}
    </div>
  );
}

type TileProps = {
  item: StageWheel & { wheel: NonNullable<StageWheel["wheel"]> };
  index: number;
  cell: ReturnType<typeof computeStageLayout>["cells"][number];
  spin: SpinState;
  mode: "practice" | "official";
  authenticated: boolean;
  soundMuted: boolean;
  activeSpin: number | null;
  batchBusy: boolean;
  onMode: (mode: "practice" | "official") => void;
  onSpin: () => void;
  onFinish: () => void;
  onBoundaryCrossing: (count: number) => void;
  onSound: () => void;
  onFocus: () => void;
};
function StageTile(props: TileProps) {
  const { wheel } = props.item;
  const official = Boolean(
    props.item.access?.canSpinOfficially && wheel.officialEnabled,
  );
  const disabled =
    props.batchBusy ||
    props.activeSpin != null ||
    props.spin.requesting ||
    !wheel.entries.some((entry) => entry.state === "active");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <section
      className={`stage-wheel-tile${props.spin.result ? " is-winner" : ""}${props.spin.source === "spin-all" && props.spin.substate === "settled" ? " is-stage-settled" : ""}`}
      data-spin-substate={props.spin.substate}
      aria-label={`${wheel.title} Stage Wheel`}
      style={
        {
          left: props.cell.x,
          top: props.cell.y,
          width: props.cell.width,
          height: props.cell.height,
          "--stage-wheel-diameter": `${props.cell.diameter}px`,
          "--tile-accent": wheel.config.pointerAccent,
        } as React.CSSProperties
      }
    >
      <header>
        <div>
          <strong>{wheel.title}</strong>
          <span>
            {official
              ? "Practice / Official"
              : props.authenticated
                ? "Practice"
                : "Demo"}
          </span>
        </div>
        <div className="stage-wheel-tile__header-actions">
          <WheelOwnerDetails
            wheel={wheel}
            access={props.item.access}
            variant="avatar"
          />
          <button
            type="button"
            disabled={props.batchBusy}
            onClick={props.onFocus}
            aria-label={`Focus ${wheel.title}`}
          >
            Focus
          </button>
        </div>
      </header>
      <div className="stage-wheel-tile__canvas">
        <WheelCanvas
          entries={wheel.entries}
          config={wheel.config}
          rotation={props.spin.rotation}
          durationMs={wheel.config.spinDurationMs}
          spinning={props.spin.spinning}
          animation={props.spin.animation}
          reducedMotion={reduced}
          winner={Boolean(props.spin.result)}
          centreImageUrl={wheel.media?.centre?.url}
          segmentMedia={wheel.media?.segmentFills}
          onSpinEnd={props.onFinish}
          onBoundaryCrossing={props.onBoundaryCrossing}
          onCentreSpin={props.onSpin}
          centreSpinDisabled={disabled}
          centreSpinLabel={`Spin ${wheel.title}`}
        />
      </div>
      <footer>
        {official ? (
          <select
            value={props.mode}
            disabled={disabled}
            onChange={(event) =>
              props.onMode(event.target.value as "practice" | "official")
            }
            aria-label={`${wheel.title} draw mode`}
          >
            <option value="practice">Practice</option>
            <option value="official">Official</option>
          </select>
        ) : (
          <span>{props.authenticated ? "PRACTICE" : "DEMO"}</span>
        )}
        <button type="button" disabled={disabled} onClick={props.onSpin}>
          {props.spin.requesting
            ? "REQUESTING"
            : props.spin.spinning
              ? "SPINNING"
              : "SPIN WHEEL"}
        </button>
        <button
          type="button"
          disabled={props.batchBusy}
          onClick={props.onSound}
          aria-label={
            props.soundMuted ? "Turn Stage sound on" : "Turn Stage sound off"
          }
        >
          <SoundIcon muted={props.soundMuted} />
        </button>
      </footer>
      {props.spin.result ? (
        <div className="stage-tile-result" role="status">
          <span>
            {props.spin.result.official
              ? "OFFICIAL RESULT"
              : `${props.spin.result.mode.toUpperCase()} RESULT`}
          </span>
          <strong>{props.spin.result.entry.label}</strong>
        </div>
      ) : null}
    </section>
  );
}
function FocusedWheel(
  props: Omit<TileProps, "onFocus"> & {
    onOverview: () => void;
    onNavigate: (direction: StageDirection) => void;
  },
) {
  const { wheel } = props.item;
  const official = Boolean(
    props.item.access?.canSpinOfficially && wheel.officialEnabled,
  );
  const disabled =
    props.batchBusy ||
    props.activeSpin != null ||
    props.spin.requesting ||
    !wheel.entries.some((entry) => entry.state === "active");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <section
      className="stage-focused-wheel"
      aria-label={`Focused Stage Wheel ${wheel.title}`}
    >
      <header>
        <p className="eyebrow">FOCUSED WHEEL</p>
        <div className="stage-focused-wheel__identity">
          <h1>{wheel.title}</h1>
          <WheelOwnerDetails
            wheel={wheel}
            access={props.item.access}
            variant="info"
          />
        </div>
        <span>
          {official
            ? "Practice and Official authority available"
            : props.authenticated
              ? "Practice · not recorded"
              : "Demo · not recorded"}
        </span>
      </header>
      <div className="stage-focused-wheel__canvas">
        <WheelCanvas
          entries={wheel.entries}
          config={wheel.config}
          rotation={props.spin.rotation}
          durationMs={wheel.config.spinDurationMs}
          spinning={props.spin.spinning}
          animation={props.spin.animation}
          reducedMotion={reduced}
          winner={Boolean(props.spin.result)}
          centreImageUrl={wheel.media?.centre?.url}
          segmentMedia={wheel.media?.segmentFills}
          onSpinEnd={props.onFinish}
          onBoundaryCrossing={props.onBoundaryCrossing}
          onCentreSpin={props.onSpin}
          centreSpinDisabled={disabled}
        />
      </div>
      <div className="stage-focus-controls">
        {official ? (
          <fieldset>
            <legend>Draw mode</legend>
            <button
              type="button"
              className={props.mode === "practice" ? "is-active" : ""}
              disabled={disabled}
              onClick={() => props.onMode("practice")}
            >
              <PracticeIcon /> Practice
            </button>
            <button
              type="button"
              className={props.mode === "official" ? "is-active" : ""}
              disabled={disabled}
              onClick={() => props.onMode("official")}
            >
              <OfficialIcon /> Official
            </button>
          </fieldset>
        ) : (
          <span>
            {props.authenticated
              ? "PRACTICE / NOT RECORDED"
              : "DEMO / NOT RECORDED"}
          </span>
        )}
        <button
          className="stage-focus-spin"
          type="button"
          disabled={disabled}
          onClick={props.onSpin}
        >
          {props.spin.requesting
            ? "REQUESTING AUTHORITY"
            : props.spin.spinning
              ? "SIGNAL IN MOTION"
              : "SPIN WHEEL"}
        </button>
        <button
          className="stage-focus-sound"
          type="button"
          disabled={props.batchBusy}
          onClick={props.onSound}
          aria-label={
            props.soundMuted ? "Turn Stage sound on" : "Turn Stage sound off"
          }
        >
          <SoundIcon muted={props.soundMuted} />{" "}
          {props.soundMuted ? "Sound off" : "Sound on"}
        </button>
      </div>
      <nav className="stage-dpad" aria-label="Move focus between Stage Wheels">
        <button
          type="button"
          disabled={props.batchBusy || props.cell.neighbors.up == null}
          onClick={() => props.onNavigate("up")}
          aria-label="Focus wheel above"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={props.batchBusy || props.cell.neighbors.left == null}
          onClick={() => props.onNavigate("left")}
          aria-label="Focus wheel left"
        >
          ←
        </button>
        <button
          type="button"
          disabled={props.batchBusy || props.cell.neighbors.down == null}
          onClick={() => props.onNavigate("down")}
          aria-label="Focus wheel below"
        >
          ↓
        </button>
        <button
          type="button"
          disabled={props.batchBusy || props.cell.neighbors.right == null}
          onClick={() => props.onNavigate("right")}
          aria-label="Focus wheel right"
        >
          →
        </button>
      </nav>
      {props.spin.result ? (
        <div className="stage-focus-result" role="status">
          <span>
            {props.spin.result.official
              ? "OFFICIAL RESULT"
              : `${props.spin.result.mode.toUpperCase()} RESULT`}
          </span>
          <strong>{props.spin.result.entry.label}</strong>
        </div>
      ) : null}
    </section>
  );
}
function StagePreflightDialog({
  issues,
  onClose,
}: {
  issues: PreflightIssue[];
  onClose: () => void;
}) {
  return (
    <div className="stage-preflight-dialog" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-preflight-title"
      >
        <p className="eyebrow">STAGE PREFLIGHT</p>
        <h2 id="stage-preflight-title">Official All cannot start.</h2>
        <ul>
          {issues.map((issue, index) => (
            <li key={`${issue.wheel}:${issue.code}:${index}`}>
              <strong>{issue.wheel}</strong> — {issue.message}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="button button--primary"
          autoFocus
          onClick={onClose}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
function StageState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="wheel-route-state wheel-route-state--presentation">
      <div>
        <WheelsBrandMark className="wheel-route-state__mark" />
        <h1>{title}</h1>
        {detail ? <p>{detail}</p> : null}
        {action || <Link to="/wheels">Return to Wheels</Link>}
      </div>
    </div>
  );
}
function emptySpin(): SpinState {
  return {
    rotation: 0,
    animation: null,
    spinning: false,
    requesting: false,
    result: null,
    substate: "ready",
    source: null,
  };
}
function normalizeFocus(value: string | null, count: number) {
  if (!value) return null;
  const index = Number(value) - 1;
  return Number.isInteger(index) && index >= 0 && index < count ? index : null;
}
function wheelBackground(wheel: StageWheel["wheel"]) {
  return wheel?.config.backgroundEnabled !== false
    ? wheel?.media?.background?.url || null
    : null;
}
function fallbackEntry(id: string, label: string): WheelEntry {
  return {
    id,
    label,
    order: 0,
    weight: 1,
    colour: null,
    style: null,
    state: "active",
  };
}
function message(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "The Stage service is unavailable.";
}
function preflight(
  stage: Stage,
  wheels: Array<StageWheel & { wheel: NonNullable<StageWheel["wheel"]> }>,
  mode: StageResultMode,
  officialEligible: boolean,
) {
  const issues: PreflightIssue[] = [];
  if (stage.lifecycle !== "active")
    issues.push({
      wheel: "Stage",
      code: "stage_inactive",
      message: "Stage is not active.",
    });
  for (const { wheel } of wheels) {
    if (wheel.lifecycle !== "active")
      issues.push({
        wheel: wheel.title,
        code: "wheel_inactive",
        message: "Wheel is not active.",
      });
    if (!wheel.entries.some((entry) => entry.state === "active"))
      issues.push({
        wheel: wheel.title,
        code: "participants_unavailable",
        message: "No active participants are available.",
      });
    if (
      mode === "official" &&
      wheel.entries.filter((entry) => entry.state === "active").length < 2
    )
      issues.push({
        wheel: wheel.title,
        code: "participants_insufficient",
        message: "Official draws need at least two active participants.",
      });
  }
  if (mode === "official" && !officialEligible)
    issues.push({
      wheel: "Stage",
      code: "official_spin_forbidden",
      message: "Official-spin access is required for every Wheel.",
    });
  return issues;
}
async function requestOfficialAll(
  stage: Stage,
  wheels: Array<StageWheel & { wheel: NonNullable<StageWheel["wheel"]> }>,
  key: React.MutableRefObject<string | null>,
  csrfToken: string,
) {
  key.current ||= crypto.randomUUID();
  const expected = wheels.map(({ wheel }) => ({
    slug: wheel.slug,
    revision: Number(wheel.revision),
  }));
  try {
    return await officialSpinAll(
      stage.slug,
      Number(stage.revision),
      expected,
      key.current,
      csrfToken,
    );
  } catch (reason) {
    const error = reason as ApiError;
    if (error.status && error.status < 500) throw error;
    return officialSpinAll(
      stage.slug,
      Number(stage.revision),
      expected,
      key.current,
      csrfToken,
    );
  }
}

function useStageAudio() {
  const context = useRef<AudioContext | null>(null);
  const nodes = useRef(new Map<number, Set<OscillatorNode>>());
  const winnerNodes = useRef<OscillatorNode[]>([]);
  const winnerTimer = useRef<number | null>(null);
  const unlock = useCallback(() => {
    try {
      context.current ||= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume();
    } catch {
      /* optional */
    }
  }, []);
  const stopWheel = useCallback((index: number) => {
    const active = nodes.current.get(index);
    if (active) for (const node of active) try { node.stop(); } catch { /* already stopped */ }
    nodes.current.delete(index);
  }, []);
  const stopAll = useCallback(() => {
    for (const index of nodes.current.keys()) stopWheel(index);
  }, [stopWheel]);
  const playWheel = useCallback(
    (wheelIndex: number, count: number, preset: string, gainScale: number) => {
      const audio = context.current;
      const profile = spinSoundProfile(preset);
      if (!audio || audio.state !== "running" || !profile) return;
      const active = nodes.current.get(wheelIndex) || new Set<OscillatorNode>();
      nodes.current.set(wheelIndex, active);
      for (let index = 0; index < Math.min(3, Math.max(1, count)); index += 1) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + index * 0.006;
        oscillator.type = profile.waveform;
        oscillator.frequency.value = profile.frequency;
        oscillator.detune.value = profile.detune;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, profile.gain * gainScale),
          start + profile.attack,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          start + profile.decay,
        );
        oscillator.connect(gain).connect(audio.destination);
        active.add(oscillator);
        oscillator.start(start);
        oscillator.stop(start + profile.decay + 0.01);
        oscillator.addEventListener("ended", () => { active.delete(oscillator); if (!active.size) nodes.current.delete(wheelIndex); });
      }
    },
    [],
  );
  const stopWinner = useCallback(() => {
    if (winnerTimer.current != null) window.clearTimeout(winnerTimer.current);
    winnerTimer.current = null;
    for (const node of winnerNodes.current)
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    winnerNodes.current = [];
  }, []);
  const playWinner = useCallback(
    (preset: string) => {
      stopWinner();
      const audio = context.current;
      const profile = winnerSoundProfile(preset);
      if (!audio || audio.state !== "running" || !profile) return;
      profile.notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + index * profile.spacing;
        oscillator.type = profile.waveform;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(profile.gain, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + profile.decay);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + profile.decay + 0.03);
        winnerNodes.current.push(oscillator);
      });
      winnerTimer.current = window.setTimeout(
        stopWinner,
        Math.ceil(
          (profile.notes.length * profile.spacing + profile.decay + 0.2) * 1000,
        ),
      );
    },
    [stopWinner],
  );
  const cleanup = useCallback(() => {
    stopAll();
    stopWinner();
    nodes.current.clear();
    const audio = context.current;
    context.current = null;
    if (audio) void audio.close();
  }, [stopAll, stopWinner]);
  return useMemo(
    () => ({
      unlock,
      playWheel,
      stopWheel,
      stopAll,
      playWinner,
      stopWinner,
      cleanup,
    }),
    [cleanup, playWheel, playWinner, stopAll, stopWheel, stopWinner, unlock],
  );
}
