// The one place that fetches data files. Every page asks for a file by its name ("agents.json", "journal/2026-10-26.jsonl");
// this module decides where it comes from (demo files or a real backend) and, in demo mode, makes the timestamps current.
import { CONFIG, DEMO_ANCHOR } from './config'
import { shiftTimes } from './shift'

export type Fetched = { status: number; text: string | null; lastModified: number | null }

async function raw(url: string): Promise<Fetched> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return { status: r.status, text: null, lastModified: null }
    const lm = Date.parse(r.headers.get('last-modified') || '')
    return { status: r.status, text: await r.text(), lastModified: isNaN(lm) ? null : lm }
  } catch {
    return { status: 0, text: null, lastModified: null }
  }
}

let demoJournal: Promise<string[]> | null = null
const DAY_MS = 864e5

// Demo time shift, two kinds. Things that happen on a wall-clock schedule (the journal, service runs, routine runs) move by whole days,
// so a job scheduled for 02:00 still ran at 02:00; events that would land in the future are dropped. Everything else (heartbeats, asks,
// PRs, Lab steps) moves by the exact offset, so "12 minutes ago" stays "12 minutes ago".
const demoOffsets = () => { const exact = Date.now() - DEMO_ANCHOR; return { exact, days: Math.floor(exact / DAY_MS) * DAY_MS } }

async function demoJournalLines(): Promise<{ line: string; ts: string; ev: any }[]> {
  demoJournal ||= raw(CONFIG.baseUrl + 'journal.jsonl').then(f => (f.text || '').split('\n').filter(l => l.trim()))
  const { days } = demoOffsets(), now = Date.now()
  return (await demoJournal).map(l => shiftTimes(l, days)).flatMap(line => {
    try { const ev = JSON.parse(line); return Date.parse(ev.ts) <= now ? [{ line, ts: String(ev.ts), ev }] : [] } catch { return [] }
  })
}

export async function fetchFile(name: string): Promise<Fetched> {
  const file = name.replace(/^\.\//, '')
  if (CONFIG.source === 'http') return raw(CONFIG.baseUrl + file)
  const { exact, days } = demoOffsets()
  // demo: the journal is one file; a day file is the slice of it that falls on that UTC day after the shift
  const day = file.match(/^journal\/(\d{4}-\d{2}-\d{2})\.jsonl$/)
  if (day) {
    const lines = (await demoJournalLines()).filter(x => x.ts.slice(0, 10) === day[1]).map(x => x.line)
    return { status: lines.length ? 200 : 404, text: lines.length ? lines.join('\n') : null, lastModified: Date.now() }
  }
  const f = await raw(CONFIG.baseUrl + file)
  if (f.text === null) return f
  if (file === 'schedules.json') return { ...f, text: shiftTimes(f.text, days), lastModified: Date.now() }
  if (file === 'services.json') {
    // the runs of each service are recomputed from the shifted journal, so the Agents and Activity pages agree with the schedule
    const data = JSON.parse(shiftTimes(f.text, exact))
    const evs = (await demoJournalLines()).filter(x => x.ev.event === 'end')
    for (const s of data.services || []) {
      const mine = evs.filter(x => x.ev.service === s.id)
      if (mine.length) s.runs = mine.slice(-5).reverse().map(x => ({ ts: x.ts, ok: x.ev.ok !== false, dur: x.ev.duration_s }))
    }
    return { ...f, text: JSON.stringify(data), lastModified: Date.now() }
  }
  return { ...f, text: shiftTimes(f.text, exact), lastModified: Date.now() }
}

export async function fetchJson<T = any>(name: string): Promise<T> {
  const f = await fetchFile(name)
  if (f.text === null) throw new Error(`${name}: ${f.status || 'network error'}`)
  return JSON.parse(f.text) as T
}
