export const THIRD_RAILIFY_DISCORD_GUILD_ID = "1114717958573396008";
export const THIRD_RAILIFY_DISCORD_WIDGET_URL = `https://discord.com/api/guilds/${THIRD_RAILIFY_DISCORD_GUILD_ID}/widget.json`;
export const THIRD_RAILIFY_COMMUNITY_URL = "/api/community/discord";
export const THIRD_RAILIFY_DISCORD_FALLBACK_INVITE = "https://discord.com/invite/Bd8hU5aFxA";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_CHANNEL_PAYLOAD = 128;
const MAX_MEMBER_PAYLOAD = 5000;
const MAX_VISIBLE_MEMBERS = 100;

type UnknownRecord = Record<string, unknown>;

export type CommunityFreshness = "fresh" | "delayed" | "stale" | "basic";
export type CommunitySource = "bot" | "basic";
export type CommunityChannelType = "text" | "announcement" | "forum" | "voice" | "stage";

export type DiscordChannel = {
  id: string;
  name: string;
  type: CommunityChannelType;
  topic: string | null;
  categoryName: string | null;
  position: number;
  url: string | null;
};

export type DiscordMember = {
  id: string;
  name: string;
  username: string | null;
  nickname: string | null;
  status: "online" | "idle" | "dnd" | "unknown";
  avatarUrl: string | null;
  joinedAt: string | null;
  bot: boolean;
  enriched: boolean;
};

export type DiscordWidgetData = {
  source: CommunitySource;
  freshness: CommunityFreshness;
  generatedAt: string | null;
  ageSeconds: number | null;
  name: string;
  inviteUrl: string;
  presenceCount: number;
  publicChannels: DiscordChannel[];
  voiceSpaces: DiscordChannel[];
  members: DiscordMember[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ");
  return clean && clean.length <= maximum ? clean : null;
}

function boundedInteger(value: unknown, maximum = 100000): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= maximum ? Number(value) : null;
}

export function safeDiscordInvite(value: unknown): string {
  if (typeof value !== "string") return THIRD_RAILIFY_DISCORD_FALLBACK_INVITE;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean);
    const isDiscordDotCom = (hostname === "discord.com" || hostname === "www.discord.com") && pathParts[0] === "invite" && Boolean(pathParts[1]);
    const isDiscordDotGg = hostname === "discord.gg" && Boolean(pathParts[0]);
    if (url.protocol !== "https:" || url.username || url.password || url.port || (!isDiscordDotCom && !isDiscordDotGg)) {
      return THIRD_RAILIFY_DISCORD_FALLBACK_INVITE;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return THIRD_RAILIFY_DISCORD_FALLBACK_INVITE;
  }
}

export function safeDiscordAvatar(value: unknown, widgetOnly = false): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const safeHost = hostname === "cdn.discordapp.com" || hostname === "media.discordapp.net";
    const safePath = widgetOnly ? url.pathname.startsWith("/widget-avatars/") : /^\/(avatars|guilds|icons|widget-avatars)\//.test(url.pathname);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !safeHost || !safePath) return null;
    return url.href;
  } catch {
    return null;
  }
}

function safeChannelUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:"
      || url.hostname !== "discord.com"
      || url.username || url.password || url.port
      || parts.length !== 3 || parts[0] !== "channels" || parts[1] !== THIRD_RAILIFY_DISCORD_GUILD_ID
    ) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function normalizeStatus(value: unknown): DiscordMember["status"] {
  return value === "online" || value === "idle" || value === "dnd" ? value : "unknown";
}

function normalizeChannel(value: unknown, fallbackPosition: number, enriched: boolean): DiscordChannel | null {
  if (!isRecord(value)) return null;
  const name = boundedText(value.name, 72);
  if (!name) return null;
  const kind = enriched && ["text", "announcement", "forum", "voice", "stage"].includes(String(value.type))
    ? value.type as CommunityChannelType
    : "voice";
  return {
    id: boundedText(enriched ? value.key : value.id, 48) ?? `channel-${fallbackPosition}`,
    name,
    type: kind,
    topic: enriched ? boundedText(value.topic, 240) : null,
    categoryName: enriched ? boundedText(value.categoryName, 72) : null,
    position: boundedInteger(value.position) ?? fallbackPosition,
    url: enriched ? safeChannelUrl(value.url) : null,
  };
}

