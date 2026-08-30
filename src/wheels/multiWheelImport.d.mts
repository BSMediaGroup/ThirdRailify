import type { WheelImportResult, WheelImportProposal } from "./portable.mjs";
export type MultiImportWheel = { sourceIndex: number; proposal: WheelImportProposal };
export type MultiImportStage = { title: string; wheels: MultiImportWheel[] };
export type MultiImportPlan = { mode: "individual" | "stages"; sourceName: string; topLevelTitle: string; selectedCount: number; wheels: MultiImportWheel[]; stages: MultiImportStage[]; recordsCreatedDuringPreview: 0 };
export function createMultiWheelImportPlan(result: WheelImportResult, options?: { mode?: "individual" | "stages"; selectedIndexes?: number[]; baseTitle?: string }): MultiImportPlan;
export function preflightMultiWheelImport(plan: MultiImportPlan, allowance: { isMasterAdmin?: boolean; maximumOwnedWheels?: number; ownedWheelCount?: number; maximumOwnedStages?: number; ownedStageCount?: number }): { ok: boolean; wheelsNeeded: number; wheelsAvailable: number; stagesNeeded: number; stagesAvailable: number };
