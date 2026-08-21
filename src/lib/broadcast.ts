export const WATCH_API_URL = "/api/watch";
export const RUMBLE_URL = "https://rumble.com/ThirdRailify";
export const YOUTUBE_URL = "https://www.youtube.com/@ThirdRailify";

const REQUEST_TIMEOUT_MS = 8000;
type UnknownRecord = Record<string, unknown>;

export type BroadcastPlatform = "youtube" | "rumble";
export type BroadcastFreshness = "fresh" | "delayed" | "stale";
export type BroadcastPresentation = "live" | "upcoming" | "episode" | "archive";

export type BroadcastCandidate = {
  platform: BroadcastPlatform;
  key: string;
  contentId: string;
  watchUrl: string;
  embedUrl: string | null;
  title: string;
  description: string | null;
  creatorName: string | null;
  thumbnailUrl: string | null;
  providerState: string;
  presentationState: BroadcastPresentation;
  publishedAt: string | null;
  scheduledStart: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  liveVerifiedAt: string | null;
  liveExpiresAt: string | null;
  viewerCount: number | null;
  observedAt: string;
};

export type BroadcastData = {
  schema: "thirdrailify-broadcast-v1";
  generatedAt: string;
  retrievedAt: string;
  ageSeconds: number;
  freshness: BroadcastFreshness;
  liveNow: BroadcastCandidate[];
  primary: BroadcastCandidate | null;
  latest: BroadcastCandidate | null;
  latestByPlatform: Record<BroadcastPlatform, BroadcastCandidate | null>;
  upcoming: BroadcastCandidate | null;
  providerStatus: Record<BroadcastPlatform, { state: string; checkedAt: string | null }>;
};

function record(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned && cleaned.length <= maximum ? cleaned : null;
}

function date(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function safeWatchUrl(value: unknown, platform: BroadcastPlatform): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const hosts = platform === "youtube" ? ["www.youtube.com"] : ["rumble.com", "www.rumble.com"];
    return url.protocol === "https:" && !url.username && !url.password && !url.port && hosts.includes(url.hostname)
      ? url.href : null;
  } catch { return null; }
}

function safeEmbedUrl(value: unknown, platform: BroadcastPlatform): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const valid = platform === "youtube"
      ? url.hostname === "www.youtube-nocookie.com" && url.pathname.startsWith("/embed/")
      : ["rumble.com", "www.rumble.com"].includes(url.hostname) && url.pathname.startsWith("/embed/");
    return url.protocol === "https:" && !url.username && !url.password && !url.port && valid ? url.href : null;
  } catch { return null; }
}

function safeImageUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  if (value.startsWith("/api/watch/thumbnail?key=")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["i.ytimg.com", "img.youtube.com"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

function normalizeCandidate(value: unknown): BroadcastCandidate | null {
  if (!record(value) || !["youtube", "rumble"].includes(String(value.platform))) return null;
  const platform = value.platform as BroadcastPlatform;
  const key = text(value.key, 160);
  const contentId = text(value.contentId, 128);
  const title = text(value.title, 256);
  const watchUrl = safeWatchUrl(value.watchUrl, platform);
  const embedUrl = safeEmbedUrl(value.embedUrl, platform);
  const thumbnailUrl = safeImageUrl(value.thumbnailUrl);
  const observedAt = date(value.observedAt);
  const presentation = value.presentationState;
  if (
    !key || !contentId || key !== `${platform}:${contentId}` || !title || !watchUrl || !observedAt
    || (value.embedUrl !== null && !embedUrl) || (value.thumbnailUrl !== null && !thumbnailUrl)
    || !["live", "upcoming", "episode", "archive"].includes(String(presentation))
  ) return null;
  const optionalDate = (field: string) => value[field] === null ? null : date(value[field]);
  const publishedAt = optionalDate("publishedAt");
  const scheduledStart = optionalDate("scheduledStart");
  const actualStart = optionalDate("actualStart");
  const actualEnd = optionalDate("actualEnd");
  const liveVerifiedAt = optionalDate("liveVerifiedAt");
  const liveExpiresAt = optionalDate("liveExpiresAt");
  if (["publishedAt", "scheduledStart", "actualStart", "actualEnd", "liveVerifiedAt", "liveExpiresAt"]
    .some((field) => value[field] !== null && !optionalDate(field))) return null;
  const viewerCount = value.viewerCount === null ? null : Number(value.viewerCount);
  if (viewerCount !== null && (!Number.isInteger(viewerCount) || viewerCount < 0 || viewerCount > 2_000_000_000)) return null;
  return {
    platform, key, contentId, watchUrl, embedUrl, title,
    description: value.description === null ? null : text(value.description, 1200),
    creatorName: value.creatorName === null ? null : text(value.creatorName, 100),
    thumbnailUrl, providerState: text(value.providerState, 32) ?? "unknown",
    presentationState: presentation as BroadcastPresentation,
    publishedAt, scheduledStart, actualStart, actualEnd, liveVerifiedAt, liveExpiresAt, viewerCount, observedAt,
  };
}

function nullableCandidate(value: unknown): BroadcastCandidate | null | false {
  return value === null ? null : normalizeCandidate(value) ?? false;
}

export function normalizeBroadcastPayload(value: unknown): BroadcastData | null {
  if (
    !record(value) || value.available !== true || value.schema !== "thirdrailify-broadcast-v1"
    || !Array.isArray(value.liveNow) || value.liveNow.length > 2 || !record(value.latestByPlatform)
    || !record(value.providerStatus)
  ) return null;
  const generatedAt = date(value.generatedAt);
  const retrievedAt = date(value.retrievedAt);
  const ageSeconds = Number(value.ageSeconds);
  const freshness = value.freshness;
  const liveNow = value.liveNow.map(normalizeCandidate);
  const primary = nullableCandidate(value.primary);
  const latest = nullableCandidate(value.latest);
  const upcoming = nullableCandidate(value.upcoming);
  const youtube = nullableCandidate(value.latestByPlatform.youtube);
  const rumble = nullableCandidate(value.latestByPlatform.rumble);
  if (
    !generatedAt || !retrievedAt || !Number.isInteger(ageSeconds) || ageSeconds < 0
    || !["fresh", "delayed", "stale"].includes(String(freshness)) || liveNow.some((item) => item === null)
    || primary === false || latest === false || upcoming === false || youtube === false || rumble === false
  ) return null;
  const normalizeProvider = (platform: BroadcastPlatform) => {
    const item = value.providerStatus as UnknownRecord;
    const status = item[platform];
    if (!record(status)) return null;
    const state = text(status.state, 32);
    const checkedAt = status.checkedAt === null ? null : date(status.checkedAt);
    return state && (status.checkedAt === null || checkedAt) ? { state, checkedAt } : null;
  };
  const youtubeStatus = normalizeProvider("youtube");
  const rumbleStatus = normalizeProvider("rumble");
  if (!youtubeStatus || !rumbleStatus) return null;
  return {
    schema: "thirdrailify-broadcast-v1", generatedAt, retrievedAt, ageSeconds,
    freshness: freshness as BroadcastFreshness, liveNow: liveNow as BroadcastCandidate[],
    primary: primary as BroadcastCandidate | null, latest: latest as BroadcastCandidate | null,
    latestByPlatform: { youtube: youtube as BroadcastCandidate | null, rumble: rumble as BroadcastCandidate | null },
    upcoming: upcoming as BroadcastCandidate | null,
    providerStatus: { youtube: youtubeStatus, rumble: rumbleStatus },
  };
}

async function timedFetch(fetcher: typeof fetch): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetcher(WATCH_API_URL, {
      method: "GET", cache: "no-store", credentials: "omit", headers: { Accept: "application/json" }, signal: controller.signal,
    });
  } finally { window.clearTimeout(timeout); }
}

let activeRequest: Promise<BroadcastData> | null = null;

export function fetchBroadcast(fetcher: typeof fetch = fetch): Promise<BroadcastData> {
  if (activeRequest) return activeRequest;
  activeRequest = timedFetch(fetcher)
    .then(async (response) => {
      if (!response.ok) throw new Error(`watch_snapshot_http_${response.status}`);
      const normalized = normalizeBroadcastPayload(await response.json());
      if (!normalized) throw new Error("watch_snapshot_invalid_payload");
      return normalized;
    })
    .finally(() => { activeRequest = null; });
  return activeRequest;
}
