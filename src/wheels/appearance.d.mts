import type { WheelEntry } from "./types";
import type { SegmentStyle } from "./segmentStyles.mjs";

export function normalizeHexColour(value: unknown, label?: string): string;
export function normalizeCustomPalette(colors: unknown, accent: unknown): { colors: string[]; accent: string };
export function applyPaletteToEntries(entries: WheelEntry[], colors: string[]): WheelEntry[];
export function paletteColourForEntry(entries: WheelEntry[], entryId: string, colors: string[]): string;
export function movePaletteColour(colors: string[], index: number, direction: -1 | 1): string[];
export function normalizeCustomPaletteStyles(styles: SegmentStyle[], accent: unknown): { styles: SegmentStyle[]; accent: string };
export function applyStylesToEntries(entries: WheelEntry[], styles: SegmentStyle[]): WheelEntry[];
export function paletteStyleForEntry(entries: WheelEntry[], entryId: string, styles: SegmentStyle[]): SegmentStyle;
export function movePaletteStyle(styles: SegmentStyle[], index: number, direction: -1 | 1): SegmentStyle[];
export function normalizeEntrantStyle(style: unknown, fallback: string): SegmentStyle;
