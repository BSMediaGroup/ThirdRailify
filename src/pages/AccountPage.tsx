import { useEffect, useRef } from "react";
import { AccountAvatar } from "../auth/AccountWidget";
import { useAuth } from "../auth/AuthProvider";

export function AccountPage({ openLogin = false }: { openLogin?: boolean }) {
  const { account, loading, error, openAuth, signOut } = useAuth();
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

function providerLabel(provider: string) {
  return provider === "twitter" ? "X" : provider.charAt(0).toUpperCase() + provider.slice(1);
}
