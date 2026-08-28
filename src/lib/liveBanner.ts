import type { BroadcastCandidate, BroadcastData } from "./broadcast";

export function effectiveLiveCandidate(data: BroadcastData | null): BroadcastCandidate | null {
  if (!data || data.freshness === "stale") return null;
  const candidate = data.liveNow.find((item) => item.presentationState === "live" && item.providerState === "live");
  if (!candidate?.liveVerifiedAt || !candidate.liveExpiresAt || Date.parse(candidate.liveExpiresAt) <= Date.now()) return null;
  return candidate;
}
