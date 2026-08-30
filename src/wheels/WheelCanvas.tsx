import { useEffect, useMemo, useRef } from "react";
import { entryAngles, entryAtPointer, hitTestWheel } from "./engine.mjs";
import type { WheelConfig, WheelEntry } from "./types";
import { WheelsBrandMark } from "./WheelsBrandMark";
import { pointerAccentShades, resolvedEntryStyle } from "./segmentStyles.mjs";
import { drawCoverImage, drawSegmentPattern } from "./segmentPatterns";
import type { WheelMediaAsset } from "./types";

type Props = { entries: WheelEntry[]; config: WheelConfig; rotation: number; durationMs: number; spinning: boolean; onSpinEnd?: () => void; onPointerTargetChange?: (entry: WheelEntry | null) => void; onSegmentSelect?: (entry: WheelEntry, trigger: HTMLCanvasElement) => void; onCentreSpin?: () => void; centreSpinDisabled?: boolean; centreSpinLabel?: string; compact?: boolean; centreImageUrl?: string | null; segmentMedia?: WheelMediaAsset[]; segmentPreviewUrls?: Record<string, string>; winner?: boolean };
type SegmentCanvasImage = { source: CanvasImageSource; width: number; height: number };
type DecodedGifFrame = CanvasImageSource & { close: () => void; displayWidth: number; displayHeight: number; duration?: number | null };
type GifDecoder = { tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } | null }; decode: (options: { frameIndex: number }) => Promise<{ image: DecodedGifFrame }>; close: () => void };
type GifDecoderConstructor = new (options: { data: ArrayBuffer; type: string }) => GifDecoder;
type GifState = { decoder: GifDecoder; frameCount: number; frameIndex: number; nextAt: number; busy: boolean; bitmap: ImageBitmap | null };

