import { useEffect, useId, useRef, useState } from "react";
import type { Wheel, WheelAccess, WheelOwner } from "./types";

type Props = {
  wheel: Wheel;
  access: WheelAccess | null;
  variant?: "identity" | "info";
  disabled?: boolean;
};

export function WheelOwnerDetails({ wheel, access, variant = "identity", disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const owner = wheel.owner || { displayName: "Unavailable creator", avatarUrl: null };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.requestAnimationFrame(() => trigger.current?.focus());
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  const toggle = () => {
    if (disabled) return;
    setOpen((current) => {
      if (!current) window.requestAnimationFrame(() => panel.current?.focus());
      return !current;
    });
  };

  return <div ref={root} className={`wheel-owner wheel-owner--${variant}`}>
    <button ref={trigger} type="button" className="wheel-owner__trigger" disabled={disabled} aria-expanded={open} aria-controls={panelId} aria-haspopup="dialog" aria-label={`Wheel owner and access details for ${wheel.title}`} onClick={toggle}>
      {variant === "identity" ? <><OwnerAvatar owner={owner} /><span><small>Owned by</small><strong>{owner.displayName}</strong></span></> : <span className="wheel-owner__info" aria-hidden="true">i</span>}
    </button>
    {open ? <section ref={panel} id={panelId} className="wheel-owner__panel" role="dialog" aria-label={`${wheel.title} ownership and permissions`} tabIndex={-1}>
      <header><OwnerAvatar owner={owner} /><div><small>Wheel owner</small><strong>{owner.displayName}</strong></div><button type="button" onClick={() => { setOpen(false); window.requestAnimationFrame(() => trigger.current?.focus()); }} aria-label="Close ownership details">×</button></header>
      <dl>
        <Detail label="Created" value={formatDate(wheel.createdAt)} />
        <Detail label="Updated" value={formatDate(wheel.updatedAt)} />
        <Detail label="Publication" value={`${titleCase(wheel.lifecycle)} · ${titleCase(wheel.visibility)}`} />
        <Detail label="Segments" value={`${wheel.participantCount} · ${wheel.weighted ? "Weighted" : "Equal weight"}`} />
        <Detail label="Draw modes" value={`${wheel.demoEnabled ? "Demo enabled" : "Demo disabled"} · ${wheel.officialEnabled ? "Official enabled" : "Official disabled"}`} />
        <Detail label="Your access" value={accessLabel(access)} />
        <Detail label="Can edit" value={access?.canEdit ? "Yes" : "No"} />
        <Detail label="Official draw" value={access?.canSpinOfficially ? "Permitted" : "Not permitted"} />
        <Detail label="Control locks" value={`${access?.editingLocked ? "Editing locked" : "Editing open"} · ${access?.officialSpinLocked ? "Official locked" : "Official open"}`} />
      </dl>
      <p>Private account identifiers and contact details are never exposed here.</p>
    </section> : null}
  </div>;
}

function OwnerAvatar({ owner }: { owner: WheelOwner }) {
  return <span className="wheel-owner__avatar" aria-hidden="true">{owner.avatarUrl ? <img src={owner.avatarUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <b>{initials(owner.displayName)}</b>}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function accessLabel(access: WheelAccess | null) {
  if (access?.isMasterAdmin) return "Master Admin override";
  if (access?.role === "owner") return "Owner";
  if (access?.role === "editor") return "Editor";
  if (access?.role === "spinner") return "Official spinner";
  return "Public viewer";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function titleCase(value: string) { return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "Unavailable"; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "TR"; }
