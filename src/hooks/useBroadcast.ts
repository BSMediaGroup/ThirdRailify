import { createContext, useContext } from "react";
import type { BroadcastData } from "../lib/broadcast";

export type BroadcastContextValue = {
  data: BroadcastData | null;
  loading: boolean;
  unavailable: boolean;
  error: boolean;
};

export const BroadcastContext = createContext<BroadcastContextValue | null>(null);

export function useBroadcast(): BroadcastContextValue {
  const value = useContext(BroadcastContext);
  if (!value) throw new Error("useBroadcast must be used inside BroadcastProvider");
  return value;
}
