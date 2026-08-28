import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { BroadcastCandidate, BroadcastData } from "../lib/broadcast";
import type { BannerConfig, BannerMessage } from "../lib/banner";
import { effectiveLiveCandidate } from "../lib/liveBanner";
import { ArrowIcon, PlayIcon, RadioIcon } from "./Icons";

export function PromoBanner({ config, broadcast }: { config: BannerConfig | null; broadcast: BroadcastData | null }) {
  if (!config) return null;
  const live = effectiveLiveCandidate(broadcast);
  if (live && config.live.enabled) return <LiveBanner config={config} candidate={live} />;
  if (!config.normal.enabled || config.normal.messages.length === 0) return null;
  return <NormalBanner config={config} />;
}

function LiveBanner({ config, candidate }: { config: BannerConfig; candidate: BroadcastCandidate }) {
  const live = config.live;
  return (
    <aside className={`promo-banner promo-banner--live is-${live.animation} is-${live.intensity}`} aria-label="Live broadcast announcement" aria-live="polite">
      <div className="promo-banner__energy" aria-hidden="true" />
      <div className="container promo-banner__inner">
        <span className="promo-banner__live-mark"><i /><RadioIcon /><strong>{live.label}</strong></span>
        <span className="promo-banner__live-copy">{live.showTitle && <b title={candidate.title}>{candidate.title}</b>}{live.supportingText && <small>{live.supportingText}</small>}</span>
        <Link className="promo-banner__cta" to="/watch/live"><PlayIcon />{live.ctaLabel}<ArrowIcon /></Link>
      </div>
    </aside>
  );
}

function NormalBanner({ config }: { config: BannerConfig }) {
  const { messages, mode, speed } = config.normal;
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (mode !== "crossfade" || messages.length < 2) return;
    const durations = { slow: 10_000, normal: 7_000, fast: 5_000 };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) window.clearInterval(timer);
      if (!reduced.matches && !document.hidden) timer = window.setInterval(() => setActive((index) => (index + 1) % messages.length), durations[speed]);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", schedule);
    return () => { document.removeEventListener("visibilitychange", schedule); reduced.removeEventListener("change", schedule); if (timer !== null) window.clearInterval(timer); };
  }, [messages.length, mode, speed]);
  if (mode === "ticker" && messages.length > 1) {
    return <aside className={`promo-banner promo-banner--normal is-ticker is-${speed}`} aria-label="Site announcements"><div className="promo-banner__ticker"><div>{[...messages, ...messages].map((message, index) => <NormalMessage key={`${message.text}-${index}`} message={message} duplicate={index >= messages.length} />)}</div></div></aside>;
  }
  const message = messages[mode === "crossfade" ? active : 0] ?? messages[0];
  return <aside className={`promo-banner promo-banner--normal is-${mode} is-${speed}`} aria-label="Site announcement"><div className="container promo-banner__inner"><NormalMessage key={`${active}-${message.text}`} message={message} /></div></aside>;
}

function NormalMessage({ message, duplicate = false }: { message: BannerMessage; duplicate?: boolean }) {
  return <span className="promo-banner__message" aria-hidden={duplicate || undefined}><b>{message.text}</b>{message.ctaLabel && message.href ? <BannerLink message={message} /> : null}<i aria-hidden="true" /></span>;
}

function BannerLink({ message }: { message: BannerMessage }) {
  if (!message.href || !message.ctaLabel) return null;
  if (message.href.startsWith("/")) return <Link className="promo-banner__message-link" to={message.href}>{message.ctaLabel}<ArrowIcon /></Link>;
  return <a className="promo-banner__message-link" href={message.href} target={message.newTab ? "_blank" : undefined} rel={message.newTab ? "noopener noreferrer" : undefined}>{message.ctaLabel}<ArrowIcon /></a>;
}
