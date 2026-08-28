import { forwardRef, useCallback, useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { TurnstileWidget } from "../auth/TurnstileWidget";
import { BoltIcon, CloseIcon, MailIcon } from "../components/Icons";
import { sendContactMessage } from "./client";

export function ContactDialog({ siteKey, onClose }: { siteKey: string | null; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const successClose = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const acceptToken = useCallback((token: string) => setTurnstileToken(token), []);
  const verificationUnavailable = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    firstField.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onClose();
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);

  useEffect(() => { if (sent) successClose.current?.focus(); }, [sent]);

  const resetChallenge = useCallback(() => { setTurnstileToken(""); setResetKey((value) => value + 1); }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteKey) { setError("Contact verification is not configured for this environment."); return; }
    if (!turnstileToken) { setError("Complete the verification challenge before sending."); return; }
    if (!consent) { setError("Acknowledge the Privacy Policy before sending."); return; }
    const values = new FormData(event.currentTarget);
    busyRef.current = true; setBusy(true); setError("");
    try {
      await sendContactMessage({
        name: String(values.get("name") || ""),
        email: String(values.get("email") || ""),
        topic: String(values.get("topic") || ""),
        message: String(values.get("message") || ""),
        website: String(values.get("website") || ""),
        consent,
        turnstileToken,
      });
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your message could not be sent. Try again.");
      resetChallenge();
    } finally { busyRef.current = false; setBusy(false); }
  };

  return <div className="contact-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={dialog} className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title" aria-describedby="contact-dialog-intro">
      <button className="contact-dialog__close" type="button" onClick={onClose} disabled={busy} aria-label="Close contact form"><CloseIcon /></button>
      <header className="contact-dialog__header"><span><MailIcon /></span><div><p>Direct line / Third Railify</p><h2 id="contact-dialog-title">Send a message.</h2></div></header>
      <p id="contact-dialog-intro" className="contact-dialog__intro">Use this secure form for a general enquiry. Your message is delivered to the Third Railify contact inbox; your email is used so the team can reply.</p>
      {error && <div className="contact-dialog__alert" role="alert">{error}</div>}
      {sent ? <div className="contact-dialog__success" role="status"><BoltIcon /><p>Message delivered</p><h3>Your signal reached the rail.</h3><span>Thanks for getting in touch. Third Railify can reply using the email address you supplied.</span><button ref={successClose} className="button button--primary" type="button" onClick={onClose}>Close</button></div> : <form className="contact-form" onSubmit={submit}>
        <div className="contact-form__row"><ContactField ref={firstField} label="Your name" name="name" autoComplete="name" minLength={2} maxLength={100} /><ContactField label="Reply email" name="email" type="email" autoComplete="email" maxLength={254} /></div>
        <label className="contact-field"><span>What is this about?</span><select name="topic" defaultValue="general" required><option value="general">General enquiry</option><option value="show-media">Show and media</option><option value="merchandise">Merchandise</option><option value="accessibility">Accessibility</option><option value="privacy">Privacy</option></select></label>
        <label className="contact-field"><span>Your message</span><textarea name="message" minLength={20} maxLength={4000} rows={6} required /><small>20–4,000 characters</small></label>
        <label className="contact-honeypot" aria-hidden="true">Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
        <label className="contact-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I understand that my name, email and message will be processed to respond to this enquiry under the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</span></label>
        {siteKey ? <TurnstileWidget siteKey={siteKey} action="thirdrailify-contact" resetKey={resetKey} onToken={acceptToken} onUnavailable={verificationUnavailable} /> : <div className="contact-dialog__alert" role="status">Contact verification is not configured for this environment. The form is safely unavailable.</div>}
        <button className="contact-form__submit" type="submit" disabled={busy || !siteKey || !turnstileToken || !consent}><MailIcon />{busy ? "Sending…" : "Send message"}</button>
      </form>}
    </div>
  </div>;
}

const ContactField = forwardRef<HTMLInputElement, { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>>(function ContactField({ label, name, ...props }, ref) {
  return <label className="contact-field"><span>{label}</span><input ref={ref} name={name} required {...props} /></label>;
});
