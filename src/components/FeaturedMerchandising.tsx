export type FeaturedSlotState = "empty" | "loading" | "error";

export function FeaturedEmptySlot({ variant, index, state = "empty", className = "" }: { variant: "card" | "hero" | "support"; index: number; state?: FeaturedSlotState; className?: string }) {
  const copy = state === "error"
    ? { title: "FEATURED MERCH UNAVAILABLE", detail: "The catalogue could not be loaded." }
    : state === "loading"
      ? { title: "LOADING FEATURED MERCH", detail: "Checking the authoritative catalogue." }
      : { title: "NO FEATURED PRODUCT", detail: "Featured merchandise will appear here once selected." };
  return <div className={`featured-empty-slot featured-empty-slot--${variant}${className ? ` ${className}` : ""}`} data-featured-slot={index + 1} data-featured-state={state} role="status" aria-label={`Featured merchandise slot ${index + 1}: ${copy.title.toLowerCase()}`}>
    <span className="featured-empty-slot__mark" aria-hidden="true">TR</span>
    <span className="featured-empty-slot__copy"><strong>{copy.title}</strong><small>{copy.detail}</small></span>
  </div>;
}
