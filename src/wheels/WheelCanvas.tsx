import { useEffect, useMemo, useRef } from "react";
import { countSegmentBoundaryCrossings, entryAtPointer, hitTestWheel, segmentBoundaryRotations } from "./engine.mjs";
import type { WheelSpinPlan } from "./engine.mjs";
import { progressAt, spinRotationAtTime } from "./mechanics.mjs";
import type { WheelConfig, WheelEntry, WheelMediaAsset } from "./types";
import { WheelsBrandMark } from "./WheelsBrandMark";
import { pointerAccentShades } from "./segmentStyles.mjs";
import { drawCoverImage, drawSegmentPattern } from "./segmentPatterns";
import { createWheelRenderPlan, resolveWheelGeometry, WHEEL_GEOMETRY, WHEEL_LABEL_FONT_FAMILY, WHEEL_LABEL_FONT_WEIGHT } from "./wheelRenderPlan.mjs";
import type { WheelGeometry, WheelRenderPlan, WheelSegmentRenderPlan } from "./wheelRenderPlan.mjs";

type Props = { entries: WheelEntry[]; config: WheelConfig; rotation: number; durationMs: number; spinning: boolean; animation?: WheelSpinPlan | null; reducedMotion?: boolean; onSpinEnd?: () => void; onBoundaryCrossing?: (count: number) => void; onPointerTargetChange?: (entry: WheelEntry | null) => void; onSegmentSelect?: (entry: WheelEntry, trigger: HTMLCanvasElement) => void; onCentreSpin?: () => void; centreSpinDisabled?: boolean; centreSpinLabel?: string; compact?: boolean; centreImageUrl?: string | null; segmentMedia?: WheelMediaAsset[]; segmentPreviewUrls?: Record<string, string>; winner?: boolean };
type SegmentCanvasImage = { source: CanvasImageSource; width: number; height: number };
type DecodedGifFrame = CanvasImageSource & { close: () => void; displayWidth: number; displayHeight: number; duration?: number | null };
type GifDecoder = { tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } | null }; decode: (options: { frameIndex: number }) => Promise<{ image: DecodedGifFrame }>; close: () => void };
type GifDecoderConstructor = new (options: { data: ArrayBuffer; type: string }) => GifDecoder;
type GifState = { decoder: GifDecoder; frameCount: number; frameIndex: number; nextAt: number; busy: boolean; bitmap: ImageBitmap | null };
type RendererMetrics = { version: "wheel-renderer-v19"; geometryVersion: "canonical-square-v113"; size: number; outerDiameter: number; faceDiameter: number; faceToOuterRatio: number; hubToOuterRatio: number; dpr: number; pixels: number; planBuilds: number; staticFaceRebuilds: number; faceComposites: number; gifLayerComposites: number; gifFramesDecoded: number; measureTextCalls: number; patternConstructions: number; imageCoverCalculations: number; resizeInvalidations: number; lastReason: string; plan: WheelRenderPlan | null };
  type SpinMetrics = { version: "wheel-spin-v2"; id: string; startAt: number; firstFrameAt: number | null; durationMs: number; startRotation: number; finalRotation: number; frameCount: number; lastFrameAt: number; lastFrameRotation: number; finalFrameRotation: number | null; expectedFinalFrameDelta: number | null; actualFinalFrameDelta: number | null; settledAt: number | null; completed: boolean; reducedMotion: boolean; mechanicsVersion: number; curveProfile: string; mechanicsRevision: number | null };
type InstrumentedCanvas = HTMLCanvasElement & { __wheelRendererV19?: RendererMetrics; __wheelSpinV110?: SpinMetrics };
type FaceCache = { size: number; ratio: number; pixels: number; geometry: WheelGeometry; plan: WheelRenderPlan; underlay: HTMLCanvasElement; foreground: HTMLCanvasElement };

const EMPTY_MEDIA: WheelMediaAsset[] = [];
const EMPTY_PREVIEWS: Record<string, string> = {};

