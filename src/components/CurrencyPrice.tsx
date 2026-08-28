import { useEffect, useId, useRef, useState } from "react";
import { useCurrency } from "../currency/CurrencyProvider";
import { CurrencyFlag } from "../currency/CurrencyFlag";
import { convertCad, formatMoney } from "../currency/math.js";

export function ProductPrice({ price, formattedPrice, prominent = false }: { price: number; formattedPrice: string; prominent?: boolean }) {
  const available = Number.isFinite(price) && price >= 0;
  const from = /^\s*from\b/i.test(formattedPrice);
  const cad = available ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" }).format(price) : "Price unavailable";
  return <div className={`commerce-price commerce-price--cad${prominent ? " commerce-price--prominent" : ""}`}><strong>{available ? <><CurrencyFlag currency="CAD" />{from ? <small>FROM</small> : null}<span>{cad} CAD</span></> : "Price unavailable"}</strong></div>;
}

export function CadAmount({ minorUnits, className = "cad-amount" }: { minorUnits: number; className?: string }) { return <span className={className}><CurrencyFlag currency="CAD" /><span>{new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" }).format(minorUnits / 100)} CAD</span></span>; }

export function ProductCurrencyComparison({ cadPrice }: { cadPrice: number }) {
  const { currency, currencies, rates, status, date, setCurrency } = useCurrency();
  const panelId = useId();
  const [expanded, setExpanded] = useState(true);
  const converted = convertCad(cadPrice, currency, rates);
  return <div className={`product-currency-comparison${expanded ? " is-expanded" : ""}`}>
    <button className="product-currency-comparison__toggle" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)}><span>Price comparison</span><small>{expanded ? "Collapse" : "Expand"}</small><i aria-hidden="true">{expanded ? "−" : "+"}</i></button>
    {expanded ? <div className="product-currency-comparison__body" id={panelId}>
      <div className="product-currency-comparison__row"><span>Compare</span><strong>{converted === null ? "Conversion unavailable" : `≈ ${formatMoney(converted, currency)} ${currency}`}</strong><CurrencyChooser currency={currency} currencies={currencies} onChange={setCurrency} /></div>
      <small id="currency-rate-status">{status === "loading" ? "Loading reference rates" : status === "unavailable" ? "Reference conversion unavailable" : `${status === "stale" ? "Cached" : "Reference"} rates${date ? ` · ${date}` : ""}`}</small>
      <CurrencyDisclaimer />
    </div> : null}
  </div>;
}

function CurrencyChooser({ currency, currencies, onChange }: { currency: string; currencies: string[]; onChange: (currency: string) => void }) {
  const id = useId(); const [open, setOpen] = useState(false); const [active, setActive] = useState(Math.max(0, currencies.indexOf(currency)));
  const root = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const options = useRef<Array<HTMLButtonElement | null>>([]);
  const openAt = (index: number) => { const next = Math.max(0, Math.min(currencies.length - 1, index)); setActive(next); setOpen(true); window.requestAnimationFrame(() => options.current[next]?.focus()); };
  const close = (restore = true) => { setOpen(false); if (restore) window.requestAnimationFrame(() => trigger.current?.focus()); };
  const choose = (code: string) => { onChange(code); close(); };
  useEffect(() => { const index = currencies.indexOf(currency); if (index >= 0) setActive(index); }, [currencies, currency]);
  useEffect(() => { if (!open) return; const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(false); }; document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside); }, [open]);
  const triggerKey = (event: React.KeyboardEvent) => { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); openAt(event.key === "ArrowUp" ? Math.max(0, currencies.indexOf(currency) - 1) : Math.max(0, currencies.indexOf(currency))); } };
  const listKey = (event: React.KeyboardEvent) => { let next = active; if (event.key === "ArrowDown") next = (active + 1) % currencies.length; else if (event.key === "ArrowUp") next = (active - 1 + currencies.length) % currencies.length; else if (event.key === "Home") next = 0; else if (event.key === "End") next = currencies.length - 1; else if (event.key === "Escape") { event.preventDefault(); close(); return; } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(currencies[active]); return; } else return; event.preventDefault(); setActive(next); options.current[next]?.focus(); };
  return <div className="currency-chooser" ref={root}><button ref={trigger} className="currency-chooser__trigger" type="button" role="combobox" aria-expanded={open} aria-controls={`${id}-listbox`} aria-haspopup="listbox" aria-label="Compare in currency" onClick={() => open ? close(false) : openAt(Math.max(0, currencies.indexOf(currency)))} onKeyDown={triggerKey}><CurrencyFlag currency={currency} /><span>{currency}</span><i aria-hidden="true">▾</i></button>{open ? <div id={`${id}-listbox`} className="currency-chooser__list" role="listbox" aria-label="Comparison currency" onKeyDown={listKey}>{currencies.map((code, index) => <button key={code} ref={(node) => { options.current[index] = node; }} type="button" role="option" aria-selected={code === currency} className={code === currency ? "is-selected" : ""} tabIndex={index === active ? 0 : -1} onFocus={() => setActive(index)} onClick={() => choose(code)}><CurrencyFlag currency={code} /><span>{code}</span>{code === currency ? <b aria-hidden="true">✓</b> : null}</button>)}</div> : null}</div>;
}

export function CurrencyDisclaimer() { return <p className="currency-disclaimer">Approximate reference-rate comparison only. The authoritative price and any future checkout remain in CAD; taxes, card fees, and provider rates may differ.</p>; }