export function WheelCanvas({ entries, config, rotation, durationMs, spinning, onSpinEnd, onPointerTargetChange, onSegmentSelect, onCentreSpin, centreSpinDisabled = false, centreSpinLabel = "Spin wheel from centre", compact = false, centreImageUrl, segmentMedia = [], segmentPreviewUrls = {}, winner = false }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null); const rotor = useRef<HTMLDivElement>(null); const lastTarget = useRef<string | null>(null); const targetCallback = useRef(onPointerTargetChange);
  const active = entries.filter((entry) => entry.state === "active");
  const shades = useMemo(() => pointerAccentShades(config.pointerAccent), [config.pointerAccent]);
  const imageCache = useRef(new Map<string, SegmentCanvasImage>()); const gifCache = useRef(new Map<string, GifState>()); const redraw = useRef<() => void>(() => undefined);

  targetCallback.current = onPointerTargetChange;

  useEffect(() => {
    const element = canvas.current; if (!element) return;
    const cache = imageCache.current; const gifs = gifCache.current;
    const sources = new Map(segmentMedia.map((asset) => [asset.id, asset.url])); for (const [id, url] of Object.entries(segmentPreviewUrls)) sources.set(id, url);
    let disposed = false;
    const render = () => drawWheel(element, active, config, cache);
    redraw.current = render;
    for (const id of new Set(active.map((entry) => resolvedEntryStyle(entry, config)).filter((style) => style.mode === "image").map((style) => style.imageAssetId))) if (!cache.has(id) && sources.get(id)) {
      const url = sources.get(id)!; const image = new Image(); image.decoding = "async"; image.onload = () => { if (!disposed) { cache.set(id, { source: image, width: image.naturalWidth, height: image.naturalHeight }); render(); } }; image.src = url; cache.set(id, { source: image, width: 0, height: 0 });
      if (segmentMedia.some((asset) => asset.id === id && asset.contentType === "image/gif")) void prepareGif(id, url, cache, gifs, render, () => disposed);
    }
    render();
    const observer = new ResizeObserver(render); observer.observe(element);
    const animated = segmentMedia.some((asset) => asset.contentType === "image/gif" && cache.has(asset.id));
    const ticker = animated ? window.setInterval(() => { if (document.visibilityState === "visible") { advanceGifs(cache, gifs, render, () => disposed); render(); } }, 75) : null;
    return () => { disposed = true; observer.disconnect(); if (ticker != null) window.clearInterval(ticker); for (const state of gifs.values()) { state.bitmap?.close(); state.decoder.close(); } gifs.clear(); cache.clear(); };
  }, [active, config, segmentMedia, segmentPreviewUrls]);

  useEffect(() => {
    let frame = 0; let stopped = false;
    const publish = (degrees: number) => { const entry = entryAtPointer(active, degrees); const id = entry?.id || null; if (id !== lastTarget.current) { lastTarget.current = id; targetCallback.current?.(entry); } };
    const sample = () => { if (stopped) return; const transform = rotor.current ? getComputedStyle(rotor.current).transform : "none"; const matrix = transform === "none" ? null : new DOMMatrixReadOnly(transform); publish(matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : rotation); frame = requestAnimationFrame(sample); };
    if (spinning) frame = requestAnimationFrame(sample); else publish(rotation);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [active, rotation, spinning]);

  const alternative = active.length ? `Wheel with ${active.length} active participants: ${active.slice(0, 12).map((entry) => entry.label).join(", ")}${active.length > 12 ? ", and more" : ""}.` : "Wheel with no active participants.";
  return (
    <div className={`wheel-stage${compact ? " wheel-stage--compact" : ""}${spinning ? " is-spinning" : ""}${winner ? " is-winner" : ""}`} style={{ "--pointer": shades.base, "--pointer-dark": shades.dark, "--pointer-light": shades.light, "--pointer-glow": shades.glow } as React.CSSProperties}>
      <div className="wheel-stage__halo" aria-hidden="true" />
      <div className="wheel-stage__rim wheel-stage__rim--outer" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="wheel-stage__rim wheel-stage__rim--inner" aria-hidden="true" />
      <div className="wheel-stage__energy" aria-hidden="true" />
      <div className="wheel-stage__pointer" aria-hidden="true"><span className="wheel-stage__pointer-housing"><i className="wheel-stage__pointer-blade" /><i className="wheel-stage__pointer-groove" /></span></div>
      <div ref={rotor} className="wheel-stage__rotor" style={{ transform: `rotate(${rotation}deg)`, transitionDuration: spinning ? `${durationMs}ms` : "0ms" }} onTransitionEnd={(event) => { if (event.propertyName === "transform" && spinning) onSpinEnd?.(); }}>
        <canvas ref={canvas} role="img" aria-label={alternative} className={onSegmentSelect && !spinning ? "is-interactive" : undefined} onClick={(event) => { if (spinning || !onSegmentSelect) return; const rect = event.currentTarget.getBoundingClientRect(); const selected = hitTestWheel(active, { x: event.clientX - rect.left, y: event.clientY - rect.top }, Math.min(rect.width, rect.height), rotation); if (selected) onSegmentSelect(selected, event.currentTarget); }} />
      </div>
      {onCentreSpin ? <button type="button" className={`wheel-stage__hub is-spin-control${centreImageUrl ? " is-custom" : " is-default"}`} onClick={onCentreSpin} disabled={centreSpinDisabled} aria-label={centreSpinLabel}>{centreImageUrl ? <img src={centreImageUrl} alt="" decoding="async" /> : <WheelsBrandMark />}</button> : <div className={`wheel-stage__hub${centreImageUrl ? " is-custom" : " is-default"}`} aria-hidden="true">{centreImageUrl ? <img src={centreImageUrl} alt="" decoding="async" /> : <WheelsBrandMark />}</div>}
    </div>
  );
}

