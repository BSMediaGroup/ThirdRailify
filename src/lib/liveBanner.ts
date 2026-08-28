import type { BroadcastCandidate, BroadcastData } from "./broadcast";

export const LIVE_EXPIRY_GRACE_MS = 120_000;

export function effectiveLiveCandidates(data: BroadcastData | null, now = Date.now()): BroadcastCandidate[] {
  if (!data || data.freshness === "stale") return [];
  return data.liveNow.filter((candidate) => {
    if (candidate.presentationState !== "live" || candidate.providerState !== "live" || !candidate.liveVerifiedAt || !candidate.liveExpiresAt) return false;
    const verifiedAt = Date.parse(candidate.liveVerifiedAt);
    const expiresAt = Date.parse(candidate.liveExpiresAt);
    return Number.isFinite(verifiedAt)
      && verifiedAt <= now + 60_000
      && Number.isFinite(expiresAt)
      && expiresAt + LIVE_EXPIRY_GRACE_MS > now;
  });
}

export function effectiveLiveCandidate(data: BroadcastData | null, now = Date.now()): BroadcastCandidate | null {
  return effectiveLiveCandidates(data, now)[0] ?? null;
}
