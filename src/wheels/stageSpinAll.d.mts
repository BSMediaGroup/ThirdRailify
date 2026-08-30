import type { CelebrationIntensity } from "./celebrationProfiles.mjs";
import type { StageWinnerResult } from "./StageWinnerCelebration";

export type StageCelebrationAggregate = {
  enabled: boolean;
  confetti: boolean;
  fireworks: boolean;
  lighting: boolean;
  intensity: CelebrationIntensity;
  winnerSoundPreset: string | null;
};

export function stageAudioGain(activeSoundCount: number): number;
export function aggregateStageCelebration(
  results: StageWinnerResult[],
): StageCelebrationAggregate;