export function normalizeDiscordWidgetPayload(payload: unknown): DiscordWidgetData | null {
  if (!isRecord(payload) || payload.id !== THIRD_RAILIFY_DISCORD_GUILD_ID) return null;
  const name = boundedText(payload.name, 72);
  const presenceCount = boundedInteger(payload.presence_count);
  if (
    !name || presenceCount === null
    || !Array.isArray(payload.channels) || !Array.isArray(payload.members)
    || payload.channels.length > MAX_CHANNEL_PAYLOAD || payload.members.length > MAX_MEMBER_PAYLOAD
  ) return null;
  const voiceSpaces = payload.channels
    .map((channel, index) => normalizeChannel(channel, index, false))
    .filter((channel): channel is DiscordChannel => channel !== null)
    .sort((left, right) => left.position - right.position);
  const members = payload.members
    .filter(isRecord)
    .map((member, index): DiscordMember | null => {
      const memberName = boundedText(member.display_name, 64) ?? boundedText(member.username, 64);
      if (!memberName) return null;
      return {
        id: boundedText(member.id, 32) ?? `member-${index}`,
        name: memberName,
        username: null,
        nickname: null,
        status: normalizeStatus(member.status),
        avatarUrl: safeDiscordAvatar(member.avatar_url, true),
        joinedAt: null,
        bot: false,
        enriched: false,
      };
    })
    .filter((member): member is DiscordMember => member !== null)
    .slice(0, MAX_VISIBLE_MEMBERS);
  return {
    source: "basic",
    freshness: "basic",
    generatedAt: null,
    ageSeconds: null,
    name,
    inviteUrl: safeDiscordInvite(payload.instant_invite),
    presenceCount,
    publicChannels: [],
    voiceSpaces,
    members,
  };
}

export function normalizeEnrichedCommunityPayload(payload: unknown): DiscordWidgetData | null {
  if (
    !isRecord(payload) || payload.available !== true
    || payload.schema !== "thirdrailify-discord-community-v1"
    || !isRecord(payload.guild) || payload.guild.id !== THIRD_RAILIFY_DISCORD_GUILD_ID
    || !isRecord(payload.counts)
    || !Array.isArray(payload.channels) || !Array.isArray(payload.voiceSpaces) || !Array.isArray(payload.members)
  ) return null;
  const freshness = payload.freshness;
  const name = boundedText(payload.guild.name, 72);
  const presenceCount = boundedInteger(payload.counts.onlineMembers);
  const ageSeconds = boundedInteger(payload.ageSeconds, 31_536_000);
  if (!name || presenceCount === null || ageSeconds === null || !["fresh", "delayed", "stale"].includes(String(freshness))) return null;
  const publicChannels = payload.channels
    .slice(0, 64)
    .map((channel, index) => normalizeChannel(channel, index, true))
    .filter((channel): channel is DiscordChannel => channel !== null);
  const voiceSpaces = payload.voiceSpaces
    .slice(0, 32)
    .map((channel, index) => normalizeChannel(channel, index, true))
    .filter((channel): channel is DiscordChannel => channel !== null);
  const members = payload.members
    .slice(0, MAX_VISIBLE_MEMBERS)
    .filter(isRecord)
    .map((member): DiscordMember | null => {
      const id = boundedText(member.key, 40);
      const displayName = boundedText(member.displayName, 64);
      const username = boundedText(member.username, 64);
      if (!id || !displayName || !username) return null;
      return {
        id,
        name: displayName,
        username,
        nickname: boundedText(member.nickname, 64),
        status: freshness === "stale" ? "unknown" : normalizeStatus(member.status),
        avatarUrl: safeDiscordAvatar(member.avatarUrl),
        joinedAt: typeof member.joinedAt === "string" && Number.isFinite(Date.parse(member.joinedAt)) ? member.joinedAt : null,
        bot: member.bot === true,
        enriched: true,
      };
    })
    .filter((member): member is DiscordMember => member !== null);
  return {
    source: "bot",
    freshness: freshness as CommunityFreshness,
    generatedAt: typeof payload.generatedAt === "string" ? payload.generatedAt : null,
    ageSeconds,
    name,
    inviteUrl: safeDiscordInvite(payload.guild.inviteUrl),
    presenceCount,
    publicChannels,
    voiceSpaces,
    members,
  };
}

async function timedFetch(url: string, fetcher: typeof fetch): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetcher(url, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchDiscordCommunity(fetcher: typeof fetch = fetch): Promise<DiscordWidgetData> {
  try {
    const response = await timedFetch(THIRD_RAILIFY_COMMUNITY_URL, fetcher);
    if (!response.ok) throw new Error(`community_snapshot_http_${response.status}`);
    const enriched = normalizeEnrichedCommunityPayload(await response.json());
    if (!enriched) throw new Error("community_snapshot_invalid_payload");
    return enriched;
  } catch {
    const response = await timedFetch(THIRD_RAILIFY_DISCORD_WIDGET_URL, fetcher);
    if (!response.ok) throw new Error(`discord_widget_http_${response.status}`);
    const basic = normalizeDiscordWidgetPayload(await response.json());
    if (!basic) throw new Error("discord_widget_invalid_payload");
    return basic;
  }
}

let activeRequest: Promise<DiscordWidgetData> | null = null;
let lastResult: DiscordWidgetData | null = null;

export function getDiscordWidget(options: { refresh?: boolean; fetcher?: typeof fetch } = {}): Promise<DiscordWidgetData> {
  if (!options.refresh && lastResult) return Promise.resolve(lastResult);
  if (activeRequest) return activeRequest;
  activeRequest = fetchDiscordCommunity(options.fetcher)
    .then((result) => {
      lastResult = result;
      return result;
    })
    .finally(() => {
      activeRequest = null;
    });
  return activeRequest;
}