function drawWheel(canvas: HTMLCanvasElement, entries: WheelEntry[], config: WheelConfig, images: Map<string, SegmentCanvasImage>) {
  const rect = canvas.getBoundingClientRect(); const size = Math.max(1, Math.floor(Math.min(rect.width || 640, rect.height || rect.width || 640))); const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
  const pixels = Math.floor(size * ratio); if (canvas.width !== pixels || canvas.height !== pixels) { canvas.width = pixels; canvas.height = pixels; }
  const context = canvas.getContext("2d"); if (!context) return; context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, size, size);
  const centre = size / 2; const radius = centre - Math.max(8, size * .025); const segments = entryAngles(entries); context.save(); context.translate(centre, centre);
  if (!segments.length) { context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fillStyle = "#171712"; context.fill(); context.strokeStyle = config.pointerAccent; context.lineWidth = Math.max(2, size * .008); context.stroke(); context.restore(); return; }
  const density = segments.length <= 40 ? 1 : Math.ceil(segments.length / 40);
  segments.forEach(({ entry, start, end, centre: angle }, index) => {
    const style = resolvedEntryStyle(entry, config); const segmentColour = style.color; const radialAngle = angle - Math.PI / 2;
    context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius, start - Math.PI / 2, end - Math.PI / 2); context.closePath(); context.fillStyle = segmentColour; context.fill();
    if (style.mode !== "solid") { context.save(); context.clip(); if (style.mode === "pattern") drawSegmentPattern(context, style, radialAngle, radius); else { const image = images.get(style.imageAssetId); if (image?.width) drawCoverImage(context, image.source, image.width, image.height, radialAngle, radius, end - start); } context.restore(); }
    context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius, start - Math.PI / 2, end - Math.PI / 2); context.closePath(); context.strokeStyle = "rgba(8,8,6,.72)"; context.lineWidth = Math.max(1, size * .0025); context.stroke();
    if (index % density || end - start < .025) return;
    const label = entry.label.length > (segments.length > 18 ? 14 : 24) ? `${entry.label.slice(0, segments.length > 18 ? 12 : 22)}…` : entry.label;
    const useDarkLabel = config.labelContrast === "dark" || isExtraLight(segmentColour);
    context.save(); context.rotate(angle - Math.PI / 2); context.textAlign = "right"; context.textBaseline = "middle"; context.fillStyle = useDarkLabel ? "#171712" : "#fffdf3"; context.font = `700 ${Math.max(9, Math.min(18, size / (segments.length > 20 ? 42 : 31)))}px "Geist Mono", monospace`; context.shadowColor = useDarkLabel ? "rgba(255,255,255,.62)" : "rgba(0,0,0,.78)"; context.shadowBlur = useDarkLabel ? 2 : 4; context.fillText(label, radius - size * .055, 0, radius * .64); context.restore();
  });
  const gradient = context.createRadialGradient(0, 0, radius * .5, 0, 0, radius); gradient.addColorStop(0, "transparent"); gradient.addColorStop(1, "rgba(0,0,0,.34)"); context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fillStyle = gradient; context.fill(); context.strokeStyle = config.pointerAccent; context.lineWidth = Math.max(5, size * .018); context.stroke(); context.restore();
}

async function prepareGif(id: string, url: string, images: Map<string, SegmentCanvasImage>, gifs: Map<string, GifState>, render: () => void, disposed: () => boolean) {
  const Decoder = (window as unknown as { ImageDecoder?: GifDecoderConstructor }).ImageDecoder; if (!Decoder) return;
  try {
    const response = await fetch(url, { credentials: "same-origin" }); if (!response.ok || disposed()) return;
    const decoder = new Decoder({ data: await response.arrayBuffer(), type: "image/gif" }); await decoder.tracks.ready; const frameCount = decoder.tracks.selectedTrack?.frameCount || 0;
    if (frameCount < 2 || disposed()) { decoder.close(); return; }
    const state: GifState = { decoder, frameCount, frameIndex: 0, nextAt: 0, busy: false, bitmap: null }; gifs.set(id, state); await decodeGifFrame(id, state, 0, images, render, disposed);
  } catch { /* the loaded HTML image remains the safe static fallback */ }
}

function advanceGifs(images: Map<string, SegmentCanvasImage>, gifs: Map<string, GifState>, render: () => void, disposed: () => boolean) {
  const now = performance.now(); for (const [id, state] of gifs) if (!state.busy && now >= state.nextAt) void decodeGifFrame(id, state, (state.frameIndex + 1) % state.frameCount, images, render, disposed);
}

async function decodeGifFrame(id: string, state: GifState, frameIndex: number, images: Map<string, SegmentCanvasImage>, render: () => void, disposed: () => boolean) {
  state.busy = true;
  try {
    const decoded = await state.decoder.decode({ frameIndex }); const frame = decoded.image; const bitmap = await createImageBitmap(frame as unknown as ImageBitmapSource); const duration = Math.max(60, Math.min(2000, Number(frame.duration || 75_000) / 1000)); frame.close();
    if (disposed()) { bitmap.close(); return; }
    state.bitmap?.close(); state.bitmap = bitmap; state.frameIndex = frameIndex; state.nextAt = performance.now() + duration; images.set(id, { source: bitmap, width: bitmap.width, height: bitmap.height }); render();
  } catch { state.nextAt = performance.now() + 250; } finally { state.busy = false; }
}

function isExtraLight(colour: string) {
  const match = colour.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i); if (!match) return false;
  const hex = match[1].length === 3 ? [...match[1]].map((value) => value + value).join("") : match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16); const green = Number.parseInt(hex.slice(2, 4), 16); const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * .2126 + green * .7152 + blue * .0722) / 255 >= .72;
}
