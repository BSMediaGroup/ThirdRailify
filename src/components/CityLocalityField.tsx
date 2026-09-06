import { useEffect, useState } from "react";
import { countryName, normalizeCountry, normalizeRegion, regionName } from "../address/geography";
import "./city-locality-field.css";

type Place = { city: string; region: string; countryCode: string };
type Props = { idPrefix: string; value: string; countryCode: string; region: string; onChange: (value: string) => void; error?: string };

export function CityLocalityField({ idPrefix, value, countryCode, region, onChange, error }: Props) {
  const [focused, setFocused] = useState(false);
  const [edited, setEdited] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState("");
  const [active, setActive] = useState(-1);
  const country = normalizeCountry(countryCode);
  const id = `${idPrefix}-city`;
  const open = focused && !dismissed && results.length > 0;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setResults([]); setActive(-1); setStatus("");
    if (!focused || !edited || dismissed || value.trim().length < 3 || !country) return;
    const timer = window.setTimeout(async () => {
      setStatus("Finding cities and localities…");
      const timeout = window.setTimeout(() => controller.abort(), 6500);
      try {
        const params = new URLSearchParams({ q: value.trim(), country, region: regionName(country, region) });
        const response = await fetch(`/api/address/localities?${params}`, { signal: controller.signal, credentials: "omit" });
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        if (!payload.ok || !Array.isArray(payload.results)) throw new Error("unavailable");
        const matches = payload.results.filter((place: Place) => typeof place.city === "string" && typeof place.region === "string" && place.countryCode === country && (!region || normalizeRegion(country, place.region) === normalizeRegion(country, region))).slice(0, 8);
        if (cancelled || controller.signal.aborted) return;
        setResults(matches);
        setStatus(matches.length ? `${matches.length} suggestions available. Use up and down arrows to choose.` : "No matches found. You can keep your entered locality.");
      } catch {
        if (!cancelled) setStatus("Suggestions are unavailable. You can still enter your city or locality.");
      } finally { window.clearTimeout(timeout); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); controller.abort(); };
  }, [value, country, region, focused, edited, dismissed]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  const choose = (place: Place) => { setDismissed(true); setEdited(false); onChange(place.city); };
  return <div className={`city-locality-field${error ? " has-error" : ""}`}>
    <label htmlFor={id}>City / locality</label>
    <div className="city-locality-field__control">
      <input id={id} name="city" required maxLength={120} value={value} autoComplete="address-level2" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined} aria-invalid={Boolean(error)} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setDismissed(false); }} onChange={(event) => { setEdited(true); setDismissed(false); setResults([]); setActive(-1); onChange(event.target.value); }} onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") { if (open) { event.preventDefault(); event.stopPropagation(); } setDismissed(true); }
        if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); setActive((current) => event.key === "ArrowDown" ? (current + 1) % results.length : (current <= 0 ? results.length : current) - 1); }
        if (open && event.key === "Enter" && active >= 0) { event.preventDefault(); choose(results[active]); }
      }} />
      {open && <div className="city-locality-field__popup"><ul id={`${id}-options`} role="listbox" aria-label="City and locality suggestions">{results.map((place, index) => <li id={`${id}-option-${index}`} role="option" aria-selected={index === active} key={`${place.city}|${place.region}`} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(place)}><strong>{place.city}</strong><span>{[place.region, countryName(place.countryCode)].filter(Boolean).join(", ")}</span></li>)}</ul><small>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small></div>}
    </div>
    <small id={`${id}-hint`}>Type 3 or more characters for suggestions, or enter your own locality.</small>
    <small className={results.length || status.startsWith("Finding") ? "sr-only" : undefined} role="status">{status}</small>
    {error && <strong id={`${id}-error`}>{error}</strong>}
  </div>;
}
