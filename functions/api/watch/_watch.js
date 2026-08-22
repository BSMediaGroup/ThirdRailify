import { checkpointSeconds } from "../_snapshot-persistence.js";

export const WATCH_SCHEMA = "thirdrailify-broadcast-v1";
export const WATCH_KV_KEY = "broadcast:current:snapshot:v1";
export const WATCH_MAX_BODY_BYTES = 64 * 1024;
export const WATCH_LIVE_CHECKPOINT_SECONDS = 150;
export const WATCH_LIVE_MIN_CHECKPOINT_SECONDS = 150;
export const WATCH_UPCOMING_CHECKPOINT_SECONDS = 600;
export const WATCH_UPCOMING_MIN_CHECKPOINT_SECONDS = 300;
export const WATCH_INACTIVE_CHECKPOINT_SECONDS = 1800;
export const WATCH_INACTIVE_MIN_CHECKPOINT_SECONDS = 900;
export const WATCH_FRESH_SECONDS = 180;
export const WATCH_DELAYED_SECONDS = 900;

const ROOT_FIELDS = new Set([
  "schema", "generatedAt", "source", "providerStatus", "liveNow", "primary", "latest", "latestByPlatform", "upcoming",
]);
const CANDIDATE_FIELDS = new Set([
  "platform", "key", "contentId", "watchUrl", "embedUrl", "title", "description", "creatorName", "thumbnailUrl",
  "providerState", "presentationState", "publishedAt", "scheduledStart", "actualStart", "actualEnd", "liveVerifiedAt",
  "liveExpiresAt", "viewerCount", "observedAt",
]);
const PROVIDER_STATES = new Set(["upcoming", "live", "published", "completed", "offline", "unknown", "blocked"]);
const PRESENTATION_STATES = new Set(["live", "upcoming", "episode", "archive"]);

export function watchFreshness(ageSeconds) {
  if (ageSeconds < WATCH_FRESH_SECONDS) return "fresh";
  if (ageSeconds < WATCH_DELAYED_SECONDS) return "delayed";
  return "stale";
}

export function normalizeWatchSnapshot(value, { rejectUnknown = true } = {}) {
  if (!record(value) || value.schema !== WATCH_SCHEMA || (rejectUnknown && !exactFields(value, ROOT_FIELDS))) return null;
  const generatedAt = isoDate(value.generatedAt);
  const source = normalizeSource(value.source, rejectUnknown);
  const providerStatus = normalizeProviderStatus(value.providerStatus, rejectUnknown);
  const liveNow = normalizeArray(value.liveNow, 2, (item) => normalizeCandidate(item, rejectUnknown));
  const primary = nullableCandidate(value.primary, rejectUnknown);
  const latest = nullableCandidate(value.latest, rejectUnknown);
  const upcoming = nullableCandidate(value.upcoming, rejectUnknown);
  const latestByPlatform = normalizeLatestByPlatform(value.latestByPlatform, rejectUnknown);
  if (!generatedAt || !source || !providerStatus || !liveNow || primary === false || latest === false || upcoming === false || !latestByPlatform) {
    return null;
  }
  if (liveNow.some((candidate) => candidate.presentationState !== "live" || !candidate.liveVerifiedAt || !candidate.liveExpiresAt)) return null;
  if (new Set(liveNow.map((candidate) => candidate.platform)).size !== liveNow.length) return null;
  return { schema: WATCH_SCHEMA, generatedAt, source, providerStatus, liveNow, primary, latest, latestByPlatform, upcoming };
}

export function watchSemanticSnapshot(snapshot) {
  const semanticCandidate = (candidate) => {
    if (!candidate) return null;
    const semantic = { ...candidate };
    delete semantic.liveVerifiedAt;
    delete semantic.liveExpiresAt;
    delete semantic.observedAt;
    delete semantic.viewerCount;
    return semantic;
  };
  return {
    schema: snapshot.schema,
    source: snapshot.source,
    providerStatus: {
      youtube: { state: snapshot.providerStatus.youtube.state },
      rumble: { state: snapshot.providerStatus.rumble.state },
    },
    liveNow: snapshot.liveNow.map(semanticCandidate),
    primary: semanticCandidate(snapshot.primary),
    latest: semanticCandidate(snapshot.latest),
    latestByPlatform: {
      youtube: semanticCandidate(snapshot.latestByPlatform.youtube),
      rumble: semanticCandidate(snapshot.latestByPlatform.rumble),
    },
    upcoming: semanticCandidate(snapshot.upcoming),
  };
}

