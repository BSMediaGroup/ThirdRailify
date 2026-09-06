import type { CatalogueVariant } from "../types/catalogue";

type Dimension = { key: string; label: string; value: (variant: CatalogueVariant) => string };
const option = (variant: CatalogueVariant, name: string) => Object.entries(variant.options || {}).find(([key]) => key.toLowerCase() === name)?.[1]?.trim() || "";

export function variantDimensions(variants: CatalogueVariant[]): Dimension[] {
  const dimensions: Dimension[] = [
    { key: "color", label: "Color", value: (variant: CatalogueVariant) => variant.color?.trim() || option(variant, "color") || option(variant, "colour") },
    { key: "size", label: "Size", value: (variant: CatalogueVariant) => variant.size?.trim() || option(variant, "size") },
  ].filter(dimension => variants.some(variant => dimension.value(variant)));
  const keys = [...new Set(variants.flatMap(variant => Object.keys(variant.options || {}).map(key => key.toLowerCase())))];
  for (const key of keys) {
    // Provider production instructions are not customer-selectable options.
    if (["size", "color", "colour", "embroidery_type"].includes(key) || key.startsWith("thread_colors")) continue;
    if (new Set(variants.map(variant => option(variant, key))).size > 1) dimensions.push({ key, label: key.replace(/[_-]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()), value: (variant: CatalogueVariant) => option(variant, key) });
  }
  return dimensions;
}

export function ProductVariantSelectors({ variants, selected, onSelect }: { variants: CatalogueVariant[]; selected: CatalogueVariant | null; onSelect: (id: string) => void }) {
  const dimensions = variantDimensions(variants);
  const matching = variants.filter(variant => dimensions.every(dimension => dimension.value(variant) === (selected ? dimension.value(selected) : "")));
  return <div className="product-option-selectors">
    {dimensions.map((dimension, index) => {
      const values = [...new Set(variants.map(variant => dimension.value(variant)))];
      // Later options depend on earlier ones. Changing color preserves size when possible.
      const candidates = (value: string) => variants.filter(variant => variant.availability === "active" && dimension.value(variant) === value && dimensions.slice(0, index).every(prior => prior.value(variant) === (selected ? prior.value(selected) : "")));
      return <div className="commerce-variant-selector" key={dimension.key}>
        <label htmlFor={`product-option-${dimension.key}`}>{dimension.label}</label>
        <select id={`product-option-${dimension.key}`} value={selected ? dimension.value(selected) : ""} onChange={event => {
          const choices = candidates(event.target.value);
          const score = (variant: CatalogueVariant) => dimensions.reduce((total, other) => total + Number(selected !== null && other.value(variant) === other.value(selected)), 0);
          const next = choices.sort((left, right) => score(right) - score(left))[0];
          if (next) onSelect(next.id);
        }}>
          {values.map(value => <option key={value} value={value} disabled={!candidates(value).length}>{value || "Not specified"}{!candidates(value).length ? " — unavailable" : ""}</option>)}
        </select>
      </div>;
    })}
    {(!dimensions.length || matching.length > 1) && <div className="commerce-variant-selector">
      <label htmlFor="product-variant">Variant</label>
      <select id="product-variant" value={selected?.id || ""} onChange={event => onSelect(event.target.value)}>
        {(dimensions.length ? matching : variants).map(variant => <option key={variant.id} value={variant.id} disabled={variant.availability !== "active"}>{variant.label}{variant.availability !== "active" ? " — unavailable" : ""}</option>)}
      </select>
    </div>}
  </div>;
}
