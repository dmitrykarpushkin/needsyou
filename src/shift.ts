// Demo-mode time shift, kept free of imports so tests/shift.test.mjs can load it with plain Node.
const ISO_TS = /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z)\b/g
const DATE_ONLY = /\b(\d{4}-\d{2}-\d{2})\b(?!T)/g

// Moves every ISO timestamp in a text by `ms`; date-only values (2026-10-28) move by whole days. Exported for the tests.
export function shiftTimes(text: string, ms: number): string {
  const days = Math.round(ms / 864e5)
  return text
    .replace(ISO_TS, (_, ts: string) => new Date(Date.parse(ts) + ms).toISOString().replace(/\.000Z$/, 'Z'))
    .replace(DATE_ONLY, (_, d: string) => new Date(Date.parse(d + 'T00:00:00Z') + days * 864e5).toISOString().slice(0, 10))
}
