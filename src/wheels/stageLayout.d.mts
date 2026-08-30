export type StageDirection = "left" | "right" | "up" | "down";
export type StageCell = { index: number; row: number; column: number; x: number; y: number; width: number; height: number; centerX: number; centerY: number; diameter: number; neighbors: Record<StageDirection, number | null> };
export type StageLayout = { count: number; width: number; height: number; rows: number; columns: number; rowCounts: number[]; gap: number; wheelDiameter: number; cells: StageCell[] };
export function computeStageLayout(input: { count: number; width: number; height: number; aspectRatio?: number }): StageLayout;
export function directionalNeighbors(cells: Array<Omit<StageCell, "neighbors">>): Array<Record<StageDirection, number | null>>;
