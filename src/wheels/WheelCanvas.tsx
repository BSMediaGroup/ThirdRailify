import { useEffect, useRef } from "react";
import { entryAngles } from "./engine.mjs";
import type { WheelConfig, WheelEntry } from "./types";

type Props = { entries: WheelEntry[]; config: WheelConfig; rotation: number; durationMs: number; spinning: boolean; onSpinEnd?: () => void; compact?: boolean };

export function WheelCanvas({ entries, config, rotation, durationMs, spinning, onSpinEnd, compact = false }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = entries.filter((entry) => entry.state === "active");

  useEffect(() => {
    const element = canvas.current; if (!element) return;
    const render = () => drawWheel(element, active, config);
    render();
    const observer = new ResizeObserver(render); observer.observe(element);
    return () => observer.disconnect();
  }, [active, config]);

  const alternative = active.length ? `Wheel with ${active.length} active participants: ${active.slice(0, 12).map((entry) => entry.label).join(", ")}${active.length > 12 ? ", and more" : ""}.` : "Wheel with no active participants.";
  return (
    <div className={`wheel-stage${compact ? " wheel-stage--compact" : ""}${spinning ? " is-spinning" : ""}`} style={{ "--pointer": config.pointerAccent } as React.CSSProperties}>
      <div className="wheel-stage__halo" aria-hidden="true" />
      <div className="wheel-stage__pointer" aria-hidden="true"><span /></div>
      <div className="wheel-stage__rotor" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: spinning ? `${durationMs}ms` : "0ms" }} onTransitionEnd={(event) => { if (event.propertyName === "transform" && spinning) onSpinEnd?.(); }}>
        <canvas ref={canvas} role="img" aria-label={alternative} />
      </div>
      <div className="wheel-stage__hub" aria-hidden="true"><span>ϟ</span><b>TR</b></div>
    </div>
  );
}

function drawWheel(canvas: HTMLCanvasElement, entries: WheelEntry[], config: WheelConfig) {
  const rect = canvas.getBoundingClientRect(); const size = Math.max(1, Math.floor(Math.min(rect.width || 640, rect.height || rect.width || 640))); const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
  const pixels = Math.floor(size * ratio); if (canvas.width !== pixels || canvas.height !== pixels) { canvas.width = pixels; canvas.height = pixels; }
  const context = canvas.getContext("2d"); if (!context) return; context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, size, size);
  const centre = size / 2; const radius = centre - Math.max(8, size * .025); const segments = entryAngles(entries); context.save(); context.translate(centre, centre);
  if (!segments.length) { context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fillStyle = "#171712"; context.fill(); context.strokeStyle = "#f3c928"; context.lineWidth = Math.max(2, size * .008); context.stroke(); context.restore(); return; }
  const density = segments.length <= 40 ? 1 : Math.ceil(segments.length / 40);
  segments.forEach(({ entry, start, end, centre: angle }, index) => {
    context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius, start - Math.PI / 2, end - Math.PI / 2); context.closePath(); context.fillStyle = entry.colour || config.palette[index % config.palette.length]; context.fill(); context.strokeStyle = "rgba(8,8,6,.72)"; context.lineWidth = Math.max(1, size * .0025); context.stroke();
    if (index % density || end - start < .025) return;
    const label = entry.label.length > (segments.length > 18 ? 14 : 24) ? `${entry.label.slice(0, segments.length > 18 ? 12 : 22)}…` : entry.label;
    context.save(); context.rotate(angle - Math.PI / 2); context.textAlign = "right"; context.textBaseline = "middle"; context.fillStyle = config.labelContrast === "dark" ? "#11110e" : "#fffdf3"; context.font = `700 ${Math.max(9, Math.min(18, size / (segments.length > 20 ? 42 : 31)))}px "Geist Mono", monospace`; context.shadowColor = config.labelContrast === "dark" ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.65)"; context.shadowBlur = 3; context.fillText(label, radius - size * .055, 0, radius * .64); context.restore();
  });
  const gradient = context.createRadialGradient(0, 0, radius * .5, 0, 0, radius); gradient.addColorStop(0, "transparent"); gradient.addColorStop(1, "rgba(0,0,0,.34)"); context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fillStyle = gradient; context.fill(); context.strokeStyle = "#d6ad13"; context.lineWidth = Math.max(5, size * .018); context.stroke(); context.restore();
}
