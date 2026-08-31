import { useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type NoticeTone = "success" | "info" | "error";

type EphemeralNoticesProps = {
  notice?: string;
  error?: string;
  noticeTone?: Exclude<NoticeTone, "error">;
  noticeTitle?: string;
  errorTitle?: string;
  onDismissNotice?: () => void;
  onDismissError?: () => void;
};

export function EphemeralNotices({
  notice = "",
  error = "",
  noticeTone = "success",
  noticeTitle = "Update complete",
  errorTitle = "Action unavailable",
  onDismissNotice,
  onDismissError,
}: EphemeralNoticesProps) {
  const items = [
    error ? { key: `error:${error}`, message: error, tone: "error" as const, title: errorTitle, durationMs: 8_000, dismiss: onDismissError } : null,
    notice ? { key: `${noticeTone}:${notice}`, message: notice, tone: noticeTone, title: noticeTitle, durationMs: 5_200, dismiss: onDismissNotice } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const hasItems = items.length > 0;
  const latestDismiss = notice ? onDismissNotice : error ? onDismissError : undefined;

  useEffect(() => {
    if (!hasItems) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector('[aria-modal="true"]')) return;
      latestDismiss?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [error, hasItems, latestDismiss, notice]);

  if (typeof document === "undefined" || !hasItems) return null;
  return createPortal(
    items.map((item) => <NoticeCard key={item.key} message={item.message} tone={item.tone} title={item.title} durationMs={item.durationMs} dismiss={item.dismiss} />),
    noticeRegion(),
  );
}

function NoticeCard({ message, tone, title, durationMs, dismiss }: {
  message: string;
  tone: NoticeTone;
  title: string;
  durationMs: number;
  dismiss?: () => void;
}) {
  const dismissRef = useRef(dismiss);
  useEffect(() => { dismissRef.current = dismiss; }, [dismiss]);
  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, message]);
  const style = { "--ephemeral-notice-duration": `${durationMs}ms` } as CSSProperties;
  return (
    <section className={`ephemeral-notice ephemeral-notice--${tone}`} role={tone === "error" ? "alert" : "status"} aria-atomic="true" style={style}>
      <span className="ephemeral-notice__icon" aria-hidden="true"><NoticeIcon tone={tone} /></span>
      <span className="ephemeral-notice__copy"><strong>{title}</strong><span>{message}</span></span>
      {dismiss ? <button className="ephemeral-notice__dismiss" type="button" onClick={dismiss} aria-label="Dismiss notification"><CloseIcon /></button> : <span />}
      <i className="ephemeral-notice__timer" aria-hidden="true" />
    </section>
  );
}

function noticeRegion() {
  let region = document.getElementById("ephemeral-notice-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "ephemeral-notice-region";
    region.setAttribute("aria-label", "Page notifications");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-relevant", "additions removals");
    document.body.appendChild(region);
  }
  region.className = `ephemeral-notice-region${document.querySelector('[data-site-shell="mounted"]') ? " ephemeral-notice-region--site" : " ephemeral-notice-region--standalone"}`;
  return region;
}

function NoticeIcon({ tone }: { tone: NoticeTone }) {
  return tone === "success" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.7-2.8 8.1-7 10-4.2-1.9-7-5.3-7-10V6l7-3Z" /><path d="m9 12 2 2 4-5" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10" /><path d="M12 18h.01" /><circle cx="12" cy="12" r="9" /></svg>
  );
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>;
}
