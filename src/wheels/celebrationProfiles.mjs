export const CELEBRATION_PROFILES = Object.freeze({
  subtle: Object.freeze({ confettiCount: 68, confettiDuration: 3_800, fireworksBursts: 1, sparksPerBurst: 26, fireworksDuration: 3_400, lightingStrength: .42, rimStrength: .45, beamCount: 2, voltageCount: 1, bloomOpacity: .28, stageEnergy: .2 }),
  normal: Object.freeze({ confettiCount: 138, confettiDuration: 5_300, fireworksBursts: 3, sparksPerBurst: 34, fireworksDuration: 4_900, lightingStrength: .7, rimStrength: .74, beamCount: 4, voltageCount: 2, bloomOpacity: .5, stageEnergy: .58 }),
  strong: Object.freeze({ confettiCount: 210, confettiDuration: 7_200, fireworksBursts: 5, sparksPerBurst: 42, fireworksDuration: 6_700, lightingStrength: 1, rimStrength: 1, beamCount: 6, voltageCount: 4, bloomOpacity: .76, stageEnergy: 1 }),
});

export function effectCounts(intensity, options) {
  const profile = CELEBRATION_PROFILES[intensity];
  if (!profile) throw new Error("Celebration intensity is invalid.");
  if (!options.celebrationEnabled || options.reducedMotion) return { confetti: 0, fireworks: 0, beams: 0, voltage: 0 };
  return { confetti: options.confettiEnabled ? profile.confettiCount : 0, fireworks: options.fireworksEnabled ? profile.fireworksBursts : 0, beams: options.lightingEnabled ? profile.beamCount : 0, voltage: options.lightingEnabled ? profile.voltageCount : 0 };
}
