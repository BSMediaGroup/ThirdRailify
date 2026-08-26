import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function AccountWidget() {
  const { account, loading, openAuth, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

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

  return (
    <div className="account-widget" ref={root}>
      <button className="account-widget__trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
        <AccountAvatar account={account} />
        <span>{account.displayName}</span>
        <b aria-hidden="true">&#9662;</b>
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <div className="account-menu__identity"><strong>{account.displayName}</strong><span>{account.email || `@${account.username || "member"}`}</span></div>
          <Link to="/account" role="menuitem" onClick={() => setOpen(false)}>Account</Link>
          <Link to="/watch" role="menuitem" onClick={() => setOpen(false)}>Watch</Link>
          <Link to="/shop" role="menuitem" onClick={() => setOpen(false)}>Shop</Link>
          <Link to="/community" role="menuitem" onClick={() => setOpen(false)}>Community</Link>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); void signOut(); }}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export function AccountAvatar({ account, large = false }: { account: { avatarUrl: string | null; displayName: string }; large?: boolean }) {
  const initial = account.displayName.trim().charAt(0).toUpperCase() || "T";
  return account.avatarUrl
    ? <img className={`account-avatar${large ? " account-avatar--large" : ""}`} src={account.avatarUrl} alt="" referrerPolicy="no-referrer" />
    : <span className={`account-avatar account-avatar--initials${large ? " account-avatar--large" : ""}`} aria-hidden="true">{initial}</span>;
}
