import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getAccountInbox } from "../account/inbox-client";
import { useAuth } from "./AuthProvider";

export function AccountWidget() {
  const { account, loading, openAuth, signOut, openAdminSite } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!account) { setUnreadMessages(0); return; }
    const controller = new AbortController();
    void getAccountInbox(false, controller.signal)
      .then((payload) => setUnreadMessages(payload.unread))
      .catch(() => { /* The menu destination remains available if inbox summary loading fails. */ });
    return () => controller.abort();
  }, [account, open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") { setOpen(false); return; }
      if (event instanceof MouseEvent && root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (loading) return <span className="account-widget account-widget--loading" aria-label="Loading account" />;
  if (!account) return <button className="account-login" type="button" onClick={() => openAuth("signin")}>Log in</button>;
  const accountType = account.role === "admin" ? (account.adminLevel === "master" ? "Master Admin" : "Admin") : "Member";
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const index = controls.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") { event.preventDefault(); controls[(index + 1 + controls.length) % controls.length]?.focus(); }
    if (event.key === "ArrowUp") { event.preventDefault(); controls[(index - 1 + controls.length) % controls.length]?.focus(); }
    if (event.key === "Home") { event.preventDefault(); controls[0]?.focus(); }
    if (event.key === "End") { event.preventDefault(); controls.at(-1)?.focus(); }
  };

  return (
    <div className="account-widget" ref={root}>
      <button className="account-widget__trigger" type="button" onClick={() => setOpen((value) => !value)} aria-label={`${account.displayName} account menu`} aria-expanded={open} aria-haspopup="menu">
        <AccountAvatar account={account} />
        <span className="account-widget__copy"><strong>{account.displayName}</strong><small>{accountType}</small></span>
        <b aria-hidden="true">&#9662;</b>
      </button>
      {open && (
        <div className="account-menu" role="menu" aria-label="Account menu" onKeyDown={handleMenuKeyDown}>
          <div className="account-menu__identity"><AccountAvatar account={account} /><div><strong>{account.displayName}</strong><span>{account.email || `@${account.username || "member"}`}</span><small>{accountType}</small></div></div>
          <dl className="account-menu__overview">
            <div><dt>Display name</dt><dd>{account.displayName}</dd></div>
            <div><dt>Handle</dt><dd>{account.username ? `@${account.username}` : "Member"}</dd></div>
            <div><dt>Account type</dt><dd>{account.role.toUpperCase()}</dd></div>
            <div><dt>Status</dt><dd>{account.status === "active" ? "Active" : account.status.replace("_", " ")}</dd></div>
          </dl>
          <div className="account-menu__actions">
            <Link to="/account" role="menuitem" onClick={() => setOpen(false)}><AccountMenuIcon name="profile" /><span>Account settings</span></Link>
            <Link to="/account/messages" role="menuitem" onClick={() => setOpen(false)}><AccountMenuIcon name="messages" /><span>Messages</span>{unreadMessages > 0 ? <b className="account-menu__badge" aria-label={`${unreadMessages} unread messages`}>{unreadMessages > 99 ? "99+" : unreadMessages}</b> : null}</Link>
            <Link to="/watch" role="menuitem" onClick={() => setOpen(false)}><AccountMenuIcon name="watch" /><span>Watch</span></Link>
            <Link to="/shop" role="menuitem" onClick={() => setOpen(false)}><AccountMenuIcon name="shop" /><span>Shop</span></Link>
            <Link to="/community" role="menuitem" onClick={() => setOpen(false)}><AccountMenuIcon name="community" /><span>Community</span></Link>
            <span className="account-menu__divider" role="separator" />
            <a href="https://admin.thirdrailify.com" target="_blank" rel="noopener noreferrer" role="menuitem" onClick={(event) => { event.preventDefault(); setOpen(false); void openAdminSite("/", true); }}><AccountMenuIcon name="shield" /><span>Admin dashboard</span></a>
            <button className="account-menu__logout" type="button" role="menuitem" onClick={() => { setOpen(false); void signOut(); }}><AccountMenuIcon name="logout" /><span>Sign out</span></button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenuIcon({ name }: { name: "profile" | "messages" | "watch" | "shop" | "community" | "shield" | "logout" }) {
  const paths: Record<typeof name, ReactNode> = {
    profile: <><circle cx="12" cy="8" r="3"/><path d="M5 21c.6-4.7 3-7 7-7s6.4 2.3 7 7"/></>,
    messages: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    watch: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></>,
    shop: <><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    community: <><circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6M16 7a3 3 0 0 1 0 5M16 15c3 0 4.5 1.7 5 5"/></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Z"/><path d="m9.5 12 1.7 1.7 3.6-3.8"/></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></>,
  };
  return <svg className="account-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AccountAvatar({ account, large = false }: { account: { avatarUrl: string | null; displayName: string }; large?: boolean }) {
  const initial = account.displayName.trim().charAt(0).toUpperCase() || "T";
  return account.avatarUrl
    ? <img className={`account-avatar${large ? " account-avatar--large" : ""}`} src={account.avatarUrl} alt="" referrerPolicy="no-referrer" />
    : <span className={`account-avatar account-avatar--initials${large ? " account-avatar--large" : ""}`} aria-hidden="true">{initial}</span>;
}
