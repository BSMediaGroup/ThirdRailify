import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WheelEntry } from "./types";
import {
  CELEBRATION_PROFILES,
  type CelebrationIntensity,
  type CelebrationProfile,
} from "./celebrationProfiles.mjs";
import { WheelsBrandMark } from "./WheelsBrandMark";
import { trapFocus } from "./focusTrap";
import { CheckIcon, EyeOffIcon, TrashIcon } from "../components/Icons";

type Props = {
  entry: WheelEntry;
  official: boolean;
  message: string;
  celebrationEnabled: boolean;
  confettiEnabled: boolean;
  fireworksEnabled: boolean;
  lightingEnabled: boolean;
  intensity: CelebrationIntensity;
  palette: string[];
  accent: string;
  canEdit: boolean;
  busy: boolean;
  onClose: () => void;
  onAction: (action: "keep" | "hide" | "remove" | "remove-matching") => void;
};

export function WinnerCelebration({
  entry,
  official,
  message,
  celebrationEnabled,
  confettiEnabled,
  fireworksEnabled,
  lightingEnabled,
  intensity,
  palette,
  accent,
  canEdit,
  busy,
  onClose,
  onAction,
}: Props) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [effectsActive, setEffectsActive] = useState(true);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const profile = CELEBRATION_PROFILES[intensity];
  const particles = useMemo(() => {
    if (reduced) return [];
    const colours = [
      accent,
      "#F3C928",
      "#B8182F",
      "#FFFDF3",
      "#6D3A93",
      ...palette,
    ];
    return Array.from({ length: profile.confettiCount }, (_, index) => ({
      index,
      x: (index * 47 + (index % 5) * 7) % 101,
      delay: 80 + (index % 19) * 24,
      drift: ((index * 37) % 241) - 120,
      size: 6 + ((index * 5) % 7),
      duration: Math.round(
        profile.confettiDuration * (0.64 + ((index * 83) % 37) / 100),
      ),
      colour: colours[index % colours.length],
      shape: index % 3 === 0 ? "diamond" : index % 3 === 1 ? "strip" : "rect",
      cannon: index % 6 === 0 ? "left" : index % 6 === 1 ? "right" : "stage",
    }));
  }, [accent, palette, profile, reduced]);
  useEffect(() => {
    setEffectsActive(true);
    const duration =
      Math.max(profile.confettiDuration, profile.fireworksDuration) + 550;
    const timer = window.setTimeout(() => setEffectsActive(false), duration);
    return () => window.clearTimeout(timer);
  }, [profile]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialog.current)
        trapFocus(event, dialog.current);
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = priorOverflow;
      previous?.focus();
    };
  }, [onClose]);
  const active = celebrationEnabled && effectsActive;
  const style = {
    "--winner-accent": accent,
    "--lighting-strength": profile.lightingStrength,
    "--rim-strength": profile.rimStrength,
    "--bloom-opacity": profile.bloomOpacity,
    "--stage-energy": profile.stageEnergy,
  } as React.CSSProperties;
  return createPortal(
    <div
      className={`winner-backdrop celebration--${intensity}${active ? " is-celebrating" : ""}${lightingEnabled && active ? " has-lighting" : ""}`}
      role="presentation"
      style={style}
      data-celebration-intensity={intensity}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {active && lightingEnabled ? (
        <Lightshow profile={profile} reduced={reduced} />
      ) : null}
      {active && fireworksEnabled && !reduced ? (
        <FireworksCanvas profile={profile} colours={[accent, ...palette]} />
      ) : null}
      {active && confettiEnabled && !reduced ? (
        <div
          className="winner-confetti"
          aria-hidden="true"
          data-confetti-count={particles.length}
        >
          {particles.map(
            ({
              index,
              x,
              delay,
              drift,
              size,
              duration,
              colour,
              shape,
              cannon,
            }) => (
              <i
                key={index}
                className={`is-${shape} from-${cannon}`}
                style={
                  {
                    "--i": index,
                    "--x": `${x}%`,
                    "--delay": `${delay}ms`,
                    "--drift": `${drift}px`,
                    "--size": `${size}px`,
                    "--duration": `${duration}ms`,
                    "--confetti": colour,
                  } as React.CSSProperties
                }
              />
            ),
          )}
        </div>
      ) : null}
      <div
        ref={dialog}
        className="winner-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="winner-title"
        aria-describedby="winner-status winner-detail"
      >
        <button
          ref={close}
          type="button"
          className="winner-dialog__close"
          onClick={onClose}
          aria-label="Close result"
        >
          ×
        </button>
        <div className="winner-dialog__mark" aria-hidden="true">
          <WheelsBrandMark />
        </div>
        <p className={`draw-badge ${official ? "is-official" : ""}`}>
          {official ? "OFFICIAL DRAW · RECORDED" : "DEMO / NOT RECORDED"}
        </p>
        <p id="winner-status" className="eyebrow">
          {message.replace("{winner}", entry.label)}
        </p>
        <h2 id="winner-title">{entry.label}</h2>
        <p id="winner-detail">
          {official
            ? "This result was selected and persisted by the Third Railify authority before the animation began."
            : "Demo result — not recorded as an official draw."}
        </p>
        {canEdit ? (
          <div className="winner-actions">
            <button
              className="button button--secondary button--compact"
              type="button"
              onClick={() => onAction("keep")}
              disabled={busy}
            >
              <CheckIcon /> Keep participant
            </button>
            <button
              className="button button--ghost button--compact"
              type="button"
              onClick={() => onAction("hide")}
              disabled={busy}
            >
              <EyeOffIcon /> Hide winner
            </button>
            <button
              className="button button--danger-outline button--compact"
              type="button"
              onClick={() => onAction("remove")}
              disabled={busy}
            >
              <TrashIcon /> Remove entry
            </button>
            <button
              className="button button--danger button--compact"
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Remove every entry labelled “${entry.label}”?`,
                  )
                )
                  onAction("remove-matching");
              }}
              disabled={busy}
            >
              <TrashIcon /> Remove all matching
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function Lightshow({
  profile,
  reduced,
}: {
  profile: CelebrationProfile;
  reduced: boolean;
}) {
  const beamColours = ["#F3C928", "#B8182F", "#6D3A93", "#FFFFFF"];
  return (
    <div
      className={`winner-lightshow${reduced ? " is-static" : ""}`}
      aria-hidden="true"
      data-beam-count={reduced ? 0 : profile.beamCount}
      data-voltage-count={reduced ? 0 : profile.voltageCount}
    >
      <div className="winner-lightshow__bloom" />
      {!reduced
        ? Array.from({ length: profile.beamCount }, (_, index) => (
            <i
              key={`beam-${index}`}
              style={
                {
                  "--beam-angle": `${-72 + index * (144 / Math.max(1, profile.beamCount - 1))}deg`,
                  "--beam-colour": beamColours[index % beamColours.length],
                } as React.CSSProperties
              }
            />
          ))
        : null}
      {!reduced
        ? Array.from({ length: profile.voltageCount }, (_, index) => (
            <span
              key={`voltage-${index}`}
              style={
                {
                  "--voltage-top": `${18 + index * (64 / Math.max(1, profile.voltageCount - 1))}%`,
                  "--voltage-delay": `${index * 110}ms`,
                } as React.CSSProperties
              }
            />
          ))
        : null}
      <b />
      <b />
      <em />
    </div>
  );
}

export function FireworksCanvas({
  profile,
  colours,
}: {
  profile: CelebrationProfile;
  colours: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile.fireworksBursts) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let stopped = false;
    const started = performance.now();
    const palette = [
      "#F3C928",
      "#B8182F",
      "#6D3A93",
      "#FFFFFF",
      ...colours,
    ].filter((value) => /^#[0-9a-f]{6}$/i.test(value));
    const bursts = Array.from(
      { length: profile.fireworksBursts },
      (_, index) => ({
        launch:
          180 +
          index *
            ((profile.fireworksDuration * 0.5) /
              Math.max(1, profile.fireworksBursts - 1)),
        x: 0.16 + ((index * 37) % 68) / 100,
        y: 0.18 + ((index * 29) % 25) / 100,
        colour: palette[index % palette.length],
      }),
    );
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const draw = (now: number) => {
      if (stopped) return;
      const elapsed = now - started;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      for (let burstIndex = 0; burstIndex < bursts.length; burstIndex += 1) {
        const burst = bursts[burstIndex];
        const age = elapsed - burst.launch;
        if (age < 0) continue;
        const launchDuration = 620;
        const targetX = width * burst.x;
        const targetY = height * burst.y;
        if (age < launchDuration) {
          const progress = age / launchDuration;
          const y = height + (targetY - height) * progress;
          context.strokeStyle = burst.colour;
          context.lineWidth = 2.4;
          context.shadowBlur = 14;
          context.shadowColor = burst.colour;
          context.beginPath();
          context.moveTo(targetX, y + 34);
          context.lineTo(targetX, y);
          context.stroke();
          continue;
        }
        const sparkAge = age - launchDuration;
        const lifetime = 1_350 + burstIndex * 65;
        if (sparkAge > lifetime) continue;
        const progress = sparkAge / lifetime;
        const alpha = Math.max(0, 1 - progress);
        context.strokeStyle = hexAlpha(burst.colour, alpha);
        context.fillStyle = hexAlpha(burst.colour, alpha * 0.78);
        context.shadowBlur = 10 * alpha;
        context.shadowColor = burst.colour;
        for (let spark = 0; spark < profile.sparksPerBurst; spark += 1) {
          const angle =
            (Math.PI * 2 * spark) / profile.sparksPerBurst + burstIndex * 0.31;
          const speed = 54 + ((spark * 17 + burstIndex * 13) % 72);
          const distance = speed * (sparkAge / 1_000) * (1 - progress * 0.22);
          const x = targetX + Math.cos(angle) * distance;
          const y =
            targetY +
            Math.sin(angle) * distance +
            62 * Math.pow(sparkAge / 1_000, 2);
          const tail = 7 + 12 * alpha;
          context.lineWidth = spark % 5 === 0 ? 2.2 : 1.25;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(
            x - Math.cos(angle) * tail,
            y - Math.sin(angle) * tail,
          );
          context.stroke();
          if (spark % 7 === 0 && progress > 0.24) {
            context.beginPath();
            context.arc(
              x + Math.cos(angle + 1.4) * 7,
              y + Math.sin(angle + 1.4) * 7,
              1.2,
              0,
              Math.PI * 2,
            );
            context.fill();
          }
        }
      }
      if (elapsed < profile.fireworksDuration)
        frame = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [colours, profile]);
  return (
    <canvas
      ref={canvasRef}
      className="winner-fireworks"
      aria-hidden="true"
      data-firework-bursts={profile.fireworksBursts}
    />
  );
}

function hexAlpha(colour: string, alpha: number) {
  const hex = colour.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}
