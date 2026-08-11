import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import discordIcon from "../../assets/icons/discord.svg";
import {
  getDiscordWidget,
  THIRD_RAILIFY_DISCORD_FALLBACK_INVITE,
  type CommunityFreshness,
  type DiscordChannel,
  type DiscordMember,
  type DiscordWidgetData,
} from "../lib/discordWidget";
import { ArrowIcon } from "./Icons";

type WidgetState =
  | { status: "loading"; data: null }
  | { status: "ready"; data: DiscordWidgetData }
  | { status: "error"; data: null };

type ProfileState = {
  member: DiscordMember;
  trigger: HTMLButtonElement;
  pinned: boolean;
} | null;

const DEFAULT_MEMBER_LIMIT = 12;
const EXPANDED_MEMBER_LIMIT = 24;
const COMPACT_PUBLIC_CHANNEL_LIMIT = 4;
const DEFAULT_PUBLIC_CHANNEL_LIMIT = 6;

const statusLabels: Record<DiscordMember["status"], string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do not disturb",
  unknown: "Presence unavailable",
};

const channelIcons: Record<DiscordChannel["type"], string> = {
  text: "#",
  announcement: "◢",
  forum: "▤",
  voice: "◉",
  stage: "◈",
};

function LoadingDirectory({ label }: { label: string }) {
  return <div className="discord-widget__placeholder" aria-hidden="true"><i /><span>{label}</span></div>;
}

