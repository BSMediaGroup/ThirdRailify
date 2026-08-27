import { useEffect, useRef, useState, type FormEvent } from "react";
import { AccountAvatar } from "../auth/AccountWidget";
import { useAuth } from "../auth/AuthProvider";
import { importAvatarUrl, updateDisplayName, uploadAvatar } from "../auth/client";

export function AccountPage({ openLogin = false }: { openLogin?: boolean }) {
  const { account, loading, error, openAuth, signOut, csrfToken, refresh } = useAuth();
  const opened = useRef(false);

  useEffect(() => {
    if (openLogin && !loading && !account && !opened.current) {
      opened.current = true;
      openAuth("signin");
    }
  }, [account, loading, openAuth, openLogin]);

  return (
    <section className="account-page">
      <div className="container account-page__inner">
        <p className="eyebrow">Third Railify account</p>
        <h1>{loading ? "Checking your account" : account ? "Your account" : "Sign in"}</h1>
        {loading && <p className="account-page__status" role="status">Loading your secure session...</p>}
        {!loading && !account && (
          <div className="account-page__signed-out">
            <p>{error || "Sign in or create an account to use your Third Railify identity."}</p>
            <button type="button" onClick={() => openAuth("signin")}>Open account login</button>
          </div>
        )}
        {!loading && account && (
          <div className="account-profile">
            <div className="account-profile__identity">
              <AccountAvatar account={account} large />
              <div><h2>{account.displayName}</h2><p>{account.email || (account.username ? `@${account.username}` : "No email supplied by provider")}</p></div>
            </div>
            <AvatarSettings displayName={account.displayName} csrfToken={csrfToken} onUpdated={refresh} />
            <dl className="account-profile__facts">
              <div><dt>Status</dt><dd>{account.status === "active" ? "Active" : account.status}</dd></div>
              <div><dt>Connected providers</dt><dd>{account.providers.length ? account.providers.map(providerLabel).join(", ") : "Email and password"}</dd></div>
              <div><dt>Email verification</dt><dd>{account.emailVerified ? "Verified" : account.email ? "Not verified" : "Not supplied"}</dd></div>
              {account.role === "admin" && <div><dt>Access</dt><dd>{account.adminLevel === "master" ? "Master Admin" : "Admin"}</dd></div>}
            </dl>
            <button className="account-profile__signout" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        )}
      </div>
    </section>
  );
}

function AvatarSettings({ displayName: currentDisplayName, csrfToken, onUpdated }: { displayName: string; csrfToken: string; onUpdated: () => Promise<void> }) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState<"name" | "file" | "url" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setDisplayName(currentDisplayName), [currentDisplayName]);

  const saveDisplayName = async (event: FormEvent) => {
    event.preventDefault();
    const nextName = displayName.replace(/\s+/g, " ").trim();
    if (!csrfToken || nextName.length < 2 || nextName.length > 80) {
      setError("Enter a display name between 2 and 80 characters."); return;
    }
    setBusy("name"); setError(""); setMessage("");
    try { await updateDisplayName(csrfToken, nextName); await onUpdated(); setDisplayName(nextName); setMessage("Display name updated."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The display name could not be updated."); }
    finally { setBusy(""); }
  };

  const saveFile = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !csrfToken) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP image no larger than 5 MB."); return;
    }
    setBusy("file"); setError(""); setMessage("");
    try {
      await uploadAvatar(csrfToken, file); await onUpdated(); setFile(null); if (fileInput.current) fileInput.current.value = ""; setMessage("Avatar updated from your upload.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The avatar could not be updated."); }
    finally { setBusy(""); }
  };

  const saveUrl = async (event: FormEvent) => {
    event.preventDefault();
    if (!imageUrl.trim() || !csrfToken) return;
    setBusy("url"); setError(""); setMessage("");
    try { await importAvatarUrl(csrfToken, imageUrl.trim()); await onUpdated(); setImageUrl(""); setMessage("Avatar updated from the image URL."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The avatar could not be updated."); }
    finally { setBusy(""); }
  };

  return <section className="public-avatar-settings" aria-labelledby="public-avatar-settings-title">
    <div><p className="eyebrow">Account settings</p><h3 id="public-avatar-settings-title">Change your profile</h3><p>Update your display name or avatar. Changes are verified and stored by the shared Admin account authority.</p></div>
    <div className="public-avatar-settings__forms">
      <form className="public-avatar-settings__name-form" onSubmit={saveDisplayName}><label><span>Display name</span><input type="text" autoComplete="name" minLength={2} maxLength={80} value={displayName} onChange={(event) => { setDisplayName(event.target.value); setError(""); setMessage(""); }} /></label><button type="submit" disabled={displayName.replace(/\s+/g, " ").trim() === currentDisplayName || Boolean(busy)}>{busy === "name" ? "Saving..." : "Save display name"}</button></form>
      <form onSubmit={saveFile}><label><span>Upload image</span><input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(""); setMessage(""); }} /></label><button type="submit" disabled={!file || Boolean(busy)}>{busy === "file" ? "Uploading..." : "Upload avatar"}</button></form>
      <form onSubmit={saveUrl}><label><span>Direct image URL</span><input type="url" inputMode="url" value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); setError(""); setMessage(""); }} placeholder="https://example.com/avatar.webp" /></label><button type="submit" disabled={!imageUrl.trim() || Boolean(busy)}>{busy === "url" ? "Importing..." : "Use image URL"}</button></form>
    </div>
    {(error || message) && <p className={`public-avatar-settings__status${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>{error || message}</p>}
  </section>;
}

function providerLabel(provider: string) {
  return provider === "twitter" ? "X" : provider.charAt(0).toUpperCase() + provider.slice(1);
}
