import type { ImportMessage } from "./portable.mjs";
import type { SegmentStyle } from "./segmentStyles.mjs";

export type PaletteRepair = { code: string; severity: "info" | "warning"; reason: string };
export type ImportedPaletteOptions = {
  defaultPalette?: string[] | readonly string[];
  maxPalette?: number;
  availableImageAssetIds?: Set<string>;
  availableImageAssetRefs?: Set<string>;
};
export const THIRD_RAIL_GOLD_PALETTE: readonly string[];
export function normalizeImportedPalette(palette: unknown, paletteStyles: unknown, options?: ImportedPaletteOptions): { palette: string[]; paletteStyles: SegmentStyle[]; warnings: PaletteRepair[] };
export function normalizeImportedSegmentStyle(value: unknown, fallback: unknown, options?: ImportedPaletteOptions): { style: SegmentStyle | { mode: "image"; color: string; imageAssetRef: string }; repair: "pattern" | "image" | "style" | null };
export function hasPaletteRepairs(messages: ImportMessage[]): boolean;
