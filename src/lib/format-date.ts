// Date formatting that renders identically on the server and in the browser.
//
// Client components are server-rendered first (in UTC, with the server's
// locale) and then hydrated in the visitor's browser (their own timezone
// and locale). Anything timezone- or locale-dependent -- getFullYear(),
// toLocaleDateString(undefined, ...) -- can produce different text in the
// two passes, which fails hydration (React #418) and throws away the
// server-rendered HTML for that subtree. Pinning both to en-US + UTC keeps
// the two passes in agreement.
//
// Release dates are stored as UTC midnight, so UTC is also simply correct
// for them; local time would show Dec 31 of the previous year for a Jan 1
// release anywhere west of UTC.

type DateInput = Date | string;

export function formatDate(value: DateInput, month: "long" | "short" | "numeric" = "long"): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month, day: "numeric", timeZone: "UTC" });
}

export function releaseYear(value: DateInput | null | undefined): number | null {
  return value ? new Date(value).getUTCFullYear() : null;
}
