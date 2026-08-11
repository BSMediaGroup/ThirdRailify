export const THIRD_RAILIFY_DISCORD_GUILD_ID = "1114717958573396008";
export const THIRD_RAILIFY_DISCORD_WIDGET_URL = `https://discord.com/api/guilds/${THIRD_RAILIFY_DISCORD_GUILD_ID}/widget.json`;
export const THIRD_RAILIFY_DISCORD_FALLBACK_INVITE = "https://discord.com/invite/Bd8hU5aFxA";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_CHANNEL_PAYLOAD = 128;
const MAX_MEMBER_PAYLOAD = 5000;
const MAX_VISIBLE_MEMBERS = 64;

type UnknownRecord = Record<string, unknown>;

export type DiscordChannel = {
  id: string;
  name: string;
  position: number;
};

export type DiscordMember = {
  id: string;
  name: string;
  status: "online" | "idle" | "dnd" | "unknown";
  avatarUrl: string | null;
};

export type DiscordWidgetData = {
  name: string;
  inviteUrl: string;
  presenceCount: number;
  channels: DiscordChannel[];
  members: DiscordMember[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ");
  return clean ? clean.slice(0, maximum) : null;
}

function boundedInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100000 ? Number(value) : null;
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

export function safeDiscordAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const safeHost = hostname === "cdn.discordapp.com" || hostname === "media.discordapp.net";
    if (url.protocol !== "https:" || url.username || url.password || url.port || !safeHost || !url.pathname.startsWith("/widget-avatars/")) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function normalizeStatus(value: unknown): DiscordMember["status"] {
  return value === "online" || value === "idle" || value === "dnd" ? value : "unknown";
}

export function normalizeDiscordWidgetPayload(payload: unknown): DiscordWidgetData | null {
  if (!isRecord(payload) || payload.id !== THIRD_RAILIFY_DISCORD_GUILD_ID) return null;
  const name = boundedText(payload.name, 72);
  const presenceCount = boundedInteger(payload.presence_count);
  if (
    !name ||
    presenceCount === null ||
    !Array.isArray(payload.channels) ||
    !Array.isArray(payload.members) ||
    payload.channels.length > MAX_CHANNEL_PAYLOAD ||
    payload.members.length > MAX_MEMBER_PAYLOAD
  ) return null;

  const channels = payload.channels
    .filter(isRecord)
    .map((channel, index): DiscordChannel | null => {
      const channelName = boundedText(channel.name, 72);
      if (!channelName) return null;
      return {
        id: boundedText(channel.id, 32) ?? `channel-${index}`,
        name: channelName,
        position: boundedInteger(channel.position) ?? index,
      };
    })
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
        status: normalizeStatus(member.status),
        avatarUrl: safeDiscordAvatar(member.avatar_url),
      };
    })
    .filter((member): member is DiscordMember => member !== null)
    .slice(0, MAX_VISIBLE_MEMBERS);

  return {
    name,
    inviteUrl: safeDiscordInvite(payload.instant_invite),
    presenceCount,
    channels,
    members,
  };
}

export async function fetchDiscordWidget(fetcher: typeof fetch = fetch): Promise<DiscordWidgetData> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(THIRD_RAILIFY_DISCORD_WIDGET_URL, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`discord_widget_http_${response.status}`);
    const data = normalizeDiscordWidgetPayload(await response.json());
    if (!data) throw new Error("discord_widget_invalid_payload");
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

let activeRequest: Promise<DiscordWidgetData> | null = null;
let lastResult: DiscordWidgetData | null = null;

export function getDiscordWidget(options: { refresh?: boolean; fetcher?: typeof fetch } = {}): Promise<DiscordWidgetData> {
  if (!options.refresh && lastResult) return Promise.resolve(lastResult);
  if (activeRequest) return activeRequest;
  activeRequest = fetchDiscordWidget(options.fetcher)
    .then((result) => {
      lastResult = result;
      return result;
    })
    .finally(() => {
      activeRequest = null;
    });
  return activeRequest;
}
