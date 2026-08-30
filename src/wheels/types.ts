import type { SegmentStyle } from "./segmentStyles.mjs";

export type WheelEntry = {
  id: string;
  label: string;
  order: number;
  weight: number;
  colour: string | null;
  style?: SegmentStyle | null;
  state: "active" | "hidden";
};
export type WheelThemePreset =
  | "third-rail-gold"
  | "live-wire-red"
  | "gina-violet"
  | "high-voltage-mono"
  | "signal-teal"
  | "after-hours"
  | "high-voltage-hazard"
  | "rail-strike"
  | "goated-circuit"
  | "night-signal"
  | "custom";
export type WheelConfig = {
  themePreset: WheelThemePreset;
  palette: string[];
  paletteStyles?: SegmentStyle[];
  pointerAccent: string;
  centreTreatment: "bolt" | "signal" | "ring";
  backgroundIntensity: "low" | "medium" | "high";
  labelContrast: "light" | "dark";
  spinDurationMs: number;
  tickingSoundEnabled: boolean;
  spinSoundPreset?: "classic-tick" | "relay-click" | "arc-pulse" | "mechanical-ratchet" | "soft-tick" | "silent";
  winnerSoundEnabled: boolean;
  winnerSoundPreset?: "gold-rise" | "broadcast-hit" | "voltage-chime" | "crimson-impact" | "synth-fanfare" | "short-burst" | "silent";
  celebrationEnabled: boolean;
  confettiEnabled: boolean;
  fireworksEnabled: boolean;
  winnerLightingEnabled: boolean;
  celebrationIntensity: "subtle" | "normal" | "strong";
  backgroundEnabled: boolean;
  backgroundFocalX: number;
  backgroundFocalY: number;
  backgroundImageOpacity: number;
  backgroundOverlayIntensity: number;
  winnerMessageTemplate: string;
  publicHistoryVisible: boolean;
};
export type WheelMediaAsset = {
  id: string;
  purpose: "background" | "centre" | "segment_fill";
  url: string;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  sha256: string;
  createdAt: string;
  fileName?: string;
  animationCapable?: boolean;
};
export type OfficialResult = {
  id: string;
  type: "official";
  winningEntryId: string;
  winningLabel: string;
  winningWeight: number;
  wheelRevision: number;
  snapshotHash: string;
  createdAt: string;
  voided: boolean;
};
export type WheelAccess = {
  role: "owner" | "editor" | "spinner" | null;
  isMasterAdmin: boolean;
  canEdit: boolean;
  canSpinOfficially: boolean;
  editingLocked: boolean;
  officialSpinLocked: boolean;
  revision?: number;
};
export type Wheel = {
  slug: string;
  title: string;
  description: string | null;
  lifecycle: "draft" | "active" | "archived";
  visibility: "public" | "hidden";
  participantCount: number;
  weighted: boolean;
  entries: WheelEntry[];
  config: WheelConfig;
  media: { background: WheelMediaAsset | null; centre: WheelMediaAsset | null; segmentFills?: WheelMediaAsset[] };
  demoEnabled: boolean;
  officialEnabled: boolean;
  latestOfficialResult: OfficialResult | null;
  recentOfficialResults: OfficialResult[];
  revision?: number;
};
export type WheelSummary = {
  slug: string;
  title: string;
  description: string | null;
  participantCount: number;
  weighted: boolean;
  themePreset: string;
  palette: string[];
  demoEnabled: boolean;
  officialEnabled: boolean;
  latestOfficialAt: string | null;
  updatedAt?: string | null;
  directoryOrder?: number;
};
export type StageWheelCapability = "Demo" | "Official" | "Edit";
export type AccessibleWheelSummary = WheelSummary & { visibility: "public" | "private"; capability: StageWheelCapability; canEdit: boolean; canSpinOfficially: boolean };
export type StageWheel = { position: number; reference?: string; unavailable: boolean; wheel: Wheel | null; access: WheelAccess | null };
export type Stage = { slug: string; title: string; description: string | null; visibility: "public" | "private"; lifecycle: "active" | "archived"; revision?: number; updatedAt: string; wheels: StageWheel[] };
export type StageAccess = { isOwner: boolean; isMasterAdmin: boolean; canEdit: boolean; revision?: number };
export type StageSummary = { type: "stage"; slug: string; title: string; description: string | null; wheelCount: number; visibility: "public"; wheels: Array<WheelSummary & { position: number }>; updatedAt: string };
export type OwnedStageSummary = { slug: string; title: string; description: string | null; visibility: "public" | "private"; lifecycle: "active" | "archived"; wheelCount: number; revision: number; updatedAt: string };
