import { flagSource, normalizeCountryCode } from "./countryFlags";

export function CountryFlag({ countryCode }: { countryCode: string }) {
  const code = normalizeCountryCode(countryCode);
  return <img className="goats-country-flag" src={flagSource(code)} alt="" aria-hidden="true" width="24" height="16" data-goats-country-flag={code} />;
}