export function watchCheckpointSeconds(snapshot, env) {
  if (snapshot.liveNow.length) {
    return checkpointSeconds(
      env.THIRDRAILIFY_BROADCAST_KV_LIVE_CHECKPOINT_SECONDS,
      WATCH_LIVE_CHECKPOINT_SECONDS,
      WATCH_LIVE_MIN_CHECKPOINT_SECONDS,
    );
  }
  if (snapshot.upcoming) {
    return checkpointSeconds(
      env.THIRDRAILIFY_BROADCAST_KV_UPCOMING_CHECKPOINT_SECONDS,
      WATCH_UPCOMING_CHECKPOINT_SECONDS,
      WATCH_UPCOMING_MIN_CHECKPOINT_SECONDS,
    );
  }
  return checkpointSeconds(
    env.THIRDRAILIFY_BROADCAST_KV_INACTIVE_CHECKPOINT_SECONDS,
    WATCH_INACTIVE_CHECKPOINT_SECONDS,
    WATCH_INACTIVE_MIN_CHECKPOINT_SECONDS,
  );
}

export function effectiveWatchResponse(snapshot, now = Date.now()) {
  const ageSeconds = Math.max(0, Math.floor((now - Date.parse(snapshot.generatedAt)) / 1000));
  const freshness = watchFreshness(ageSeconds);
  const liveNow = freshness === "stale" ? [] : snapshot.liveNow.filter((candidate) => {
    const verified = Date.parse(candidate.liveVerifiedAt);
    const expires = Date.parse(candidate.liveExpiresAt);
    return Number.isFinite(verified) && verified <= now + 60_000 && Number.isFinite(expires) && expires > now;
  });
  const liveKeys = new Set(liveNow.map((candidate) => candidate.key));
  const normalizeLatest = (candidate) => {
    if (!candidate) return null;
    const isEffectiveLive = liveKeys.has(candidate.key);
    if (candidate.presentationState !== "live" || isEffectiveLive) {
      return freshness === "stale" ? { ...candidate, viewerCount: null } : candidate;
    }
    return { ...candidate, presentationState: "archive", liveVerifiedAt: null, liveExpiresAt: null, viewerCount: null };
  };
  const latestByPlatform = {
    youtube: normalizeLatest(snapshot.latestByPlatform.youtube),
    rumble: normalizeLatest(snapshot.latestByPlatform.rumble),
  };
  const latest = normalizeLatest(snapshot.latest);
  const primary = liveNow[0] ?? latest;
  return {
    available: true,
    ...snapshot,
    liveNow,
    primary,
    latest,
    latestByPlatform,
    retrievedAt: new Date(now).toISOString(),
    ageSeconds,
    freshness,
  };
}

export function thumbnailUrlFor(candidate) {
  if (!candidate?.thumbnailUrl) return null;
  return candidate.platform === "rumble"
    ? `/api/watch/thumbnail?key=${encodeURIComponent(candidate.key)}`
    : candidate.thumbnailUrl;
}

export function projectThumbnailUrls(response) {
  const project = (candidate) => candidate ? { ...candidate, thumbnailUrl: thumbnailUrlFor(candidate) } : null;
  return {
    ...response,
    liveNow: response.liveNow.map(project),
    primary: project(response.primary),
    latest: project(response.latest),
    latestByPlatform: {
      youtube: project(response.latestByPlatform.youtube),
      rumble: project(response.latestByPlatform.rumble),
    },
    upcoming: project(response.upcoming),
  };
}

export function candidatesInSnapshot(snapshot) {
  const values = [
    ...snapshot.liveNow, snapshot.primary, snapshot.latest, snapshot.upcoming,
    snapshot.latestByPlatform.youtube, snapshot.latestByPlatform.rumble,
  ];
  return values.filter(Boolean);
}

function normalizeCandidate(value, rejectUnknown) {
  if (!record(value) || (rejectUnknown && !exactFields(value, CANDIDATE_FIELDS))) return null;
  const platform = value.platform;
  const contentId = text(value.contentId, 128);
  const key = text(value.key, 160);
  const title = text(value.title, 256);
  const watchUrl = safeWatchUrl(value.watchUrl, platform, contentId);
  const embedUrl = value.embedUrl === null ? null : safeEmbedUrl(value.embedUrl, platform, contentId);
  const thumbnailUrl = value.thumbnailUrl === null ? null : safeThumbnailUrl(value.thumbnailUrl, platform, contentId);
  if (
    !["youtube", "rumble"].includes(platform) || !contentId || key !== `${platform}:${contentId}` || !title || !watchUrl
    || (value.embedUrl !== null && !embedUrl) || (value.thumbnailUrl !== null && !thumbnailUrl)
    || !PROVIDER_STATES.has(value.providerState) || !PRESENTATION_STATES.has(value.presentationState)
  ) return null;
  const dates = {};
  for (const field of ["publishedAt", "scheduledStart", "actualStart", "actualEnd", "liveVerifiedAt", "liveExpiresAt"]) {
    dates[field] = value[field] === null ? null : isoDate(value[field]);
    if (value[field] !== null && !dates[field]) return null;
  }
  const observedAt = isoDate(value.observedAt);
  const description = value.description === null ? null : text(value.description, 1200);
  const creatorName = value.creatorName === null ? null : text(value.creatorName, 100);
  if (!observedAt || (value.description !== null && !description) || (value.creatorName !== null && !creatorName)) return null;
  if (value.viewerCount !== null && !integer(value.viewerCount, 0, 2_000_000_000)) return null;
  return {
    platform, key, contentId, watchUrl, embedUrl, title, description, creatorName, thumbnailUrl,
    providerState: value.providerState, presentationState: value.presentationState, ...dates,
    viewerCount: value.viewerCount, observedAt,
  };
}

