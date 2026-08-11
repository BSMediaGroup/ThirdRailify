import { useCallback, useEffect, useId, useState } from "react";
import discordIcon from "../../assets/icons/discord.svg";
import {
  getDiscordWidget,
  THIRD_RAILIFY_DISCORD_FALLBACK_INVITE,
  type DiscordChannel,
  type DiscordMember,
  type DiscordWidgetData,
} from "../lib/discordWidget";
import { ArrowIcon } from "./Icons";

type WidgetState =
  | { status: "loading"; data: null }
  | { status: "ready"; data: DiscordWidgetData }
  | { status: "error"; data: null };

const DEFAULT_MEMBER_LIMIT = 12;
const EXPANDED_MEMBER_LIMIT = 24;

const statusLabels: Record<DiscordMember["status"], string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do not disturb",
  unknown: "Presence visible",
};

function LoadingDirectory({ label }: { label: string }) {
  return (
    <div className="discord-widget__placeholder" aria-hidden="true">
      <i />
      <span>{label}</span>
    </div>
  );
}

function ChannelList({ channels, limit }: { channels: DiscordChannel[]; limit: number }) {
  const visibleChannels = channels.slice(0, limit);
  if (!visibleChannels.length) return <p className="discord-widget__empty">No public voice spaces are visible right now.</p>;
  return (
    <ul className="discord-widget__channels">
      {visibleChannels.map((channel) => (
        <li key={channel.id}>
          <span className="discord-widget__channel-icon" aria-hidden="true">#</span>
          <span><strong>{channel.name}</strong><small>Voice space</small></span>
          <b>Open</b>
        </li>
      ))}
    </ul>
  );
}

function MemberList({ id, members, limit }: { id: string; members: DiscordMember[]; limit: number }) {
  const visibleMembers = members.slice(0, limit);
  if (!visibleMembers.length) return <p className="discord-widget__empty">No public member presence is visible right now.</p>;
  return (
    <ul className="discord-widget__members" id={id}>
      {visibleMembers.map((member) => (
        <li key={member.id} data-status={member.status}>
          <span className="discord-widget__avatar" aria-hidden="true">
            {member.avatarUrl
              ? <img src={member.avatarUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              : member.name.slice(0, 1).toUpperCase()}
          </span>
          <span><strong>{member.name}</strong><small>{statusLabels[member.status]}</small></span>
        </li>
      ))}
    </ul>
  );
}

export function DiscordCommunityWidget({ mode }: { mode: "compact" | "full" }) {
  const [state, setState] = useState<WidgetState>({ status: "loading", data: null });
  const [membersExpanded, setMembersExpanded] = useState(false);
  const headingId = useId();
  const channelHeadingId = useId();
  const memberHeadingId = useId();
  const memberListId = useId();

  const load = useCallback(async (refresh = false) => {
    setState({ status: "loading", data: null });
    try {
      const data = await getDiscordWidget({ refresh });
      setState({ status: "ready", data });
    } catch {
      setState({ status: "error", data: null });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getDiscordWidget()
      .then((data) => {
        if (mounted) setState({ status: "ready", data });
      })
      .catch(() => {
        if (mounted) setState({ status: "error", data: null });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isLoading = state.status === "loading";
  const isReady = state.status === "ready";
  const inviteUrl = isReady ? state.data.inviteUrl : THIRD_RAILIFY_DISCORD_FALLBACK_INVITE;
  const connectionLabel = isLoading ? "Connecting" : isReady ? "Live from Discord" : "Preview unavailable";
  const message = isLoading
    ? "Reading the live Discord community preview…"
    : isReady
      ? "Community presence refreshed from Discord's public widget."
      : "Live Discord preview unavailable. The community link is still available.";
  const channelLimit = mode === "compact" ? 2 : 8;
  const memberLimit = membersExpanded ? EXPANDED_MEMBER_LIMIT : DEFAULT_MEMBER_LIMIT;
  const returnedMemberCount = isReady ? state.data.members.length : 0;
  const visibleMemberCount = Math.min(returnedMemberCount, memberLimit);
  const canExpandMembers = returnedMemberCount > DEFAULT_MEMBER_LIMIT;

  return (
    <section
      className={`discord-widget discord-widget--${mode}`}
      data-state={state.status}
      aria-labelledby={headingId}
      aria-busy={isLoading}
    >
      <header className="discord-widget__header">
        <div className="discord-widget__brand">
          <span className="discord-widget__brand-mark" aria-hidden="true"><img src={discordIcon} alt="" /></span>
          <span><small>Official community</small><strong id={headingId}>{isReady ? state.data.name : "Third Railify"}</strong></span>
        </div>
        <span className="discord-widget__connection" role="status" aria-live="polite"><i aria-hidden="true" />{connectionLabel}</span>
      </header>

      <div className="discord-widget__overview">
        <div><strong>{isReady ? state.data.presenceCount : "—"}</strong><span>members online</span></div>
        <div><strong>{isReady ? state.data.channels.length : "—"}</strong><span>visible voice spaces</span></div>
        <p>{message}</p>
      </div>

      <div className="discord-widget__directory">
        <section className="discord-widget__panel" aria-labelledby={channelHeadingId}>
          <div className="discord-widget__panel-heading"><span aria-hidden="true">◉</span><h3 id={channelHeadingId}>Voice spaces</h3></div>
          {isLoading
            ? <LoadingDirectory label="Loading visible voice spaces" />
            : isReady
              ? <ChannelList channels={state.data.channels} limit={channelLimit} />
              : <p className="discord-widget__empty">Live voice-space information is temporarily unavailable.</p>}
        </section>
        <section className="discord-widget__panel" aria-labelledby={memberHeadingId}>
          <div className="discord-widget__panel-heading"><span aria-hidden="true">⌁</span><h3 id={memberHeadingId}>Online now</h3></div>
          {isLoading
            ? <LoadingDirectory label="Loading public member presence" />
            : isReady
              ? <>
                  <MemberList id={memberListId} members={state.data.members} limit={memberLimit} />
                  {canExpandMembers && (
                    <div className="discord-widget__member-controls">
                      <span>{visibleMemberCount} of {returnedMemberCount} public presences shown</span>
                      <button
                        className="discord-widget__member-toggle"
                        type="button"
                        aria-controls={memberListId}
                        aria-expanded={membersExpanded}
                        onClick={() => setMembersExpanded((expanded) => !expanded)}
                      >
                        {membersExpanded ? "Show fewer members" : "Show more members"}
                      </button>
                    </div>
                  )}
                </>
              : <p className="discord-widget__empty">Live member presence is temporarily unavailable.</p>}
        </section>
      </div>

      <footer className="discord-widget__footer">
        <div><strong>The herd, live.</strong><span>Public presence comes directly from Discord. No private member data or bot token is used.</span></div>
        <div className="discord-widget__actions">
          <button className="button button--secondary" type="button" disabled={isLoading} onClick={() => void load(true)}>
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
          <a className="button button--primary" href={inviteUrl} target="_blank" rel="noopener noreferrer">Join server <ArrowIcon /></a>
        </div>
      </footer>
    </section>
  );
}
