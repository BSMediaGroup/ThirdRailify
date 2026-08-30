export function stageAudioGain(activeSoundCount) {
  const count = Math.max(0, Math.floor(Number(activeSoundCount) || 0));
  return count > 0 ? 1 / Math.sqrt(count) : 1;
}

export function aggregateStageCelebration(results) {
  const eligible = results.filter(({ wheel }) => wheel.config.celebrationEnabled);
  const rank = { subtle: 0, normal: 1, strong: 2 };
  const intensity = eligible.reduce(
    (current, { wheel }) =>
      rank[wheel.config.celebrationIntensity] > rank[current]
        ? wheel.config.celebrationIntensity
        : current,
    "subtle",
  );
  const sound = results.find(
    ({ wheel }) =>
      wheel.config.winnerSoundEnabled &&
      wheel.config.winnerSoundPreset !== "silent",
  )?.wheel.config.winnerSoundPreset;
  return {
    enabled: eligible.length > 0,
    confetti: eligible.some(({ wheel }) => wheel.config.confettiEnabled),
    fireworks: eligible.some(({ wheel }) => wheel.config.fireworksEnabled),
    lighting: eligible.some(({ wheel }) => wheel.config.winnerLightingEnabled),
    intensity,
    winnerSoundPreset: sound || null,
  };
}
