import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { usePrivacy } from "../privacy/PrivacyProvider";
import type { OptionalConsent } from "../privacy/consent";
import { BoltIcon, CloseIcon } from "./Icons";

export function PrivacyControls() {
  const privacy = usePrivacy();
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const descriptionId = useId();
  const [draft, setDraft] = useState<OptionalConsent>(privacy.categories);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (privacy.managerOpen && !element.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setDraft(privacy.categories);
      element.showModal();
    } else if (!privacy.managerOpen && element.open) {
      element.close();
    }
  }, [privacy.categories, privacy.managerOpen]);

  const close = () => {
    privacy.closeManager();
    window.requestAnimationFrame(() => returnFocus.current?.focus());
  };
  const submit = (event: FormEvent) => { event.preventDefault(); privacy.saveChoices(draft); };
  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <>
      {!privacy.decision && (
        <section className="privacy-dock" aria-labelledby="privacy-dock-title">
          <div className="privacy-dock__mark" aria-hidden="true"><BoltIcon /></div>
          <div className="privacy-dock__copy">
            <strong id="privacy-dock-title">Privacy choices</strong>
            <p>We use essential storage to keep the site working. Optional technologies are off until you choose otherwise. <Link to="/privacy#cookies-local-storage">Details</Link></p>
          </div>
          <div className="privacy-dock__actions">
            <button className="privacy-action privacy-action--decision" type="button" onClick={privacy.acceptAll}>Accept all</button>
            <button className="privacy-action privacy-action--decision" type="button" onClick={privacy.rejectNonEssential}>Reject non-essential</button>
            <button className="privacy-action privacy-action--manage" type="button" onClick={privacy.openManager}>Manage</button>
          </div>
        </section>
      )}

      <dialog
        ref={dialog}
        className="privacy-dialog"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClose={() => { if (privacy.managerOpen) privacy.closeManager(); }}
        onKeyDown={trapFocus}
      >
        <form method="dialog" onSubmit={submit}>
          <header>
            <span aria-hidden="true"><BoltIcon /></span>
            <div><p>TRF / Privacy control</p><h2 id={headingId}>Privacy choices</h2></div>
            <button className="privacy-dialog__close" type="button" onClick={close} aria-label="Close privacy choices"><CloseIcon /></button>
          </header>
          <p id={descriptionId} className="privacy-dialog__intro">Choose which optional features may store or access information on this device. Essential functions remain available either way.</p>
          <div className="privacy-categories">
            <article className="privacy-category">
              <div><h3>Essential</h3><p>Authentication and security, your cart, and this privacy-choice record.</p></div>
              <span className="privacy-category__locked" aria-label="Essential is always on">On · required</span>
            </article>
            <label className="privacy-category" htmlFor="privacy-preferences">
              <div><h3>Preferences</h3><p>Remembers display currency, a cached exchange-rate snapshot, and non-sensitive GOATS draft text.</p></div>
              <span className="privacy-toggle"><input id="privacy-preferences" type="checkbox" checked={draft.preferences} onChange={(event) => setDraft((current) => ({ ...current, preferences: event.target.checked }))} /><span aria-hidden="true" /></span>
            </label>
            <label className="privacy-category" htmlFor="privacy-external-media">
              <div><h3>External media</h3><p>Loads YouTube privacy-enhanced or Rumble players. Providers may process requests and use their own storage.</p></div>
              <span className="privacy-toggle"><input id="privacy-external-media" type="checkbox" checked={draft.externalMedia} onChange={(event) => setDraft((current) => ({ ...current, externalMedia: event.target.checked }))} /><span aria-hidden="true" /></span>
            </label>
          </div>
          <p className="privacy-dialog__detail">See the complete device-storage and provider inventory in the <Link to="/privacy#cookies-local-storage" onClick={close}>Privacy Policy</Link>.</p>
          <footer>
            <button className="privacy-action privacy-action--decision" type="button" onClick={privacy.acceptAll}>Accept all</button>
            <button className="privacy-action privacy-action--decision" type="button" onClick={privacy.rejectNonEssential}>Reject non-essential</button>
            <button className="privacy-action privacy-action--save" type="submit">Save choices</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
