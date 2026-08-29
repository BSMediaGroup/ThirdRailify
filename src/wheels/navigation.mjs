export function wheelGalleryNeighbours(items, currentSlug) {
  const ordered = Array.isArray(items) ? items : [];
  const index = ordered.findIndex((wheel) => wheel?.slug === currentSlug);
  if (index < 0) return { previous: null, currentPosition: null, next: null, total: ordered.length };
  return {
    previous: index > 0 ? ordered[index - 1] : null,
    currentPosition: index + 1,
    next: index + 1 < ordered.length ? ordered[index + 1] : null,
    total: ordered.length,
  };
}

export function wheelNavigationDirection(items, fromSlug, toSlug) {
  const ordered = Array.isArray(items) ? items : [];
  const from = ordered.findIndex((wheel) => wheel?.slug === fromSlug);
  const to = ordered.findIndex((wheel) => wheel?.slug === toSlug);
  if (from < 0 || to < 0 || from === to) return null;
  return to > from ? "next" : "previous";
}
