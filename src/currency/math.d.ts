export function convertCad(cadAmount: number, currency: string, rates: Record<string, number> | null): number | null;
export function formatMoney(amount: number, currency: string): string;
export function resolveInitialCurrency(queryValue: string | null, storedValue: string | null): string;
