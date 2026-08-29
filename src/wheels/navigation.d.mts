import type { WheelSummary } from "./types";

export type WheelGalleryNeighbours = {
  previous: WheelSummary | null;
  currentPosition: number | null;
  next: WheelSummary | null;
  total: number;
};

export function wheelGalleryNeighbours(items: readonly WheelSummary[], currentSlug: string): WheelGalleryNeighbours;
export function wheelNavigationDirection(items: readonly WheelSummary[], fromSlug: string, toSlug: string): "next" | "previous" | null;
