import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { consumePublicHandoff, endSession, fetchAuthConfig, fetchSession } from "./client";
import { AuthDialog } from "./AuthDialog";
import type { AuthAccount, AuthConfig, AuthMode, SessionPayload } from "./types";

type AuthContextValue = {
  loading: boolean;
  account: AuthAccount | null;
  config: AuthConfig | null;
  csrfToken: string;
  error: string;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  applySession: (payload: SessionPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
let startupRequest: Promise<{ config: AuthConfig; session: SessionPayload }> | null = null;
let startupSensitive: ReturnType<typeof takeSensitiveQuery> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; mode: AuthMode; resetToken: string }>({ open: false, mode: "signin", resetToken: "" });

  const setSession = useCallback((payload: SessionPayload) => {
    setAccount(payload.authenticated ? payload.account : null);
    setCsrfToken(payload.authenticated ? payload.csrfToken || "" : "");
  }, []);

  useEffect(() => {
    let active = true;
    const sensitive = takeSensitiveQuery();
    if (!startupRequest) {
      startupSensitive = sensitive;
      startupRequest = Promise.all([
        fetchAuthConfig(),
        sensitive.handoff ? consumePublicHandoff(sensitive.handoff) : fetchSession(),
      ]).then(([nextConfig, session]) => ({ config: nextConfig, session }));
    }
    const initial = startupSensitive || sensitive;
    startupRequest
      .then(({ config: nextConfig, session }) => {
        if (!active) return;
        setConfig(nextConfig);
        setSession(session);
        if (initial.reset) setDialog({ open: true, mode: "reset", resetToken: initial.reset });
        if (initial.authError) {
          setError("The provider did not complete sign in. Try again.");
          setDialog({ open: true, mode: "signin", resetToken: "" });
        }
        if (initial.handoff && session.returnTo && session.returnTo !== window.location.pathname) {
          window.location.assign(session.returnTo);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "The account service is unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setSession]);

  const refresh = useCallback(async () => {
    const session = await fetchSession();
    setSession(session);
  }, [setSession]);

  const applySession = useCallback(async (payload: SessionPayload) => {
    if (payload.handoffCode) {
      const session = await consumePublicHandoff(payload.handoffCode);
      setSession(session);
      setDialog((current) => ({ ...current, open: false }));
      return;
    }
    setSession(payload);
    if (payload.authenticated) setDialog((current) => ({ ...current, open: false }));
  }, [setSession]);

  const signOut = useCallback(async () => {
    if (!csrfToken) return;
    const session = await endSession(csrfToken);
    setSession(session);
  }, [csrfToken, setSession]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    account,
    config,
    csrfToken,
    error,
    openAuth: (mode = "signin") => setDialog({ open: true, mode, resetToken: "" }),
    closeAuth: () => setDialog((current) => ({ ...current, open: false })),
    applySession,
    signOut,
    refresh,
  }), [account, applySession, config, csrfToken, error, loading, refresh, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialog.open && (
        <AuthDialog
          initialMode={dialog.mode}
          initialError={error}
          resetToken={dialog.resetToken}
          config={config}
          onClose={value.closeAuth}
          onSession={applySession}
        />
      )}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

function takeSensitiveQuery() {
  const url = new URL(window.location.href);
  const handoff = url.searchParams.get("handoff") || "";
  const reset = url.searchParams.get("reset") || "";
  const authError = url.searchParams.get("auth_error") || "";
  for (const key of ["handoff", "reset", "auth_error", "return_to"]) url.searchParams.delete(key);
  if (handoff || reset || authError) window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return { handoff, reset, authError };
}
