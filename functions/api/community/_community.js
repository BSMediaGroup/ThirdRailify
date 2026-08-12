export const COMMUNITY_SCHEMA = "thirdrailify-discord-community-v1";
export const COMMUNITY_GUILD_ID = "1114717958573396008";
export const COMMUNITY_KV_KEY = "discord:community:snapshot:v1";
export const COMMUNITY_MAX_BODY_BYTES = 96 * 1024;
export const COMMUNITY_REPLAY_WINDOW_SECONDS = 300;
export const FRESH_SECONDS = 720;
export const DELAYED_SECONDS = 1200;

const CHANNEL_TYPES = new Set(["text", "announcement", "forum", "voice", "stage"]);
const PRESENCE_STATES = new Set(["online", "idle", "dnd"]);
const MEDIA_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function freshnessForAge(ageSeconds) {
  if (ageSeconds < FRESH_SECONDS) return "fresh";
  if (ageSeconds < DELAYED_SECONDS) return "delayed";
  return "stale";
}

export async function verifySignedRequest(rawBody, timestampHeader, signatureHeader, secret, nowSeconds) {
  if (typeof secret !== "string" || !secret || typeof timestampHeader !== "string" || typeof signatureHeader !== "string") {
    return false;
  }
  if (!/^\d{10}$/.test(timestampHeader) || !/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) return false;
  const timestamp = Number(timestampHeader);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > COMMUNITY_REPLAY_WINDOW_SECONDS) return false;
  const signature = hexBytes(signatureHeader.slice(7));
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedBody = concatBytes(encoder.encode(`${timestampHeader}.`), rawBody);
  return crypto.subtle.verify("HMAC", key, signature, signedBody);
}

export function normalizeSnapshot(value) {
  if (!record(value) || value.schema !== COMMUNITY_SCHEMA) return null;
  const generatedAt = isoDate(value.generatedAt);
  const guild = normalizeGuild(value.guild);
  const source = normalizeSource(value.source);
  const channels = normalizeArray(value.channels, 64, normalizeChannel);
  const members = normalizeArray(value.members, 100, normalizeMember);
  if (!generatedAt || !guild || !source || !channels || !members || !Array.isArray(value.voiceSpaces) || value.voiceSpaces.length > 32) {
    return null;
  }
  const counts = value.counts;
  if (
    !record(counts)
    || !integer(counts.onlineMembers, 0, 100000)
    || counts.publishedMembers !== members.length
    || counts.publicChannels !== channels.length
  ) return null;
  const voiceSpaces = channels.filter((channel) => channel.type === "voice" || channel.type === "stage").slice(0, 32);
  return {
    schema: COMMUNITY_SCHEMA,
    generatedAt,
    guild,
    source,
    counts: {
      onlineMembers: counts.onlineMembers,
      publishedMembers: members.length,
      publicChannels: channels.length,
    },
    channels,
    voiceSpaces,
    members,
  };
}

function normalizeGuild(value) {
  if (!record(value) || value.id !== COMMUNITY_GUILD_ID) return null;
  const name = text(value.name, 72);
  const iconUrl = value.iconUrl === null ? null : safeMediaUrl(value.iconUrl);
  const inviteUrl = safeInviteUrl(value.inviteUrl);
  return name && (value.iconUrl === null || iconUrl) && inviteUrl
    ? { id: COMMUNITY_GUILD_ID, name, iconUrl, inviteUrl }
    : null;
}

function normalizeSource(value) {
  if (!record(value) || value.kind !== "thirdrailify-bot") return null;
  const botVersion = text(value.botVersion, 32);
  return botVersion ? { kind: "thirdrailify-bot", botVersion } : null;
}

function normalizeChannel(value) {
  if (!record(value)) return null;
  const key = text(value.key, 48);
  const name = text(value.name, 72);
  const topic = value.topic === null ? null : text(value.topic, 240);
  const categoryName = value.categoryName === null ? null : text(value.categoryName, 72);
  const url = safeChannelUrl(value.url);
  if (
    !key || !/^channel-\d{1,24}$/.test(key)
    || !name
    || !CHANNEL_TYPES.has(value.type)
    || (value.topic !== null && !topic)
    || (value.categoryName !== null && !categoryName)
    || !integer(value.position, 0, 100000)
    || !url
  ) return null;
  return { key, name, type: value.type, topic, categoryName, position: value.position, url };
}

function normalizeMember(value) {
  if (!record(value)) return null;
  const key = text(value.key, 40);
  const displayName = text(value.displayName, 64);
  const username = text(value.username, 64);
  const nickname = value.nickname === null ? null : text(value.nickname, 64);
  const avatarUrl = value.avatarUrl === null ? null : safeMediaUrl(value.avatarUrl);
  const joinedAt = value.joinedAt === null ? null : isoDate(value.joinedAt);
  if (
    !key || !/^member-[a-f0-9]{24}$/.test(key)
    || !displayName || !username
    || (value.nickname !== null && !nickname)
    || (value.avatarUrl !== null && !avatarUrl)
    || !PRESENCE_STATES.has(value.status)
    || (value.joinedAt !== null && !joinedAt)
    || typeof value.bot !== "boolean"
  ) return null;
  return { key, displayName, username, nickname, avatarUrl, status: value.status, joinedAt, bot: value.bot };
}

function normalizeArray(value, maximum, normalizer) {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const normalized = value.map(normalizer);
  return normalized.some((item) => item === null) ? null : normalized;
}

function safeInviteUrl(value) {
  const url = safeUrl(value);
  if (!url) return null;
  const path = url.pathname.split("/").filter(Boolean);
  const valid = (url.hostname === "discord.gg" && path.length === 1)
    || ((url.hostname === "discord.com" || url.hostname === "www.discord.com") && path[0] === "invite" && path.length === 2);
  return valid ? `${url.origin}${url.pathname}` : null;
}

function safeMediaUrl(value) {
  const url = safeUrl(value);
  return url && MEDIA_HOSTS.has(url.hostname) ? url.href : null;
}

function safeChannelUrl(value) {
  const url = safeUrl(value);
  if (!url || url.hostname !== "discord.com") return null;
  const path = url.pathname.split("/").filter(Boolean);
  return path.length === 3 && path[0] === "channels" && path[1] === COMMUNITY_GUILD_ID && /^\d{1,24}$/.test(path[2])
    ? `${url.origin}${url.pathname}`
    : null;
}

function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null;
  } catch {
    return null;
  }
}

function text(value, maximum) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
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

function hexBytes(value) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2) return null;
  const output = new Uint8Array(value.length / 2);
  for (let index = 0; index < output.length; index += 1) output[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return output;
}

function concatBytes(first, second) {
  const output = new Uint8Array(first.length + second.length);
  output.set(first, 0);
  output.set(second, first.length);
  return output;
}
