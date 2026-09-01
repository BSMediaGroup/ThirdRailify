import { countryName, countryOptions, isKnownCountry, isKnownRegion, normalizeCountry, normalizeRegion, regionLabel, regionOptions } from "../address/geography";

type Props = {
  countryCode: string;
  region: string;
  onCountryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  allowedCountryCodes?: readonly string[];
  countryError?: string;
  regionError?: string;
  idPrefix: string;
  className?: string;
  countryHint?: string;
  countryDisabled?: boolean;
};

export function CountryRegionFields({ countryCode, region, onCountryChange, onRegionChange, allowedCountryCodes, countryError, regionError, idPrefix, className = "", countryHint, countryDisabled = false }: Props) {
  const canonicalCountry = normalizeCountry(countryCode);
  const canonicalRegion = normalizeRegion(canonicalCountry, region);
  const countries = countryOptions(allowedCountryCodes);
  const unavailableCountry = Boolean(canonicalCountry) && !countries.some((country) => country.code === canonicalCountry);
  const regions = regionOptions(canonicalCountry);
  const unknownCountry = Boolean(countryCode) && !isKnownCountry(countryCode);
  const unknownRegion = Boolean(region) && regions.length > 0 && !isKnownRegion(canonicalCountry, region);
  const countryErrorId = `${idPrefix}-country-error`;
  const regionErrorId = `${idPrefix}-region-error`;
  const legacyId = `${idPrefix}-region-legacy`;
  const changeCountry = (next: string) => {
    const normalizedCountry = normalizeCountry(next);
    const nextRegions = regionOptions(normalizedCountry);
    const retained = nextRegions.some((option) => option.code === canonicalRegion) ? canonicalRegion : "";
    onCountryChange(normalizedCountry);
    if (retained !== region) onRegionChange(retained);
  };
  return <div className={`country-region-fields${className ? ` ${className}` : ""}`}>
    <div className={`geography-field${countryError ? " has-error" : ""}`}>
      <label htmlFor={`${idPrefix}-country`}>Country</label>
      <select id={`${idPrefix}-country`} required disabled={countryDisabled} value={canonicalCountry} onChange={(event) => changeCountry(event.target.value)} autoComplete="country" aria-invalid={Boolean(countryError)} aria-describedby={countryError ? countryErrorId : undefined}>
        {!canonicalCountry && <option value="">Choose a country</option>}
        {unknownCountry && <option value={canonicalCountry}>{countryName(countryCode)} (legacy value)</option>}
        {!unknownCountry && unavailableCountry && <option value={canonicalCountry}>{countryName(countryCode)} (currently unavailable)</option>}
        {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
      </select>
      {countryError ? <strong id={countryErrorId}>{countryError}</strong> : countryHint ? <small>{countryHint}</small> : null}
    </div>
    <div className={`geography-field${regionError ? " has-error" : ""}`}>
      <label htmlFor={`${idPrefix}-region`}>{regionLabel(canonicalCountry)}</label>
      <select id={`${idPrefix}-region`} required={["AU", "CA", "US"].includes(canonicalCountry)} value={regions.length ? canonicalRegion : ""} onChange={(event) => onRegionChange(event.target.value)} autoComplete="address-level1" disabled={!regions.length} aria-invalid={Boolean(regionError)} aria-describedby={[regionError ? regionErrorId : "", unknownRegion ? legacyId : ""].filter(Boolean).join(" ") || undefined}>
        <option value="">{regions.length ? `Choose ${regionLabel(canonicalCountry).toLowerCase()}` : "Not applicable"}</option>
        {unknownRegion && <option value={canonicalRegion}>{region} (legacy value)</option>}
        {regions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
      </select>
      {unknownRegion && <small id={legacyId} className="geography-field__notice">This saved region is not in the current country dataset. It will be preserved unless you choose another value.</small>}
      {regionError && <strong id={regionErrorId}>{regionError}</strong>}
    </div>
  </div>;
}
