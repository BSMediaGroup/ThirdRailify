export type SpinSoundProfile = { waveform: OscillatorType; frequency: number; gain: number; attack: number; decay: number; detune: number };
export type WinnerSoundProfile = { notes: readonly number[]; waveform: OscillatorType; spacing: number; gain: number; decay: number };
export const SPIN_SOUND_PROFILES: Readonly<Record<string, SpinSoundProfile | null>>;
export const WINNER_SOUND_PROFILES: Readonly<Record<string, WinnerSoundProfile | null>>;
export function spinSoundProfile(id: string): SpinSoundProfile | null;
export function winnerSoundProfile(id: string): WinnerSoundProfile | null;