export function WheelCanvas({ entries, config, rotation, durationMs, spinning, animation = null, reducedMotion = false, onSpinEnd, onBoundaryCrossing, onPointerTargetChange, onSegmentSelect, onCentreSpin, centreSpinDisabled = false, centreSpinLabel = "Spin wheel from centre", compact = false, centreImageUrl, segmentMedia = EMPTY_MEDIA, segmentPreviewUrls = EMPTY_PREVIEWS, winner = false }: Props) {
  const frame = useRef<HTMLDivElement>(null); const canvas = useRef<InstrumentedCanvas>(null); const rotor = useRef<HTMLDivElement>(null); const lastTarget = useRef<string | null>(null); const targetCallback = useRef(onPointerTargetChange);
  const spinEndCallback = useRef(onSpinEnd);
  const boundaryCallback = useRef(onBoundaryCrossing);
  const active = useMemo(() => entries.filter((entry) => entry.state === "active"), [entries]);
  const boundaries = useMemo(() => segmentBoundaryRotations(active), [active]);
  const shades = useMemo(() => pointerAccentShades(config.pointerAccent), [config.pointerAccent]);
  const imageCache = useRef(new Map<string, SegmentCanvasImage>()); const gifCache = useRef(new Map<string, GifState>());

  targetCallback.current = onPointerTargetChange;
  spinEndCallback.current = onSpinEnd;
  boundaryCallback.current = onBoundaryCrossing;

  useEffect(() => {
    const frameElement = frame.current; const element = canvas.current; const rotorElement = rotor.current; if (!frameElement || !element || !rotorElement) return;
    const images = imageCache.current; const gifs = gifCache.current;
    const sources = new Map(segmentMedia.map((asset) => [asset.id, asset.url])); for (const [id, url] of Object.entries(segmentPreviewUrls)) sources.set(id, url);
    const animatedIds = new Set(segmentMedia.filter((asset) => asset.contentType === "image/gif").map((asset) => asset.id));
    const dimensions = new Map(segmentMedia.filter((asset) => asset.width && asset.height).map((asset) => [asset.id, { width: Number(asset.width), height: Number(asset.height) }]));
    const metrics: RendererMetrics = { version: "wheel-renderer-v19", geometryVersion: "canonical-square-v113", size: 0, outerDiameter: 0, faceDiameter: 0, faceToOuterRatio: WHEEL_GEOMETRY.faceToOuterRatio, hubToOuterRatio: WHEEL_GEOMETRY.hubToOuterRatio, dpr: 0, pixels: 0, planBuilds: 0, staticFaceRebuilds: 0, faceComposites: 0, gifLayerComposites: 0, gifFramesDecoded: 0, measureTextCalls: 0, patternConstructions: 0, imageCoverCalculations: 0, resizeInvalidations: 0, lastReason: "initial", plan: null };
    element.__wheelRendererV19 = metrics;
    let face: FaceCache | null = null; let disposed = false;

    const compose = (reason: string) => {
      if (disposed || !face) return;
      const context = element.getContext("2d"); if (!context) return;
      ensureCanvasPixels(element, face.pixels); context.setTransform(face.ratio, 0, 0, face.ratio, 0, 0); context.clearRect(0, 0, face.size, face.size); context.drawImage(face.underlay, 0, 0, face.size, face.size);
      context.save(); context.translate(face.plan.centre, face.plan.centre);
      let animatedDrawn = false;
      for (const segment of face.plan.segments) {
        if (segment.style.mode !== "image" || !animatedIds.has(segment.style.imageAssetId)) continue;
        const image = images.get(segment.style.imageAssetId); if (!image?.width || !segment.image) continue;
        context.save(); segmentPath(context, segment, face.plan.radius); context.clip(); drawCoverImage(context, image.source, image.width, image.height, segment.radialAngle, face.plan.radius, segment.span, segment.image); context.restore(); animatedDrawn = true;
      }
      context.restore(); context.drawImage(face.foreground, 0, 0, face.size, face.size);
      metrics.faceComposites += 1; if (animatedDrawn) metrics.gifLayerComposites += 1; metrics.lastReason = reason;
    };

    const rebuild = (reason: string, countResize = false) => {
      if (disposed) return;
      const diameter = frameElement.clientWidth || 640; const geometry = resolveWheelGeometry(diameter, window.devicePixelRatio || 1); const size = Math.max(1, Math.floor(geometry.canvasCssSide)); const ratio = geometry.dpr; const pixels = geometry.canvasBackingSide;
      if (countResize && face && face.size === size && face.ratio === ratio && face.pixels === pixels && Math.abs(face.geometry.outerDiameter - geometry.outerDiameter) < .01) return;
      if (countResize) metrics.resizeInvalidations += 1;
      const underlay = layerCanvas(pixels); const foreground = layerCanvas(pixels); const measureContext = foreground.getContext("2d"); if (!measureContext) return;
      const measureLabel = (label: string, fontSize: number) => { metrics.measureTextCalls += 1; measureContext.font = `${WHEEL_LABEL_FONT_WEIGHT} ${fontSize}px ${WHEEL_LABEL_FONT_FAMILY}`; return measureContext.measureText(label).width; };
      const plan = createWheelRenderPlan(active, config, size, measureLabel, dimensions, geometry.outerDiameter); metrics.planBuilds += 1; metrics.imageCoverCalculations += plan.segments.filter((segment) => segment.image).length;
      drawUnderlay(underlay, plan, ratio, images, animatedIds, metrics); drawForeground(foreground, plan, ratio, config);
      face = { size, ratio, pixels, geometry, plan, underlay, foreground }; metrics.size = size; metrics.outerDiameter = geometry.outerDiameter; metrics.faceDiameter = geometry.faceDiameter; metrics.faceToOuterRatio = geometry.faceToOuterRatio; metrics.hubToOuterRatio = geometry.hubToOuterRatio; metrics.dpr = ratio; metrics.pixels = pixels; metrics.plan = plan; metrics.staticFaceRebuilds += 1; metrics.lastReason = reason; compose(reason);
    };

    const usedImageIds = new Set(active.map((entry, index) => {
      if (entry.style?.mode === "image") return entry.style.imageAssetId;
      const paletteStyles = config.paletteStyles || []; const style = paletteStyles.length ? paletteStyles[index % paletteStyles.length] : null; return style?.mode === "image" ? style.imageAssetId : null;
    }).filter((id): id is string => Boolean(id)));
    for (const id of usedImageIds) if (!images.has(id) && sources.get(id)) {
      const url = sources.get(id)!; const image = new Image(); image.decoding = "async"; if (new URL(url, window.location.origin).origin !== window.location.origin) image.crossOrigin = "anonymous"; image.onload = () => { if (!disposed) { images.set(id, { source: image, width: image.naturalWidth, height: image.naturalHeight }); dimensions.set(id, { width: image.naturalWidth, height: image.naturalHeight }); rebuild("media-loaded"); } }; image.src = url; images.set(id, { source: image, width: 0, height: 0 });
      if (animatedIds.has(id)) void prepareGif(id, url, images, gifs, () => { metrics.gifFramesDecoded += 1; compose("gif-frame"); }, () => disposed);
    }
    rebuild("initial");
    const resize = () => rebuild("resize", true); const observer = new ResizeObserver(resize); observer.observe(frameElement); window.addEventListener("resize", resize);
    void document.fonts?.ready.then(() => { if (!disposed) rebuild("fonts-ready"); });
    const ticker = animatedIds.size ? window.setInterval(() => { if (document.visibilityState === "visible") advanceGifs(images, gifs, () => { metrics.gifFramesDecoded += 1; compose("gif-frame"); }, () => disposed); }, 75) : null;
    return () => { disposed = true; observer.disconnect(); window.removeEventListener("resize", resize); if (ticker != null) window.clearInterval(ticker); for (const state of gifs.values()) { state.bitmap?.close(); state.decoder.close(); } gifs.clear(); images.clear(); delete element.__wheelRendererV19; };
  }, [active, config, segmentMedia, segmentPreviewUrls]);

  useEffect(() => {
    let frame = 0; let stopped = false;
    const publish = (degrees: number) => { const entry = entryAtPointer(active, degrees); const id = entry?.id || null; if (id !== lastTarget.current) { lastTarget.current = id; targetCallback.current?.(entry); } };
    const sample = () => { if (stopped) return; const transform = rotor.current ? getComputedStyle(rotor.current).transform : "none"; const matrix = transform === "none" ? null : new DOMMatrixReadOnly(transform); publish(matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : rotation); frame = requestAnimationFrame(sample); };
    if (spinning) frame = requestAnimationFrame(sample); else publish(rotation);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [active, rotation, spinning]);

  useEffect(() => {
    const element = canvas.current; const rotorElement = rotor.current;
    if (!element || !rotorElement || !spinning || !animation) { if (rotorElement && !spinning) rotorElement.style.transform = `rotate(${rotation}deg)`; return; }
    let frame = 0; let stopped = false; let completed = false;
    const startAt = Number.isFinite(animation.startAt) ? Number(animation.startAt) : performance.now();
    const duration = Math.max(0, animation.durationMs); const id = animation.id || `${animation.winnerId}:${startAt}`;
    let lastBoundaryRotation = animation.startRotation;
    const metrics: SpinMetrics = { version: "wheel-spin-v2", id, startAt, firstFrameAt: null, durationMs: duration, startRotation: animation.startRotation, finalRotation: animation.finalRotation, frameCount: 0, lastFrameAt: startAt, lastFrameRotation: animation.startRotation, finalFrameRotation: null, expectedFinalFrameDelta: null, actualFinalFrameDelta: null, settledAt: null, completed: false, reducedMotion, mechanicsVersion: animation.mechanics.mechanicsVersion, curveProfile: animation.mechanics.curveProfile, mechanicsRevision: animation.mechanicsRevision };
    element.__wheelSpinV110 = metrics; rotorElement.style.transform = `rotate(${animation.startRotation}deg)`;
    const finish = (now: number, expectedDelta: number) => {
      if (completed || stopped) return; completed = true;
      const before = metrics.lastFrameRotation; rotorElement.style.transform = `rotate(${animation.finalRotation}deg)`;
      if (!reducedMotion) { const crossings = countSegmentBoundaryCrossings(boundaries, lastBoundaryRotation, animation.finalRotation); if (crossings) boundaryCallback.current?.(crossings); }
      metrics.finalFrameRotation = animation.finalRotation; metrics.expectedFinalFrameDelta = expectedDelta; metrics.actualFinalFrameDelta = animation.finalRotation - before; metrics.lastFrameAt = now; metrics.settledAt = now; metrics.completed = true;
      spinEndCallback.current?.();
    };
    if (reducedMotion || duration === 0) { frame = requestAnimationFrame((now) => finish(now, animation.finalRotation - animation.startRotation)); return () => { stopped = true; cancelAnimationFrame(frame); }; }
    const sample = (now: number) => {
      if (stopped) return;
      if (now < startAt) { frame = requestAnimationFrame(sample); return; }
      metrics.firstFrameAt ??= now; const elapsed = Math.min(duration, now - startAt); const nextRotation = spinRotationAtTime(animation, elapsed);
      if (elapsed >= duration) { const previousElapsed = Math.max(0, metrics.lastFrameAt - startAt); const expectedDelta = animation.totalTravel * (1 - progressAt(animation.compiledMechanics, previousElapsed / duration)); finish(now, expectedDelta); return; }
      const crossings = countSegmentBoundaryCrossings(boundaries, lastBoundaryRotation, nextRotation); if (crossings) boundaryCallback.current?.(crossings); lastBoundaryRotation = nextRotation;
      rotorElement.style.transform = `rotate(${nextRotation}deg)`; metrics.frameCount += 1; metrics.lastFrameAt = now; metrics.lastFrameRotation = nextRotation; frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [animation, boundaries, reducedMotion, rotation, spinning]);

  const alternative = active.length ? `Wheel with ${active.length} active participants: ${active.slice(0, 12).map((entry) => entry.label).join(", ")}${active.length > 12 ? ", and more" : ""}.` : "Wheel with no active participants.";
  const geometryStyle = { "--wheel-rotor-inset": `${WHEEL_GEOMETRY.rotorInsetRatio * 100}%`, "--wheel-rim-outer-inset": `${WHEEL_GEOMETRY.outerRimInsetRatio * 100}%`, "--wheel-rim-inner-inset": `${WHEEL_GEOMETRY.innerRimInsetRatio * 100}%`, "--wheel-hub-inset": `${(1 - WHEEL_GEOMETRY.hubToOuterRatio) * 50}%`, "--wheel-hub-padding": `${WHEEL_GEOMETRY.hubPaddingRatio * 100}%`, "--wheel-pointer-width": `${WHEEL_GEOMETRY.pointerWidthRatio * 100}%`, "--wheel-pointer-height": `${WHEEL_GEOMETRY.pointerHeightRatio * 100}%`, "--wheel-pointer-top": `${WHEEL_GEOMETRY.pointerTopRatio * 100}%`, "--pointer": shades.base, "--pointer-dark": shades.dark, "--pointer-light": shades.light, "--pointer-glow": shades.glow } as React.CSSProperties;
  return (
    <div ref={frame} className={`wheel-stage${compact ? " wheel-stage--compact" : ""}${spinning ? " is-spinning" : ""}${winner ? " is-winner" : ""}`} style={geometryStyle} data-wheel-geometry="canonical-square-v113">
      <div className="wheel-stage__halo" aria-hidden="true" />
      <div className="wheel-stage__rim wheel-stage__rim--outer" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="wheel-stage__rim wheel-stage__rim--inner" aria-hidden="true" />
      <div className="wheel-stage__energy" aria-hidden="true" />
      <div className="wheel-stage__pointer" aria-hidden="true"><span className="wheel-stage__pointer-housing"><i className="wheel-stage__pointer-blade" /><i className="wheel-stage__pointer-groove" /></span></div>
      <div ref={rotor} className="wheel-stage__rotor" style={{ transform: `rotate(${spinning && animation ? animation.startRotation : rotation}deg)`, transitionDuration: "0ms" }} data-spin-duration-ms={spinning && animation ? animation.durationMs : durationMs}>
        <canvas ref={canvas} role="img" aria-label={alternative} className={onSegmentSelect && !spinning ? "is-interactive" : undefined} onClick={(event) => { if (spinning || !onSegmentSelect) return; const parent = event.currentTarget.parentElement; const stage = event.currentTarget.closest<HTMLElement>(".wheel-stage"); if (!parent || !stage) return; const stageRect = stage.getBoundingClientRect(); const size = parent.clientWidth; const transform = getComputedStyle(parent).transform; const matrix = transform === "none" ? null : new DOMMatrixReadOnly(transform); const renderedRotation = matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : rotation; const selected = hitTestWheel(active, { x: event.clientX - (stageRect.left + stageRect.width / 2) + size / 2, y: event.clientY - (stageRect.top + stageRect.height / 2) + size / 2 }, size, renderedRotation); if (selected) onSegmentSelect(selected, event.currentTarget); }} />
      </div>
      {onCentreSpin ? <button type="button" className={`wheel-stage__hub is-spin-control${centreImageUrl ? " is-custom" : " is-default"}`} onClick={onCentreSpin} disabled={centreSpinDisabled} aria-label={centreSpinLabel}>{centreImageUrl ? <img src={centreImageUrl} alt="" decoding="async" /> : <WheelsBrandMark />}</button> : <div className={`wheel-stage__hub${centreImageUrl ? " is-custom" : " is-default"}`} aria-hidden="true">{centreImageUrl ? <img src={centreImageUrl} alt="" decoding="async" /> : <WheelsBrandMark />}</div>}
    </div>
  );
}

function drawUnderlay(canvas: HTMLCanvasElement, plan: WheelRenderPlan, ratio: number, images: Map<string, SegmentCanvasImage>, animatedIds: Set<string>, metrics: RendererMetrics) {
  const context = canvas.getContext("2d"); if (!context) return; context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, plan.size, plan.size); context.save(); context.translate(plan.centre, plan.centre);
  if (!plan.segments.length) { context.beginPath(); context.arc(0, 0, plan.radius, 0, Math.PI * 2); context.fillStyle = "#171712"; context.fill(); context.restore(); return; }
  for (const segment of plan.segments) {
    segmentPath(context, segment, plan.radius); context.fillStyle = segment.style.color; context.fill();
    if (segment.style.mode === "pattern" && segment.pattern) { context.save(); context.clip(); drawSegmentPattern(context, segment.style, segment.radialAngle, plan.radius, segment.pattern); context.restore(); metrics.patternConstructions += 1; }
    if (segment.style.mode === "image" && !animatedIds.has(segment.style.imageAssetId)) { const image = images.get(segment.style.imageAssetId); if (image?.width && segment.image) { context.save(); context.clip(); drawCoverImage(context, image.source, image.width, image.height, segment.radialAngle, plan.radius, segment.span, segment.image); context.restore(); } }
  }
  context.restore();
}

function drawForeground(canvas: HTMLCanvasElement, plan: WheelRenderPlan, ratio: number, config: WheelConfig) {
  const context = canvas.getContext("2d"); if (!context) return; context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, plan.size, plan.size); context.save(); context.translate(plan.centre, plan.centre);
  for (const segment of plan.segments) {
    segmentPath(context, segment, plan.radius); context.strokeStyle = "rgba(8,8,6,.72)"; context.lineWidth = Math.max(1, plan.size * .0025); context.stroke();
    if (!segment.label.visible) continue;
    const useDarkLabel = config.labelContrast === "dark" || isExtraLight(segment.style.color); context.save(); context.rotate(segment.radialAngle); context.textAlign = "right"; context.textBaseline = "middle"; context.fillStyle = useDarkLabel ? "#171712" : "#fffdf3"; context.font = `${WHEEL_LABEL_FONT_WEIGHT} ${segment.label.fontSize}px ${WHEEL_LABEL_FONT_FAMILY}`; context.shadowColor = useDarkLabel ? "rgba(255,255,255,.62)" : "rgba(0,0,0,.78)"; context.shadowBlur = useDarkLabel ? 2 : 4; context.fillText(segment.label.text, segment.label.anchorX, 0); context.restore();
  }
  const gradient = context.createRadialGradient(0, 0, plan.radius * .5, 0, 0, plan.radius); gradient.addColorStop(0, "transparent"); gradient.addColorStop(1, "rgba(0,0,0,.34)"); context.beginPath(); context.arc(0, 0, plan.radius, 0, Math.PI * 2); context.fillStyle = gradient; context.fill(); context.strokeStyle = config.pointerAccent; context.lineWidth = Math.max(5, plan.size * .018); context.stroke(); context.restore();
}

function segmentPath(context: CanvasRenderingContext2D, segment: WheelSegmentRenderPlan, radius: number) { context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius, segment.start - Math.PI / 2, segment.end - Math.PI / 2); context.closePath(); }
function layerCanvas(pixels: number) { const canvas = document.createElement("canvas"); canvas.width = pixels; canvas.height = pixels; return canvas; }
function ensureCanvasPixels(canvas: HTMLCanvasElement, pixels: number) { if (canvas.width !== pixels || canvas.height !== pixels) { canvas.width = pixels; canvas.height = pixels; } }

