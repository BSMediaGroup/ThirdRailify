const state = process.argv[2] ?? "both-live";
const now = Date.now();
const iso = (offset = 0) => new Date(now + offset).toISOString();

function candidate(platform, presentationState, options = {}) {
  const youtube = platform === "youtube";
  const contentId = youtube ? "abc123DEF45" : "vabc123";
  const live = presentationState === "live";
  return {
    platform,
    key: `${platform}:${contentId}`,
    contentId,
    watchUrl: youtube ? `https://www.youtube.com/watch?v=${contentId}` : "https://rumble.com/vabc123-third-railify-live.html",
    embedUrl: options.noEmbed ? null : youtube
      ? `https://www.youtube-nocookie.com/embed/${contentId}?playsinline=1&rel=0`
      : "https://rumble.com/embed/vabc123",
    title: youtube ? "Third Railify - YouTube signal" : "Third Railify - Rumble signal",
    description: "News, culture, crime, community energy, and the detours nobody planned.",
    creatorName: "Third Railify",
    thumbnailUrl: youtube ? `https://i.ytimg.com/vi/${contentId}/maxresdefault.jpg` : null,
    providerState: presentationState === "archive" ? "completed" : presentationState === "episode" ? "published" : presentationState,
    presentationState,
    publishedAt: iso(-3_600_000),
    scheduledStart: presentationState === "upcoming" ? iso(3_600_000) : null,
    actualStart: live ? iso(-900_000) : null,
    actualEnd: presentationState === "archive" ? iso(-1_800_000) : null,
    liveVerifiedAt: live ? iso(-30_000) : null,
    liveExpiresAt: live ? iso(300_000) : null,
    viewerCount: live ? (youtube ? 284 : 517) : null,
    observedAt: iso(-30_000),
  };
}

const youtubeLive = candidate("youtube", "live");
const rumbleLive = candidate("rumble", "live");
const youtubeLatest = candidate("youtube", "episode");
const rumbleLatest = candidate("rumble", "archive", { noEmbed: state === "rumble-no-embed" });
const liveNow = state === "youtube-live" ? [youtubeLive]
  : state === "rumble-live" ? [rumbleLive]
    : state === "both-live" || state === "delayed" ? [rumbleLive, youtubeLive] : [];
const latestByPlatform = { youtube: youtubeLatest, rumble: rumbleLatest };
if (liveNow.some((item) => item.platform === "youtube")) latestByPlatform.youtube = youtubeLive;
if (liveNow.some((item) => item.platform === "rumble")) latestByPlatform.rumble = rumbleLive;
if (state === "offline-youtube") latestByPlatform.rumble = null;
if (["offline-rumble", "rumble-no-embed"].includes(state)) latestByPlatform.youtube = null;
const latest = state === "offline-youtube" ? youtubeLatest
  : ["offline-rumble", "rumble-no-embed"].includes(state) ? rumbleLatest
    : liveNow[0] ?? rumbleLatest;
const upcoming = state === "upcoming" ? candidate("youtube", "upcoming") : null;
const age = state === "delayed" ? 240_000 : state === "stale" ? 960_000 : 30_000;

console.log(JSON.stringify({
  available: true,
  schema: "thirdrailify-broadcast-v1",
  generatedAt: iso(-age),
  retrievedAt: iso(),
  ageSeconds: Math.floor(age / 1000),
  freshness: state === "stale" ? "stale" : state === "delayed" ? "delayed" : "fresh",
  source: { kind: "thirdrailify-bot", botVersion: "1.1.0" },
  providerStatus: {
    youtube: { state: liveNow.some((item) => item.platform === "youtube") ? "live" : upcoming ? "upcoming" : "offline", checkedAt: iso(-30_000) },
    rumble: { state: liveNow.some((item) => item.platform === "rumble") ? "live" : "offline", checkedAt: iso(-30_000) },
  },
  liveNow: state === "stale" ? [] : liveNow,
  primary: state === "stale" ? rumbleLatest : liveNow[0] ?? latest,
  latest: state === "stale" ? rumbleLatest : latest,
  latestByPlatform,
  upcoming,
}));
