const OUTER_WHITESPACE = /^\s+|\s+$/gu;
export function normalizePollTrigger(value: string) { if (typeof value !== "string") throw new TypeError("Poll trigger must be a string."); return value.normalize("NFKC").replace(OUTER_WHITESPACE, "").toLowerCase(); }
export function matchPollTrigger(trigger: string, message: string) { return normalizePollTrigger(trigger) === normalizePollTrigger(message); }