async function prepareGif(id: string, url: string, images: Map<string, SegmentCanvasImage>, gifs: Map<string, GifState>, composite: () => void, disposed: () => boolean) {
  const Decoder = (window as unknown as { ImageDecoder?: GifDecoderConstructor }).ImageDecoder; if (!Decoder) return;
  try { const response = await fetch(url, { credentials: "same-origin" }); if (!response.ok || disposed()) return; const decoder = new Decoder({ data: await response.arrayBuffer(), type: "image/gif" }); await decoder.tracks.ready; const frameCount = decoder.tracks.selectedTrack?.frameCount || 0; if (frameCount < 2 || disposed()) { decoder.close(); return; } const state: GifState = { decoder, frameCount, frameIndex: 0, nextAt: 0, busy: false, bitmap: null }; gifs.set(id, state); await decodeGifFrame(id, state, 0, images, composite, disposed); } catch { /* loaded image remains the static fallback */ }
}
function advanceGifs(images: Map<string, SegmentCanvasImage>, gifs: Map<string, GifState>, composite: () => void, disposed: () => boolean) { const now = performance.now(); for (const [id, state] of gifs) if (!state.busy && now >= state.nextAt) void decodeGifFrame(id, state, (state.frameIndex + 1) % state.frameCount, images, composite, disposed); }
async function decodeGifFrame(id: string, state: GifState, frameIndex: number, images: Map<string, SegmentCanvasImage>, composite: () => void, disposed: () => boolean) { state.busy = true; try { const decoded = await state.decoder.decode({ frameIndex }); const frame = decoded.image; const bitmap = await createImageBitmap(frame as unknown as ImageBitmapSource); const duration = Math.max(60, Math.min(2000, Number(frame.duration || 75_000) / 1000)); frame.close(); if (disposed()) { bitmap.close(); return; } state.bitmap?.close(); state.bitmap = bitmap; state.frameIndex = frameIndex; state.nextAt = performance.now() + duration; images.set(id, { source: bitmap, width: bitmap.width, height: bitmap.height }); composite(); } catch { state.nextAt = performance.now() + 250; } finally { state.busy = false; } }

function isExtraLight(colour: string) { const match = colour.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i); if (!match) return false; const hex = match[1].length === 3 ? [...match[1]].map((value) => value + value).join("") : match[1]; const red = Number.parseInt(hex.slice(0, 2), 16); const green = Number.parseInt(hex.slice(2, 4), 16); const blue = Number.parseInt(hex.slice(4, 6), 16); return (red * .2126 + green * .7152 + blue * .0722) / 255 >= .72; }
