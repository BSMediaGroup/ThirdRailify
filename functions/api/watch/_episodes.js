import { semanticFingerprint } from "../_snapshot-persistence.js";
import { WATCH_ARCHIVE_LIMIT, normalizeWatchArchive, publicEpisodeProjection } from "./_watch.js";

export function visibleEpisodes(archive) {
  const normalized = normalizeWatchArchive(archive);
  return normalized ? normalized.episodes.filter((episode) => episode.visible) : [];
}

export function episodeListPayload(archive) {
  const items = visibleEpisodes(archive).map(publicEpisodeProjection);
  return {
    schema: "thirdrailify-watch-episodes-v1",
    items,
    summary: {
      slotCount: WATCH_ARCHIVE_LIMIT,
      visibleCount: items.length,
      placeholderCount: WATCH_ARCHIVE_LIMIT - items.length,
    },
  };
}

export function episodeDetailPayload(archive, episodeId) {
  const episodes = visibleEpisodes(archive);
  const index = episodes.findIndex((episode) => episode.id === episodeId);
  if (index < 0) return null;
  return {
    schema: "thirdrailify-watch-episode-v1",
    item: publicEpisodeProjection(episodes[index]),
    archive: {
      position: index + 1,
      visibleCount: episodes.length,
      previous: episodes[index - 1] ? episodeLink(episodes[index - 1]) : null,
      next: episodes[index + 1] ? episodeLink(episodes[index + 1]) : null,
    },
  };
}

export async function cachedJson(request, payload, { status = 200, cache = "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } = {}) {
  const etag = `W/"${(await semanticFingerprint(payload)).slice(0, 16)}"`;
  const headers = {
    "Cache-Control": cache,
    "Content-Type": "application/json; charset=utf-8",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(JSON.stringify(payload), { status, headers });
}

function episodeLink(episode) {
  return { id: episode.id, title: episode.title, route: `/watch/v/${episode.id}` };
}