function normalizeSource(value, rejectUnknown) {
  const fields = new Set(["kind", "botVersion"]);
  if (!record(value) || (rejectUnknown && !exactFields(value, fields)) || value.kind !== "thirdrailify-bot") return null;
  const botVersion = text(value.botVersion, 32);
  return botVersion ? { kind: "thirdrailify-bot", botVersion } : null;
}

function normalizeProviderStatus(value, rejectUnknown) {
  if (!record(value) || (rejectUnknown && !exactFields(value, new Set(["youtube", "rumble"])))) return null;
  const output = {};
  for (const platform of ["youtube", "rumble"]) {
    const item = value[platform];
    if (!record(item) || (rejectUnknown && !exactFields(item, new Set(["state", "checkedAt"]))) || !PROVIDER_STATES.has(item.state)) return null;
    const checkedAt = item.checkedAt === null ? null : isoDate(item.checkedAt);
    if (item.checkedAt !== null && !checkedAt) return null;
    output[platform] = { state: item.state, checkedAt };
  }
  return output;
}

function normalizeLatestByPlatform(value, rejectUnknown) {
  if (!record(value) || (rejectUnknown && !exactFields(value, new Set(["youtube", "rumble"])))) return null;
  const youtube = nullableCandidate(value.youtube, rejectUnknown);
  const rumble = nullableCandidate(value.rumble, rejectUnknown);
  if (youtube === false || rumble === false || (youtube && youtube.platform !== "youtube") || (rumble && rumble.platform !== "rumble")) return null;
  return { youtube, rumble };
}

function nullableCandidate(value, rejectUnknown) {
  if (value === null) return null;
  return normalizeCandidate(value, rejectUnknown) ?? false;
}

function safeWatchUrl(value, platform, contentId) {
  const url = safeUrl(value);
  if (!url) return null;
  if (platform === "youtube") {
    return /^[A-Za-z0-9_-]{11}$/.test(contentId) && url.hostname === "www.youtube.com" && url.pathname === "/watch"
      && url.searchParams.get("v") === contentId && [...url.searchParams].length === 1 ? url.href : null;
  }
  return platform === "rumble" && ["rumble.com", "www.rumble.com"].includes(url.hostname)
    && /^\/v[a-z0-9][a-z0-9-]*(?:-[^/?#]+)?(?:\.html)?\/?$/i.test(url.pathname) && !url.search && !url.hash
    ? `https://rumble.com${url.pathname.replace(/\/$/, "")}` : null;
}

function safeEmbedUrl(value, platform, contentId) {
  const url = safeUrl(value);
  if (!url) return null;
  if (platform === "youtube") {
    const params = [...url.searchParams].sort(([left], [right]) => left.localeCompare(right));
    return url.hostname === "www.youtube-nocookie.com" && url.pathname === `/embed/${contentId}`
      && JSON.stringify(params) === JSON.stringify([["playsinline", "1"], ["rel", "0"]]) ? url.href : null;
  }
  return platform === "rumble" && ["rumble.com", "www.rumble.com"].includes(url.hostname)
    && /^\/embed\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) && !url.search && !url.hash
    ? `https://rumble.com${url.pathname.replace(/\/$/, "")}` : null;
}

function safeThumbnailUrl(value, platform, contentId) {
  const url = safeUrl(value);
  if (!url || !/\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)) return null;
  if (platform === "youtube") {
    return ["i.ytimg.com", "img.youtube.com"].includes(url.hostname) && url.pathname.includes(`/${contentId}/`) ? url.href : null;
  }
  return platform === "rumble" ? url.href : null;
}

function safeUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null;
  } catch {
    return null;
  }
}

function normalizeArray(value, maximum, normalizer) {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const normalized = value.map(normalizer);
  return normalized.some((item) => item === null) ? null : normalized;
}

function exactFields(value, fields) {
  const keys = Object.keys(value);
  return keys.length === fields.size && keys.every((key) => fields.has(key));
}

function text(value, maximum) {
  if (typeof value !== "string") return null;
  const cleaned = [...value].filter((character) => {
    const code = character.charCodeAt(0);
    return code >= 32 && code !== 127;
  }).join("").trim().replace(/\s+/g, " ");
  return cleaned && cleaned.length <= maximum ? cleaned : null;
}

function isoDate(value) {
  if (typeof value !== "string") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function integer(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
