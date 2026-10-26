// Rows of the Backlog page from backlog.json. Plain JS so a Node test can import it (tests/backlogRows.test.mjs).
// Order: the builder's "order" (module/id) when present, otherwise by value, highest first.
// Only rows with a plain-language phrase ("phrase") are returned; the rest are only counted, never shown with a raw machine title.
export function rowsOf(d) {
  const all = (d?.modules || []).flatMap(m => (m.todo || []).map(i => ({ ...i, module: m.module })))
  const pos = new Map((d?.order || []).map((k, n) => [k, n]))
  const at = r => pos.get(r.module + '/' + r.id) ?? 1e9 - (r.value || 0)
  const rows = all.filter(r => typeof r.phrase === 'string' && r.phrase.trim()).sort((a, b) => at(a) - at(b))
  return { rows, unphrased: all.length - rows.length }
}

// Importance section of a row: 5 "Most important", 4 "Important", 3 "Normal" (the builder caps agent housekeeping at 3).
export const levelOf = r => r.level ?? Math.max(3, Math.min(5, r.value || 0))