function ChannelList({ id, channels, limit, empty }: { id?: string; channels: DiscordChannel[]; limit: number; empty: string }) {
  const visibleChannels = channels.slice(0, limit);
  if (!visibleChannels.length) return <p className="discord-widget__empty">{empty}</p>;
  return (
    <ul className="discord-widget__channels" id={id}>
      {visibleChannels.map((channel) => (
        <li key={channel.id}>
          <span className="discord-widget__channel-icon" aria-hidden="true">{channelIcons[channel.type]}</span>
          <span>
            <strong>{channel.name}</strong>
            <small>{[channel.categoryName, channel.topic].filter(Boolean).join(" · ") || channelTypeLabel(channel.type)}</small>
          </span>
          {channel.url
            ? <a href={channel.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${channel.name} in Discord`}>Open <ArrowIcon /></a>
            : <b>{channelTypeLabel(channel.type)}</b>}
        </li>
      ))}
    </ul>
  );
}

function MemberList({
  id,
  members,
  limit,
  freshness,
  profile,
  setProfile,
}: {
  id: string;
  members: DiscordMember[];
  limit: number;
  freshness: CommunityFreshness;
  profile: ProfileState;
  setProfile: (profile: ProfileState) => void;
}) {
  const visibleMembers = members.slice(0, limit);
  const closeTimer = useRef<number | null>(null);
  const cancelClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      if (!profile?.pinned) setProfile(null);
    }, 180);
  };
  useEffect(() => () => cancelClose(), []);
  if (!visibleMembers.length) return <p className="discord-widget__empty">No public member presence is visible right now.</p>;
  return (
    <>
      <ul className="discord-widget__members" id={id}>
        {visibleMembers.map((member) => {
          const expanded = profile?.member.id === member.id;
          return (
            <li key={member.id} data-status={member.status}>
              <button
                type="button"
                className="discord-widget__member-trigger"
                data-enriched={member.enriched}
                aria-expanded={member.enriched ? expanded : undefined}
                aria-controls={member.enriched && expanded ? `${id}-profile` : undefined}
                onPointerEnter={(event) => {
                  if (!member.enriched) return;
                  cancelClose();
                  setProfile({ member, trigger: event.currentTarget, pinned: false });
                }}
                onPointerLeave={() => member.enriched && scheduleClose()}
                onFocus={(event) => member.enriched && setProfile({ member, trigger: event.currentTarget, pinned: false })}
                onClick={(event) => {
                  if (!member.enriched) return;
                  setProfile(expanded && profile?.pinned ? null : { member, trigger: event.currentTarget, pinned: true });
                }}
              >
                <MemberAvatar member={member} />
                <span><strong>{member.name}</strong><small>{freshness === "stale" ? "Profile · last published" : statusLabels[member.status]}</small></span>
              </button>
            </li>
          );
        })}
      </ul>
      {profile && visibleMembers.some((member) => member.id === profile.member.id) && (
        <MemberProfile
          id={`${id}-profile`}
          profile={profile}
          freshness={freshness}
          onClose={() => setProfile(null)}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
        />
      )}
    </>
  );
}

function MemberAvatar({ member, large = false }: { member: DiscordMember; large?: boolean }) {
  return (
    <span className={`discord-widget__avatar${large ? " discord-widget__avatar--large" : ""}`} aria-hidden="true">
      {member.avatarUrl
        ? <img src={member.avatarUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        : member.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function MemberProfile({
  id,
  profile,
  freshness,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: {
  id: string;
  profile: NonNullable<ProfileState>;
  freshness: CommunityFreshness;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  useEffect(() => {
    const update = () => {
      const anchor = profile.trigger.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 24);
      const estimatedHeight = 286;
      const left = Math.max(12, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - 12));
      const below = anchor.bottom + 12;
      const top = below + estimatedHeight <= window.innerHeight ? below : Math.max(12, anchor.top - estimatedHeight - 12);
      setPosition({ left, top });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        profile.trigger.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!profile.trigger.contains(target) && !cardRef.current?.contains(target)) onClose();
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose, profile]);
  const member = profile.member;
  return createPortal(
    <div
      ref={cardRef}
      className="discord-profile"
      id={id}
      role="dialog"
      aria-label={`${member.name} public Discord profile`}
      data-status={member.status}
      style={{ left: position.left, top: position.top }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="discord-profile__rail" aria-hidden="true" />
      <header><MemberAvatar member={member} large /><div><span>Public Discord profile</span><strong>{member.name}</strong>{member.bot && <b>BOT</b>}</div></header>
      <dl>
        <div><dt>Username</dt><dd>@{member.username}</dd></div>
        {member.nickname && member.nickname !== member.name && <div><dt>Server nickname</dt><dd>{member.nickname}</dd></div>}
        <div><dt>Presence</dt><dd>{freshness === "stale" ? "Not shown · snapshot is stale" : statusLabels[member.status]}</dd></div>
        <div><dt>Member since</dt><dd>{member.joinedAt ? formatMemberDate(member.joinedAt) : "Not available"}</dd></div>
      </dl>
      <small>{profile.pinned ? "Pinned · press Escape or tap elsewhere to close" : "Select to pin this card"}</small>
    </div>,
    document.body,
  );
}

export function DiscordCommunityWidget({ mode }: { mode: "compact" | "full" }) {
  const [state, setState] = useState<WidgetState>({ status: "loading", data: null });
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [channelsExpanded, setChannelsExpanded] = useState(false);
  const [profile, setProfile] = useState<ProfileState>(null);
  const headingId = useId();
  const publicChannelHeadingId = useId();
  const voiceHeadingId = useId();
  const memberHeadingId = useId();
  const memberListId = useId();
  const publicChannelListId = useId();

  const load = useCallback(async (refresh = false) => {
    setState({ status: "loading", data: null });
    setMembersExpanded(false);
    setChannelsExpanded(false);
    setProfile(null);
    try {
      setState({ status: "ready", data: await getDiscordWidget({ refresh }) });
    } catch {
      setState({ status: "error", data: null });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getDiscordWidget()
      .then((data) => mounted && setState({ status: "ready", data }))
      .catch(() => mounted && setState({ status: "error", data: null }));
    return () => { mounted = false; };
  }, []);

  const isLoading = state.status === "loading";
  const isReady = state.status === "ready";
  const data = isReady ? state.data : null;
  const inviteUrl = data?.inviteUrl ?? THIRD_RAILIFY_DISCORD_FALLBACK_INVITE;
  const connectionLabel = isLoading ? "Connecting" : data ? sourceLabel(data) : "Community preview unavailable";
  const memberLimit = membersExpanded ? EXPANDED_MEMBER_LIMIT : DEFAULT_MEMBER_LIMIT;
  const returnedMemberCount = data?.members.length ?? 0;
  const visibleMemberCount = Math.min(returnedMemberCount, memberLimit);
  const canExpandMembers = returnedMemberCount > DEFAULT_MEMBER_LIMIT;
  const returnedPublicChannelCount = data?.publicChannels.length ?? 0;
  const publicChannelLimit = mode === "compact"
    ? COMPACT_PUBLIC_CHANNEL_LIMIT
    : channelsExpanded ? returnedPublicChannelCount : DEFAULT_PUBLIC_CHANNEL_LIMIT;
  const visiblePublicChannelCount = Math.min(returnedPublicChannelCount, publicChannelLimit);
  const canExpandPublicChannels = mode === "full" && returnedPublicChannelCount > DEFAULT_PUBLIC_CHANNEL_LIMIT;
  const voiceLimit = mode === "compact" ? 2 : 8;
  const freshnessMessage = data ? freshnessCopy(data) : isLoading ? "Reading the community signal…" : "The live preview is unavailable; the Discord invite still works.";
  const onlineLabel = data?.freshness === "stale" ? "online when published" : data?.source === "basic" ? "Discord preview count" : "members online";

  return (
    <section className={`discord-widget discord-widget--${mode}`} data-state={state.status} data-source={data?.source} data-freshness={data?.freshness} aria-labelledby={headingId} aria-busy={isLoading}>
      <header className="discord-widget__header">
        <div className="discord-widget__brand">
          <span className="discord-widget__brand-mark" aria-hidden="true"><img src={discordIcon} alt="" /></span>
          <span><small>Official community</small><strong id={headingId}>{data?.name ?? "Third Railify"}</strong></span>
        </div>
        <span className="discord-widget__connection" role="status" aria-live="polite"><i aria-hidden="true" />{connectionLabel}</span>
      </header>

      <div className="discord-widget__overview">
        <div><strong>{data?.presenceCount ?? "—"}</strong><span>{onlineLabel}</span></div>
        <div><strong>{data ? data.publicChannels.length : "—"}</strong><span>public community channels</span></div>
        <p>{freshnessMessage}</p>
      </div>

      <div className="discord-widget__directory">
        <section className="discord-widget__panel discord-widget__panel--public" aria-labelledby={publicChannelHeadingId}>
          <div className="discord-widget__panel-heading"><span aria-hidden="true">#</span><h3 id={publicChannelHeadingId}>Community channels</h3></div>
          {isLoading
            ? <LoadingDirectory label="Loading public channels" />
            : data
              ? <>
                  <ChannelList id={publicChannelListId} channels={data.publicChannels} limit={publicChannelLimit} empty={data.source === "basic" ? "Text channels need the richer bot snapshot; this is the basic Discord preview." : "No whitelisted public channels are published right now."} />
                  {canExpandPublicChannels && (
                    <div className="discord-widget__channel-controls">
                      <span>{visiblePublicChannelCount} of {returnedPublicChannelCount} public channels shown</span>
                      <button className="discord-widget__channel-toggle" type="button" aria-controls={publicChannelListId} aria-expanded={channelsExpanded} onClick={() => setChannelsExpanded((expanded) => !expanded)}>
                        {channelsExpanded ? "Show fewer channels" : "Show all channels"}
                      </button>
                    </div>
                  )}
                </>
              : <p className="discord-widget__empty">Public channel information is temporarily unavailable.</p>}
        </section>
        <section className="discord-widget__panel" aria-labelledby={voiceHeadingId}>
          <div className="discord-widget__panel-heading"><span aria-hidden="true">◉</span><h3 id={voiceHeadingId}>Voice spaces</h3></div>
          {isLoading
            ? <LoadingDirectory label="Loading visible voice spaces" />
            : data
              ? <ChannelList channels={data.voiceSpaces} limit={voiceLimit} empty="No public voice spaces are visible right now." />
              : <p className="discord-widget__empty">Live voice-space information is temporarily unavailable.</p>}
        </section>
        <section className="discord-widget__panel discord-widget__panel--members" aria-labelledby={memberHeadingId}>
          <div className="discord-widget__panel-heading"><span aria-hidden="true">⌁</span><h3 id={memberHeadingId}>{data?.freshness === "stale" ? "Last published profiles" : "Online now"}</h3></div>
          {isLoading
            ? <LoadingDirectory label="Loading public member presence" />
            : data
              ? <>
                  <MemberList id={memberListId} members={data.members} limit={memberLimit} freshness={data.freshness} profile={profile} setProfile={setProfile} />
                  {canExpandMembers && (
                    <div className="discord-widget__member-controls">
                      <span>{visibleMemberCount} of {returnedMemberCount} public presences shown</span>
                      <button className="discord-widget__member-toggle" type="button" aria-controls={memberListId} aria-expanded={membersExpanded} onClick={() => setMembersExpanded((expanded) => !expanded)}>
                        {membersExpanded ? "Show fewer members" : "Show more members"}
                      </button>
                    </div>
                  )}
                </>
              : <p className="discord-widget__empty">Live member presence is temporarily unavailable.</p>}
        </section>
      </div>

      <footer className="discord-widget__footer">
        <div><strong>The herd, on the wire.</strong><span>{footerCopy(data)}</span></div>
        <div className="discord-widget__actions">
          <button className="button button--secondary" type="button" disabled={isLoading} onClick={() => void load(true)}>{isLoading ? "Refreshing…" : "Refresh"}</button>
          <a className="button button--primary" href={inviteUrl} target="_blank" rel="noopener noreferrer">Join server <ArrowIcon /></a>
        </div>
      </footer>
    </section>
  );
}

function sourceLabel(data: DiscordWidgetData): string {
  if (data.source === "basic") return "Basic Discord preview";
  if (data.freshness === "stale") return "Last published bot snapshot";
  return "Live via Third Railify bot";
}

function freshnessCopy(data: DiscordWidgetData): string {
  if (data.source === "basic") return "The enriched bot snapshot is unavailable, so this is Discord's limited public preview.";
  const age = formatAge(data.ageSeconds ?? 0);
  if (data.freshness === "fresh") return `Community data published ${age}.`;
  if (data.freshness === "delayed") return `Community data is delayed · published ${age}.`;
  return `Last published ${age}. Member presence is neutralized until a fresh snapshot arrives.`;
}

function footerCopy(data: DiscordWidgetData | null): string {
  if (!data) return "No private Discord data or bot credential is exposed by this page.";
  if (data.source === "basic") return "Basic mode shows only Discord's public widget fields; rich profiles and text channels are not inferred.";
  return "The local bot publishes a bounded public snapshot only—never messages, permissions, private roles, or credentials.";
}

function channelTypeLabel(type: DiscordChannel["type"]): string {
  return ({ text: "Text channel", announcement: "Announcement", forum: "Forum", voice: "Voice space", stage: "Stage" })[type];
}

function formatAge(seconds: number): string {
  if (seconds < 60) return "less than a minute ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function formatMemberDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}
