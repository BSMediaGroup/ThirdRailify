export type CelebrationIntensity = "subtle" | "normal" | "strong";
export type CelebrationProfile = Readonly<{ confettiCount: number; confettiDuration: number; fireworksBursts: number; sparksPerBurst: number; fireworksDuration: number; lightingStrength: number; rimStrength: number; beamCount: number; voltageCount: number; bloomOpacity: number; stageEnergy: number }>;
export const CELEBRATION_PROFILES: Readonly<Record<CelebrationIntensity, CelebrationProfile>>;
export function effectCounts(intensity: CelebrationIntensity, options: { celebrationEnabled: boolean; confettiEnabled: boolean; fireworksEnabled: boolean; lightingEnabled: boolean; reducedMotion: boolean }): { confetti: number; fireworks: number; beams: number; voltage: number };
