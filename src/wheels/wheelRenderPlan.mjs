import { entryAngles } from "./engine.mjs";
import { coverImageGeometry, patternDefinition } from "./segmentPatternGeometry.mjs";
import { resolvedEntryStyle } from "./segmentStyles.mjs";

export const WHEEL_LABEL_FONT_FAMILY = '"Geist Mono", monospace';
export const WHEEL_LABEL_FONT_WEIGHT = 700;

// One physical wheel, expressed as ratios of its non-rotating outer frame.
export const WHEEL_GEOMETRY = Object.freeze({
  faceToOuterRatio: .8759,
  hubToOuterRatio: .22,
  hubPaddingRatio: .015,
  outerRimInsetRatio: .008,
  innerRimInsetRatio: .03,
  pointerWidthRatio: .1,
  pointerHeightRatio: .15,
  pointerTopRatio: -.002,
  dprCap: 3,
});

export function resolveWheelGeometry(requestedDiameterCssPx, devicePixelRatio = 1) {
  const requestedDiameter = Math.max(1, Number(requestedDiameterCssPx) || 1);
  const dpr = Math.min(Math.max(1, Number(devicePixelRatio) || 1), WHEEL_GEOMETRY.dprCap);
  const requestedPhysicalSide = requestedDiameter * dpr;
  const physicalSide = Math.max(2, Math.round(requestedPhysicalSide / 2) * 2);
  const cssDiameter = physicalSide / dpr;
  const centreCss = cssDiameter / 2;
  const centrePhysical = physicalSide / 2;
  const outerRadius = centreCss;
  const faceRadius = outerRadius * WHEEL_GEOMETRY.faceToOuterRatio;
  const hubRadius = outerRadius * WHEEL_GEOMETRY.hubToOuterRatio;
  const ringRadii = Object.freeze({
    outer: outerRadius * (1 - 2 * WHEEL_GEOMETRY.outerRimInsetRatio),
    inner: outerRadius * (1 - 2 * WHEEL_GEOMETRY.innerRimInsetRatio),
    faceBoundary: faceRadius,
    light: outerRadius * (1 + .03),
  });
  const pointerGeometry = Object.freeze({
    width: cssDiameter * WHEEL_GEOMETRY.pointerWidthRatio,
    height: cssDiameter * WHEEL_GEOMETRY.pointerHeightRatio,
    top: cssDiameter * WHEEL_GEOMETRY.pointerTopRatio,
  });
  return Object.freeze({
    requestedDiameter,
    requestedPhysicalSide,
    cssDiameter,
    physicalSide,
    diameter: cssDiameter,
    outerDiameter: cssDiameter,
    outerRadius,
    rotorDiameter: cssDiameter,
    canvasCssSide: cssDiameter,
    canvasBackingSide: physicalSide,
    centreCss,
    centrePhysical,
    faceRadius,
    faceDiameter: faceRadius * 2,
    hubRadius,
    hubDiameter: hubRadius * 2,
    faceToOuterRatio: WHEEL_GEOMETRY.faceToOuterRatio,
    hubToOuterRatio: WHEEL_GEOMETRY.hubToOuterRatio,
    blackBandWidth: ringRadii.inner - faceRadius,
    ringRadii,
    pointerGeometry,
    dpr,
  });
}

export function createWheelRenderPlan(entries, config, geometry, measureLabel, imageDimensions = new Map()) {
  const size = geometry.cssDiameter;
  const centre = geometry.centreCss;
  const radius = geometry.faceRadius;
  const angles = entryAngles(entries);
  const density = angles.length <= 40 ? 1 : Math.ceil(angles.length / 40);
  const segmentGeometry = Object.freeze({ size, centre, radius, hubRadius: geometry.hubRadius, count: angles.length, density });
  const segments = angles.map((segment, index) => segmentRenderPlan(segment, index, segmentGeometry, config, measureLabel, imageDimensions));
  return Object.freeze({ size, centre, radius, hubRadius: geometry.hubRadius, outerDiameter: geometry.outerDiameter, faceToOuterRatio: geometry.faceToOuterRatio, hubToOuterRatio: geometry.hubToOuterRatio, density, segments: Object.freeze(segments) });
}

export function segmentRenderPlan(segment, index, geometry, config, measureLabel = approximateLabelWidth, imageDimensions = new Map()) {
  const { entry, start, end, centre: midpoint } = segment;
  const span = end - start;
  const radialAngle = midpoint - Math.PI / 2;
  const style = resolvedEntryStyle(entry, config);
  const label = truncateLabel(entry.label, geometry.count);
  const maxFontSize = Math.max(9, Math.min(18, geometry.size / (geometry.count > 20 ? 42 : 31)));
  const minFontSize = Math.min(9, maxFontSize);
  const labelRadius = geometry.radius - geometry.size * .055;
  const labelMaxWidth = Math.max(1, geometry.radius * .64);
  const tangentSpan = Math.max(1, 2 * labelRadius * Math.sin(Math.min(Math.PI, span) / 2));
  const tangentAllowance = Math.max(minFontSize, tangentSpan - Math.max(4, geometry.size * .012));
  const measuredAtMax = Math.max(1, measureLabel(label, maxFontSize));
  const fittedFontSize = Math.max(minFontSize, Math.min(maxFontSize, maxFontSize * labelMaxWidth / measuredAtMax, tangentAllowance / 1.18));
  const fontSize = round(fittedFontSize);
  const measuredWidth = round(measureLabel(label, fontSize));
  const pattern = style.mode === "pattern" ? patternMetrics(style.pattern, geometry.radius) : null;
  const dimensions = style.mode === "image" ? imageDimensions.get(style.imageAssetId) : null;
  const image = style.mode === "image" && dimensions?.width && dimensions?.height
    ? Object.freeze({ assetId: style.imageAssetId, ...coverImageGeometry(dimensions.width, dimensions.height, geometry.radius, span), localOrientation: Math.PI / 2 })
    : null;
  return Object.freeze({
    entry,
    index,
    start,
    end,
    midpoint,
    span,
    radialAngle,
    radialSpan: Object.freeze({ inner: geometry.hubRadius, outer: geometry.radius, length: geometry.radius - geometry.hubRadius }),
    tangentSpan: round(tangentSpan),
    style,
    label: Object.freeze({ text: label, visible: index % geometry.density === 0 && span >= .025, fontSize, measuredWidth, maxWidth: round(labelMaxWidth), anchorX: round(labelRadius), anchorY: 0, baseline: "middle", orientation: radialAngle }),
    pattern,
    image,
  });
}

function patternMetrics(id, radius) {
  const definition = patternDefinition(id, radius);
  const tile = definition.tile;
  return Object.freeze({
    ...definition,
    tileWidth: round(tile),
    tileHeight: round(id === "chevrons" ? tile * 1.3 : id === "third-rail-bolts" ? tile * 1.55 : tile),
    lineWidth: round(Math.max(1.5, tile * .16)),
    dotRadius: round(tile * .18),
    extent: round(radius * 1.45),
    originX: round(-radius * 1.45),
    originY: round(-radius * 1.45),
    scale: 1,
  });
}

function truncateLabel(label, count) {
  const limit = count > 18 ? 14 : 24;
  const retained = count > 18 ? 12 : 22;
  return label.length > limit ? `${label.slice(0, retained)}…` : label;
}

function approximateLabelWidth(label, fontSize) {
  return Math.max(1, String(label).length * Number(fontSize) * .62);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
