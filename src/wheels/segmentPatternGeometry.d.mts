export const THIRD_RAIL_BOLT_POINTS: readonly (readonly [number, number])[];
export function patternDefinition(id: string, radius: number): Readonly<{ id: string; tile: number; orientation: "segment-radial" | "wheel-space"; clipToSegment: true; highDprVector: true; usesBaseColour: true; usesPatternColour: true; boltSource: string | null }>;
export function coverImageGeometry(imageWidth: number, imageHeight: number, radius: number, span: number): Readonly<{ tangent: number; scale: number; width: number; height: number; centreX: number; centreY: number; imageRotation: number }>;
