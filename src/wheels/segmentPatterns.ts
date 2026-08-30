import type { SegmentStyle } from "./segmentStyles.mjs";
import { coverImageGeometry, patternDefinition, THIRD_RAIL_BOLT_POINTS } from "./segmentPatternGeometry.mjs";

export function patternTileSize(pattern: string, radius: number) {
  return patternDefinition(pattern, radius).tile;
}

export function drawSegmentPattern(context: CanvasRenderingContext2D, style: Extract<SegmentStyle, { mode: "pattern" }>, radialAngle: number, radius: number) {
  const tile = patternTileSize(style.pattern, radius); const extent = radius * 1.45;
  context.save(); context.rotate(radialAngle); context.strokeStyle = style.patternColor; context.fillStyle = style.patternColor; context.lineWidth = Math.max(1.5, tile * .16); context.globalAlpha = .58;
  if (style.pattern === "dots") {
    for (let x = -extent; x <= extent; x += tile) for (let y = -extent; y <= extent; y += tile) { context.beginPath(); context.arc(x + ((Math.round(y / tile) & 1) ? tile / 2 : 0), y, tile * .18, 0, Math.PI * 2); context.fill(); }
  } else if (style.pattern === "checkers") {
    for (let x = -extent; x <= extent; x += tile) for (let y = -extent; y <= extent; y += tile) if ((Math.round(x / tile) + Math.round(y / tile)) % 2 === 0) context.fillRect(x, y, tile, tile);
  } else if (style.pattern === "triangles") {
    for (let x = -extent; x <= extent; x += tile) for (let y = -extent; y <= extent; y += tile) { context.beginPath(); context.moveTo(x, y + tile); context.lineTo(x + tile / 2, y); context.lineTo(x + tile, y + tile); context.closePath(); context.fill(); }
  } else if (style.pattern === "zigzag" || style.pattern === "chevrons") {
    const step = style.pattern === "chevrons" ? tile * 1.3 : tile;
    for (let y = -extent; y <= extent; y += step) { context.beginPath(); for (let x = -extent; x <= extent; x += step) { context.moveTo(x, y + step * .7); context.lineTo(x + step / 2, y); context.lineTo(x + step, y + step * .7); } context.stroke(); }
  } else if (style.pattern === "waves") {
    for (let y = -extent; y <= extent; y += tile) { context.beginPath(); context.moveTo(-extent, y); for (let x = -extent; x <= extent; x += tile) { context.quadraticCurveTo(x + tile / 4, y - tile * .32, x + tile / 2, y); context.quadraticCurveTo(x + tile * .75, y + tile * .32, x + tile, y); } context.stroke(); }
  } else if (style.pattern === "third-rail-bolts") {
    for (let x = -extent; x <= extent; x += tile * 1.35) for (let y = -extent; y <= extent; y += tile * 1.55) drawBolt(context, x + ((Math.round(y / tile) & 1) ? tile * .55 : 0), y, tile * .46);
  } else {
    const reverse = style.pattern === "reverse-stripes" ? -1 : 1;
    context.rotate(reverse * Math.PI / 4);
    for (let x = -extent * 2; x <= extent * 2; x += tile) context.fillRect(x, -extent * 2, tile * .34, extent * 4);
  }
  context.restore();
}

export function drawCoverImage(context: CanvasRenderingContext2D, image: CanvasImageSource, imageWidth: number, imageHeight: number, radialAngle: number, radius: number, span: number) {
  const geometry = coverImageGeometry(imageWidth, imageHeight, radius, span);
  context.save(); context.rotate(radialAngle); context.translate(geometry.centreX, geometry.centreY); context.rotate(geometry.imageRotation); context.drawImage(image, -geometry.width / 2, -geometry.height / 2, geometry.width, geometry.height); context.restore();
}

function drawBolt(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath(); THIRD_RAIL_BOLT_POINTS.forEach(([px, py], index) => { const dx = x + px * size; const dy = y + py * size; if (index) context.lineTo(dx, dy); else context.moveTo(dx, dy); }); context.closePath(); context.fill();
}
