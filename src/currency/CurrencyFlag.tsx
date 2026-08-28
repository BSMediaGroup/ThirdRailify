/* eslint-disable react-refresh/only-export-components */
const COUNTRY_BY_CURRENCY: Record<string, string> = {
  AUD: "au", BRL: "br", CAD: "ca", CHF: "ch", CNY: "cn", CZK: "cz", DKK: "dk", EUR: "eu", GBP: "gb",
  HKD: "hk", HUF: "hu", IDR: "id", ILS: "il", INR: "in", ISK: "is", JPY: "jp", KRW: "kr", MXN: "mx",
  MYR: "my", NOK: "no", NZD: "nz", PHP: "ph", PLN: "pl", RON: "ro", SEK: "se", SGD: "sg", THB: "th",
  TRY: "tr", USD: "us", ZAR: "za",
};

const flagModules = import.meta.glob("../../assets/flags/*.svg", { eager: true, import: "default", query: "?url" }) as Record<string, string>;
const unknownFlag = flagModules["../../assets/flags/unknown.svg"];

export function currencyFlagSource(currency: string) {
  const country = COUNTRY_BY_CURRENCY[String(currency || "").toUpperCase()];
  return (country && flagModules[`../../assets/flags/${country}.svg`]) || unknownFlag;
}

export function CurrencyFlag({ currency, className = "currency-flag" }: { currency: string; className?: string }) {
  const code = String(currency || "").toUpperCase();
  return <img className={className} src={currencyFlagSource(code)} alt="" aria-hidden="true" width="24" height="16" data-currency-flag={COUNTRY_BY_CURRENCY[code] || "neutral"} />;
}

export function currencyFlagRegion(currency: string) { return COUNTRY_BY_CURRENCY[String(currency || "").toUpperCase()] || "neutral"; }
