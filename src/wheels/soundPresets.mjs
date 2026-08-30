export const SPIN_SOUND_PROFILES = Object.freeze({
  "classic-tick": Object.freeze({ waveform: "square", frequency: 880, gain: .022, attack: .001, decay: .035, detune: 0 }),
  "relay-click": Object.freeze({ waveform: "square", frequency: 420, gain: .035, attack: .001, decay: .018, detune: -180 }),
  "arc-pulse": Object.freeze({ waveform: "sawtooth", frequency: 1320, gain: .018, attack: .004, decay: .07, detune: 240 }),
  "mechanical-ratchet": Object.freeze({ waveform: "triangle", frequency: 260, gain: .042, attack: .001, decay: .045, detune: -320 }),
  "soft-tick": Object.freeze({ waveform: "sine", frequency: 640, gain: .014, attack: .006, decay: .055, detune: 0 }),
  silent: null,
});

export const WINNER_SOUND_PROFILES = Object.freeze({
  "gold-rise": Object.freeze({ notes: [392, 523.25, 659.25, 783.99], waveform: "triangle", spacing: .095, gain: .06, decay: .42 }),
  "broadcast-hit": Object.freeze({ notes: [196, 392, 587.33], waveform: "sawtooth", spacing: .045, gain: .052, decay: .32 }),
  "voltage-chime": Object.freeze({ notes: [659.25, 987.77, 1318.51], waveform: "sine", spacing: .12, gain: .045, decay: .6 }),
  "crimson-impact": Object.freeze({ notes: [146.83, 220, 293.66], waveform: "square", spacing: .035, gain: .038, decay: .25 }),
  "synth-fanfare": Object.freeze({ notes: [261.63, 329.63, 392, 523.25, 659.25], waveform: "sawtooth", spacing: .08, gain: .036, decay: .48 }),
  "short-burst": Object.freeze({ notes: [523.25, 783.99], waveform: "triangle", spacing: .055, gain: .055, decay: .18 }),
  silent: null,
});

export function spinSoundProfile(id) { return SPIN_SOUND_PROFILES[id] || SPIN_SOUND_PROFILES["classic-tick"]; }
export function winnerSoundProfile(id) { return WINNER_SOUND_PROFILES[id] || WINNER_SOUND_PROFILES["gold-rise"]; }
