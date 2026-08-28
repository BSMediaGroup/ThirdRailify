import type { WheelEntry } from "./types";
export type RandomValues = (values: Uint32Array) => Uint32Array;
export function secureBoundedInteger(maxExclusive: number, randomValues?: RandomValues): number;
export function selectWeightedEntry(entries: WheelEntry[], randomValues?: RandomValues): WheelEntry;
export function secureShuffle<T>(items: readonly T[], randomValues?: RandomValues): T[];
export function entryAngles(entries: WheelEntry[]): Array<{ entry: WheelEntry; start: number; end: number; centre: number }>;
export function spinPlan(entries: WheelEntry[], winnerId: string, durationMs: number, currentRotation?: number, extraTurns?: number): { winnerId: string; durationMs: number; turns: number; finalRotation: number };
