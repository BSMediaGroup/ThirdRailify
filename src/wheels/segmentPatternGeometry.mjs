import { SEGMENT_PATTERN_IDS } from "./segmentStyles.mjs";

export const THIRD_RAIL_BOLT_POINTS = Object.freeze([
  [-0.3, -0.48], [-0.74, -0.48], [0.58, -1], [0.29, -0.16], [0.73, -0.16],
  [0.42, 0.34], [0.86, 0.34], [-0.46, 1], [-0.17, 0.16], [-0.61, 0.16],
]);
const IDS = new Set(SEGMENT_PATTERN_IDS);
const DIRECTIONAL = new Set(["diagonal-stripes", "reverse-stripes", "zigzag", "triangles", "chevrons", "waves", "third-rail-bolts"]);

export function patternDefinition(id, radius) {
  if (!IDS.has(id)) throw new Error("Unknown wheel segment pattern.");
  const boundedRadius = Math.max(32, Math.min(4096, Number(radius) || 320)); const base = Math.max(14, Math.min(34, boundedRadius * .09));
  return Object.freeze({ id, tile: id === "dots" ? base * .82 : id === "third-rail-bolts" ? base * 1.45 : id === "waves" ? base * 1.3 : base, orientation: DIRECTIONAL.has(id) ? "segment-radial" : "wheel-space", clipToSegment: true, highDprVector: true, usesBaseColour: true, usesPatternColour: true, boltSource: id === "third-rail-bolts" ? "assets/icons/trzap-0.svg" : null });
}

export function coverImageGeometry(imageWidth, imageHeight, radius, span) {
  const safeWidth = Math.max(1, Number(imageWidth) || 1); const safeHeight = Math.max(1, Number(imageHeight) || 1); const safeRadius = Math.max(1, Number(radius) || 1);
  const tangent = Math.max(safeRadius * .2, Math.min(safeRadius * 2, safeRadius * 2 * Math.sin(Math.min(Math.PI, Math.max(0, Number(span) || 0)) / 2)));
  const scale = Math.max(safeRadius / safeHeight, tangent / safeWidth);
  const cropWidth = tangent / scale; const cropHeight = safeRadius / scale;
  return Object.freeze({ tangent, scale, width: safeWidth * scale, height: safeHeight * scale, centreX: safeRadius / 2, centreY: 0, imageRotation: Math.PI / 2, cropWidth, cropHeight, cropX: (safeWidth - cropWidth) / 2, cropY: (safeHeight - cropHeight) / 2 });
}
