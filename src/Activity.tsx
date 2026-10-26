// Agent activity: who ran during the last 24 hours, hour by hour, and what each run reported.
// Reads journal/<day>.jsonl (one JSON event per line) for the last three days and services.json for names; nothing is stored here.
import { useEffect, useState } from 'react'
import { Activity as ActivityIcon } from 'lucide-react'
import { Card } from './ui/card'
import { Empty } from './ui/empty'
import { failedServices } from './live'
import { fetchFile } from './data'
import { hhmm } from './format'

type Ev = { ts: string; run: string; service: string; event: string; ok?: boolean; code?: number; duration_s?: number; note?: string; reason?: string }
const HOURS = 24
const day = (d: Date) => d.toISOString().slice(0, 10)
const get = (name: string) => fetchFile(name).then(f => f.text)

async function load() {
  const days = [day(new Date()), day(new Date(Date.now() - 864e5)), day(new Date(Date.now() - 2 * 864e5))]
  const events: Ev[] = []
  for (const d of days) {
    for (const l of ((await get(`journal/${d}.jsonl`)) || '').split('\n')) { try { if (l.trim()) events.push(JSON.parse(l)) } catch { /* skip a broken line */ } }
  }
  let names: Record<string, string> = {}
  let svc: any = null
  try { svc = JSON.parse((await get('services.json')) || 'null'); names = Object.fromEntries((svc?.services || []).map((n: any) => [n.id, n.name])) } catch { /* names fall back to ids */ }
  return { events, names, failed: new Set<string>(failedServices(svc).map((n: any) => n.id)) }
}

export default function Activity() {
  const [S, setS] = useState<{ events: Ev[]; names: Record<string, string>; failed: Set<string> } | null>(null)
  useEffect(() => { const go = () => load().then(setS); go(); const t = setInterval(go, 60000); return () => clearInterval(t) }, [])
  if (!S) return null
  const now = Date.now(), start = Math.floor(now / 36e5) * 36e5 - (HOURS - 1) * 36e5
  const known = Object.keys(S.names).length > 0
  const rows = new Map<string, { cells: { ok: number; bad: number; skip: number }[]; last: Ev | null; lastNote: string }>()
  for (const e of S.events.slice().sort((a, b) => a.ts.localeCompare(b.ts))) {
    const t = Date.parse(e.ts)
    if (e.event === 'start' || isNaN(t) || t < start || t > now + 6e4) continue
    if (known && !S.names[e.service]) continue // same set of services as services.json, so "broken now" agrees everywhere
    const r = rows.get(e.service) || { cells: Array.from({ length: HOURS }, () => ({ ok: 0, bad: 0, skip: 0 })), last: null, lastNote: '' }
    const c = r.cells[Math.min(HOURS - 1, Math.floor((t - start) / 36e5))]
    if (e.event === 'skip') c.skip++; else if (e.ok === false) c.bad++; else c.ok++
    r.last = e
    if (e.note) r.lastNote = e.note
    rows.set(e.service, r)
  }
  const list = [...rows.entries()].sort((a, b) => b[1].last!.ts.localeCompare(a[1].last!.ts))
  const total = list.reduce((n, [, r]) => n + r.cells.reduce((m, c) => m + c.ok + c.bad, 0), 0)
  const bad = list.reduce((n, [, r]) => n + r.cells.reduce((m, c) => m + c.bad, 0), 0)
  const brokenNow = S.failed.size
  const tone = (c: { ok: number; bad: number; skip: number }) => c.bad ? 'bg-red-400' : c.ok ? (c.ok > 2 ? 'bg-emerald-400' : 'bg-emerald-500/70') : c.skip ? 'bg-zinc-500/60' : 'bg-white/[.05]'

  if (!list.length) return <Empty icon={<ActivityIcon size={22} />} title="Quiet so far">No runs recorded yet. As soon as agents run, they show up here.</Empty>
  return <>
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-zinc-300">
      <span><b className="text-3xl font-semibold tabular-nums text-zinc-50">{total}</b> <span className="text-sm text-zinc-400">runs in 24 h</span></span>
      <span><b className={`text-3xl font-semibold tabular-nums ${brokenNow ? 'text-red-300' : 'text-emerald-300'}`}>{brokenNow}</b> <span className="text-sm text-zinc-400">broken now</span>{bad > 0 && <span className="ml-2 text-xs text-zinc-500">{bad} failed in 24 h{brokenNow ? '' : ', all fixed'}</span>}</span>
      <span><b className="text-3xl font-semibold tabular-nums text-zinc-50">{list.length}</b> <span className="text-sm text-zinc-400">agents and services</span></span>
    </div>
    <Card className="overflow-hidden">
      <div className="hidden grid-cols-[minmax(140px,220px)_1fr] gap-4 border-b border-white/[.06] px-4 py-2 text-xs text-zinc-500 md:grid">
        <span /><div className="flex justify-between">{[0, 6, 12, 18].map(h => <span key={h}>{hhmm(start + h * 36e5)}</span>)}<span>now</span></div>
      </div>
      <div className="flex justify-between border-b border-white/[.06] px-4 py-2 text-xs text-zinc-400 md:hidden">{[0, 12].map(h => <span key={h}>{hhmm(start + h * 36e5)}</span>)}<span>now</span></div>
      {list.map(([id, r]) => <div key={id} className="grid grid-cols-1 gap-x-4 gap-y-1.5 border-b border-white/[.04] px-4 py-3 last:border-0 md:grid-cols-[minmax(140px,220px)_1fr] md:items-center">
        <div className="min-w-0"><div className="break-words text-sm text-zinc-100">{S.names[id] || id}</div><div className={`text-xs ${S.failed.has(id) ? 'text-red-300' : 'text-zinc-500'}`} title={r.lastNote || undefined}>{r.last!.event === 'skip' ? 'skipped' : S.failed.has(id) ? 'last run failed' : `last at ${hhmm(Date.parse(r.last!.ts))}`}</div></div>
        <div className="flex gap-[3px]" role="img" aria-label="runs by hour">{r.cells.map((c, i) => <span key={i} className={`h-6 min-w-0 flex-1 rounded-[3px] ${tone(c)}`} title={`${hhmm(start + i * 36e5)}: ${c.ok} ok, ${c.bad} failed${c.skip ? `, ${c.skip} skipped` : ''}`} />)}</div>
      </div>)}
    </Card>
  </>
}
