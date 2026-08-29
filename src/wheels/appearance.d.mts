import type { WheelEntry } from "./types";

export function normalizeHexColour(value: unknown, label?: string): string;
export function normalizeCustomPalette(colors: unknown, accent: unknown): { colors: string[]; accent: string };
export function applyPaletteToEntries(entries: WheelEntry[], colors: string[]): WheelEntry[];
export function paletteColourForEntry(entries: WheelEntry[], entryId: string, colors: string[]): string;
export function movePaletteColour(colors: string[], index: number, direction: -1 | 1): string[];
