import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import tripleZapMark from "../../assets/icons/trzap-0.svg";
import type { BroadcastCandidate, BroadcastData } from "../lib/broadcast";
import type { BannerConfig, BannerMessage } from "../lib/banner";
import { effectiveLiveCandidate } from "../lib/liveBanner";
import { ArrowIcon, CloseIcon, PlayIcon, RadioIcon } from "./Icons";

const DISMISSED_ANNOUNCEMENT_KEY = "thirdrailify.dismissed-announcement.v1";
const tripleZapMask = { "--triple-zap-mask": `url("${tripleZapMark}")` } as CSSProperties;

export function PromoBanner({ config, broadcast }: { config: BannerConfig | null; broadcast: BroadcastData | null }) {
  const [dismissedSignature, setDismissedSignature] = useState(() => readDismissedAnnouncement());
  if (!config) return null;
  const live = effectiveLiveCandidate(broadcast);
  if (live && config.live.enabled) return <LiveBanner config={config} candidate={live} />;
  if (!config.normal.enabled || config.normal.messages.length === 0) return null;
  const signature = JSON.stringify({ normal: config.normal, updatedAt: config.updatedAt });
  if (config.normal.dismissible && dismissedSignature === signature) return null;
  return <NormalBanner config={config} onDismiss={config.normal.dismissible ? () => { writeDismissedAnnouncement(signature); setDismissedSignature(signature); } : undefined} />;
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

function NormalBanner({ config, onDismiss }: { config: BannerConfig; onDismiss?: () => void }) {
  const { messages, mode, speed, glyph, glyphSize } = config.normal;
  const [active, setActive] = useState(0);
  const [repetitions, setRepetitions] = useState(2);
  const tickerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
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
  useLayoutEffect(() => {
    if (mode !== "ticker" || !tickerRef.current || !measureRef.current) return;
    const update = () => {
      const cycleWidth = measureRef.current?.scrollWidth || 1;
      const viewportWidth = tickerRef.current?.clientWidth || 1;
      setRepetitions((current) => {
        const next = Math.max(2, Math.ceil(viewportWidth / cycleWidth) + 1);
        return current === next ? current : next;
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(tickerRef.current);
    observer.observe(measureRef.current);
    return () => observer.disconnect();
  }, [glyph, glyphSize, messages, mode]);
  if (mode === "ticker") {
    const cycleSeconds = speed === "slow" ? 44 : speed === "fast" ? 22 : 30;
    return <aside className={`promo-banner promo-banner--normal is-ticker is-${speed} is-glyph-${glyphSize}${onDismiss ? " is-dismissible" : ""}`} aria-label="Site announcements"><div ref={tickerRef} className="promo-banner__ticker"><div ref={measureRef} className="promo-banner__ticker-measure" aria-hidden="true"><BannerTickerSegment messages={messages} glyph={glyph} duplicate /></div><div className="promo-banner__ticker-track" style={{ animationDuration: `${cycleSeconds * repetitions}s` }}><BannerTickerSegment messages={messages} glyph={glyph} repetitions={repetitions} /><BannerTickerSegment messages={messages} glyph={glyph} repetitions={repetitions} duplicate /></div></div>{onDismiss && <DismissButton onDismiss={onDismiss} />}</aside>;
  }
  if (mode === "crossfade") {
    return <aside className={`promo-banner promo-banner--normal is-crossfade is-${speed}${onDismiss ? " is-dismissible" : ""}`} aria-label="Site announcements"><div className="container promo-banner__inner"><div className="promo-banner__crossfade">{messages.map((message, index) => <NormalMessage key={`${index}-${message.text}`} message={message} active={index === active} />)}</div></div>{onDismiss && <DismissButton onDismiss={onDismiss} />}</aside>;
  }
  const message = messages[0];
  return <aside className={`promo-banner promo-banner--normal is-${mode} is-${speed}${onDismiss ? " is-dismissible" : ""}`} aria-label="Site announcement"><div className="container promo-banner__inner"><NormalMessage key={`${active}-${message.text}`} message={message} /></div>{onDismiss && <DismissButton onDismiss={onDismiss} />}</aside>;
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return <button className="promo-banner__dismiss" type="button" onClick={onDismiss} aria-label="Dismiss announcement"><CloseIcon /></button>;
}

function NormalMessage({ message, duplicate = false, active = false }: { message: BannerMessage; duplicate?: boolean; active?: boolean }) {
  return <span className={`promo-banner__message${active ? " is-active" : ""}`} aria-hidden={duplicate || undefined}><b>{message.text}</b>{message.ctaLabel && message.href ? <BannerLink message={message} duplicate={duplicate} /> : null}</span>;
}

function BannerTickerSegment({ messages, glyph, repetitions = 1, duplicate = false }: { messages: BannerMessage[]; glyph: BannerConfig["normal"]["glyph"]; repetitions?: number; duplicate?: boolean }) {
  return <div className="promo-banner__ticker-segment" aria-hidden={duplicate || undefined}>{Array.from({ length: repetitions }, (_, cycle) => messages.map((message, index) => <span className={`promo-banner__ticker-item${duplicate || cycle > 0 ? " is-duplicate" : ""}`} key={`${cycle}-${message.text}-${index}`}><NormalMessage message={message} duplicate={duplicate || cycle > 0} /><BannerDivider glyph={glyph} /></span>))}</div>;
}

function BannerDivider({ glyph }: { glyph: BannerConfig["normal"]["glyph"] }) {
  if (glyph === "zap") return <i className="promo-banner__divider promo-banner__divider--zap" style={tripleZapMask} aria-hidden="true" />;
  return <i className={`promo-banner__divider promo-banner__divider--${glyph}`} aria-hidden="true">{glyph === "arrow" ? "↯" : glyph === "diamond" ? "◆" : "•"}</i>;
}

function BannerLink({ message, duplicate = false }: { message: BannerMessage; duplicate?: boolean }) {
  if (!message.href || !message.ctaLabel) return null;
  if (message.href.startsWith("/")) return <Link className="promo-banner__message-link" to={message.href} tabIndex={duplicate ? -1 : undefined}>{message.ctaLabel}<ArrowIcon /></Link>;
  return <a className="promo-banner__message-link" href={message.href} target={message.newTab ? "_blank" : undefined} rel={message.newTab ? "noopener noreferrer" : undefined} tabIndex={duplicate ? -1 : undefined}>{message.ctaLabel}<ArrowIcon /></a>;
}

function readDismissedAnnouncement() {
  try { return window.localStorage.getItem(DISMISSED_ANNOUNCEMENT_KEY) || ""; } catch { return ""; }
}

function writeDismissedAnnouncement(signature: string) {
  try { window.localStorage.setItem(DISMISSED_ANNOUNCEMENT_KEY, signature); } catch { /* dismissal still applies for this page view */ }
}
