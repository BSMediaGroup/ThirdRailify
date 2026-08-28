import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ALL_OPTIONAL,
  ESSENTIAL_ONLY,
  clearOwnedOptionalStorage,
  normalizeCategories,
  readConsentCookie,
  writeConsentCookie,
  type ConsentRecord,
  type OptionalConsent,
} from "./consent";

type PrivacyContextValue = {
  categories: OptionalConsent;
  decision: ConsentRecord | null;
  managerOpen: boolean;
  openManager: () => void;
  closeManager: () => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  saveChoices: (categories: OptionalConsent) => void;
  allowExternalMedia: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [decision, setDecision] = useState<ConsentRecord | null>(() => readConsentCookie());
  const [managerOpen, setManagerOpen] = useState(false);
  const categories = decision?.categories ?? ESSENTIAL_ONLY;

  const saveChoices = useCallback((nextValue: OptionalConsent) => {
    const next = normalizeCategories(nextValue);
    if (!next.preferences) clearOwnedOptionalStorage();
    setDecision(writeConsentCookie(next));
    setManagerOpen(false);
  }, []);

  const value = useMemo<PrivacyContextValue>(() => ({
    categories,
    decision,
    managerOpen,
    openManager: () => setManagerOpen(true),
    closeManager: () => setManagerOpen(false),
    acceptAll: () => saveChoices(ALL_OPTIONAL),
    rejectNonEssential: () => saveChoices(ESSENTIAL_ONLY),
    saveChoices,
    allowExternalMedia: () => saveChoices({ ...categories, externalMedia: true }),
  }), [categories, decision, managerOpen, saveChoices]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

// This provider and its hook intentionally share one small module.
// eslint-disable-next-line react-refresh/only-export-components
export function usePrivacy() {
  const value = useContext(PrivacyContext);
  if (!value) throw new Error("usePrivacy must be used inside PrivacyProvider");
  return value;
}
