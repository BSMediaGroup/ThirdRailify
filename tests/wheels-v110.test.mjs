import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateStageCelebration,
  stageAudioGain,
} from "../src/wheels/stageSpinAll.mjs";

function result(position, config = {}) {
  return {
    position,
    entry: { id: `entry-${position}`, label: "Shared winner" },
    mode: "practice",
    wheel: {
      config: {
        celebrationEnabled: true,
        confettiEnabled: false,
        fireworksEnabled: false,
        winnerLightingEnabled: false,
        celebrationIntensity: "subtle",
        winnerSoundEnabled: false,
        winnerSoundPreset: "silent",
        ...config,
      },
    },
  };
}

test("Stage celebration combines enabled effects, strongest intensity, and first ordered sound", () => {
  const aggregate = aggregateStageCelebration([
    result(0, { confettiEnabled: true, winnerSoundEnabled: true, winnerSoundPreset: "gold-rise" }),
    result(1, { fireworksEnabled: true, celebrationIntensity: "normal", winnerSoundEnabled: true, winnerSoundPreset: "broadcast-hit" }),
    result(2, { winnerLightingEnabled: true, celebrationIntensity: "strong" }),
  ]);
  assert.deepEqual(aggregate, {
    enabled: true,
    confetti: true,
    fireworks: true,
    lighting: true,
    intensity: "strong",
    winnerSoundPreset: "gold-rise",
  });
});

test("Stage modal remains available when all travelling effects are disabled", () => {
  assert.deepEqual(aggregateStageCelebration([result(0, { celebrationEnabled: false })]), {
    enabled: false,
    confetti: false,
    fireworks: false,
    lighting: false,
    intensity: "subtle",
    winnerSoundPreset: null,
  });
});

test("Stage audio applies bounded square-root gain normalization", () => {
  assert.equal(stageAudioGain(0), 1);
  assert.equal(stageAudioGain(1), 1);
  assert.equal(stageAudioGain(4), 0.5);
  assert.ok(Math.abs(stageAudioGain(6) - 1 / Math.sqrt(6)) < Number.EPSILON);
});
