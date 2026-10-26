// Schedule page: when each server timer and cloud routine runs, drawn on a 24-hour line, grouped by where it runs.
// Times are read from the plain-language schedule text (schedule.ts); what cannot be read is shown as "on demand" without a line.
// Long descriptions stay folded until the row is opened. Reads schedules.json.
import { useEffect, useState } from 'react'
import { ChevronDown, Clock, Cloud, Server, Timer as TimerIcon } from 'lucide-react'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Empty } from './ui/empty'
import { usePolled } from './live'
import { CONFIG } from './config'
import { ago } from './format'
import { projectOf } from './store'
import { DAY, firesToday, hm, inWords, nextIn, parseRule, wall, type Rule } from './schedule'

const TZ = CONFIG.timeZone
type Row = { name: string; does: string; note?: string; last?: string; color: string; short: string; rule: Rule; next: number | null }

function Lane({ r, now, next }: { r: Rule; now: number; next: number | null }) {
  const c = wall(now, TZ).min, today = firesToday(r, now, TZ)
  const nextMin = next !== null && c + next < DAY ? c + next : null
  return <div className="relative h-7 rounded-md bg-white/[.03]">
    {[6, 12, 18].map(h => <span key={h} className="absolute inset-y-0 w-px bg-white/[.05]" style={{ left: `${(h / 24) * 100}%` }} />)}
    {r.kind === 'times' && (r.dense
      ? <>
          <span className="absolute inset-y-2 left-0 rounded-l-sm bg-indigo-400/15" style={{ width: today ? `${(c / DAY) * 100}%` : '100%', backgroundImage: 'repeating-linear-gradient(90deg, rgba(165,180,252,.25) 0 1px, transparent 1px 4px)' }} />
          {today && <span className="absolute inset-y-2 right-0 rounded-r-sm bg-indigo-400/30" style={{ left: `${(c / DAY) * 100}%`, backgroundImage: 'repeating-linear-gradient(90deg, rgba(165,180,252,.6) 0 1px, transparent 1px 4px)' }} />}
        </>
      : r.mins.map(m => <span key={m} title={hm(m)}
          className={`absolute inset-y-1.5 w-1 -translate-x-1/2 rounded-full ${!today ? 'bg-zinc-600' : m === nextMin ? 'bg-indigo-300 ring-2 ring-indigo-300/30' : m < c ? 'bg-indigo-400/40' : 'bg-indigo-400'}`}
          style={{ left: `${(m / DAY) * 100}%` }} />))}
    <span className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded bg-amber-300" style={{ left: `${(c / DAY) * 100}%` }} />
  </div>
}

function Axis({ now }: { now: number }) {
  const c = wall(now, TZ).min
  return <div className="relative h-5 text-xs tabular-nums text-zinc-500">
    {[0, 3, 6, 9, 12, 15, 18, 21, 24].filter(h => Math.abs(h * 60 - c) > 200).map(h => <span key={h} className={`absolute -translate-x-1/2 ${h % 6 ? 'hidden sm:block' : ''} ${h === 0 ? 'translate-x-0' : h === 24 ? '-translate-x-full' : ''}`} style={{ left: `${(h / 24) * 100}%` }}>{String(h).padStart(2, '0')}</span>)}
    <span className="absolute -top-0.5 -translate-x-1/2 rounded bg-amber-300 px-1 font-medium text-zinc-950" style={{ left: `clamp(18px, ${(c / DAY) * 100}%, calc(100% - 18px))` }}>{hm(c)}</span>
  </div>
}

function RowView({ x, now }: { x: Row; now: number }) {
  const [open, setOpen] = useState(false)
  const r = x.rule
  return <div className="border-t border-white/[.05] first:border-t-0">
    <button onClick={() => setOpen(!open)} className="grid w-full cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-1.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[.025] md:grid-cols-[240px_minmax(0,1fr)_160px] md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full" style={{ background: x.color }} title={x.short} />
        <span className="min-w-0 break-words text-sm text-zinc-100" title={x.does}>{x.name}</span>
        {x.note && <span className="size-1.5 shrink-0 rounded-full bg-amber-300" title={x.note} />}
        <ChevronDown size={14} className={`ml-auto shrink-0 text-zinc-500 transition-transform md:ml-0 ${open ? 'rotate-180' : ''}`} />
      </div>
      {r.kind === 'times'
        ? <Lane r={r} now={now} next={x.next} />
        : <div className="flex h-7 items-center"><Badge tone="neutral">{r.label}</Badge></div>}
      <div className={`items-center gap-2 text-xs md:flex md:flex-col md:items-end md:gap-0.5 ${r.kind === 'times' ? 'flex' : 'hidden'}`}>
        <span className={x.next !== null && x.next < 60 ? 'text-indigo-300' : x.next !== null ? 'text-zinc-300' : 'text-zinc-500'}>{x.next !== null ? inWords(x.next) : r.kind === 'times' ? 'already passed' : '—'}</span>
        {r.kind === 'times' && <span className="text-zinc-500">{r.label}</span>}
      </div>
    </button>
    {open && <div className="space-y-1.5 px-4 pb-3 text-[13px] leading-relaxed text-zinc-400 md:pl-[36px] md:pr-5">
      <div>{x.does}</div>
      {x.last && <div className="text-zinc-500">{x.last}</div>}
      {x.note && <div className="text-amber-300/90">{x.note}</div>}
      <div className="flex flex-wrap gap-1.5 pt-0.5"><Badge tone="neutral"><span className="size-1.5 rounded-full" style={{ background: x.color }} />{x.short}</Badge>{r.kind === 'times' && !r.dense && <Badge tone="neutral">{r.mins.length > 6 ? `${hm(r.mins[0])} … ${hm(r.mins[r.mins.length - 1])}` : r.mins.map(hm).join(', ')}</Badge>}</div>
    </div>}
  </div>
}

function Group({ icon: I, title, rows, now }: { icon: any; title: string; rows: Row[]; now: number }) {
  return <Card className="overflow-hidden">
    <div className="grid grid-cols-1 items-end gap-x-4 border-b border-white/[.06] px-4 pb-2 pt-4 md:grid-cols-[240px_minmax(0,1fr)_160px] md:px-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300 md:mb-0"><I size={15} className="text-zinc-500" />{title}<span className="font-normal text-zinc-500">{rows.length}</span></div>
      <Axis now={now} />
      <div className="hidden text-right text-xs text-zinc-500 md:block">next run</div>
    </div>
    {rows.map((x, i) => <RowView key={i} x={x} now={now} />)}
  </Card>
}

function Counter({ icon: I, label, n, tone, line }: { icon: any; label: string; n: string | number; tone: string; line: string }) {
  return <Card className="h-full">
    <CardHeader className="p-3 pb-1 md:p-5 md:pb-2"><CardTitle className="flex items-center gap-1.5 text-xs md:gap-2 md:text-sm"><I size={15} className="hidden md:block" />{label}</CardTitle></CardHeader>
    <CardContent className="p-3 pt-0 md:p-5 md:pt-1">
      <div className={`text-3xl font-semibold tabular-nums tracking-tight md:text-6xl ${tone}`}>{n}</div>
      <div className="mt-1 text-xs text-zinc-400 md:mt-3 md:text-sm">{line}</div>
    </CardContent>
  </Card>
}

export default function Timers() {
  const polled = usePolled('schedules.json', 300000)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])
  if (polled.data === undefined) return null
  const timers: any[] = polled.data?.timers || [], routines: any[] = polled.data?.routines || []
  if (!timers.length && !routines.length) return <Empty icon={<TimerIcon size={22} />} title="No schedules yet">When something runs on a schedule on a server or in the cloud, it shows up here.</Empty>

  const mk = (t: any, rule: Rule, extra: Partial<Row>): Row => { const m = projectOf(t.project); return { name: t.name, does: t.does || '', color: m.color, short: m.name, rule, next: nextIn(rule, now, TZ), ...extra } }
  const sort = (a: Row, b: Row) => (a.next ?? 1e9) - (b.next ?? 1e9)
  const server = timers.map(t => mk(t, parseRule(t.schedule || t.does, t.expect_every_hours), {})).sort(sort)
  const cloud = routines.map(t => mk(t, parseRule(t.schedule || ''), { note: t.note, last: t.last_result ? `Last run ${ago(t.last_run)}: ${t.last_result}` : '' })).sort(sort)
  const soon = [...server, ...cloud].filter(x => x.next !== null).sort(sort)[0]
  const perDay = (rs: Row[]) => rs.reduce((s, x) => s + (x.rule.kind === 'times' && firesToday(x.rule, now, TZ) ? x.rule.mins.length : 0), 0)

  return <>
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      <Counter icon={Server} label="On the server" n={server.length} tone="text-zinc-50" line={`scheduled runs today: ${perDay(server)}`} />
      <Counter icon={Cloud} label="In the cloud" n={cloud.length} tone="text-zinc-50" line={`${cloud.filter(x => x.rule.kind === 'event' || x.next === null).length} without a regular run`} />
      <Counter icon={Clock} label="Next" n={soon ? hm((wall(now, TZ).min + soon.next!) % DAY) : '—'} tone="text-indigo-300" line={soon ? `${soon.name} · ${inWords(soon.next!)}` : 'nothing scheduled'} />
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
      <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-indigo-400" />run</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-indigo-300 ring-2 ring-indigo-300/30" />next</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-sm bg-indigo-400/35" />many times an hour</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 rounded bg-amber-300" />now</span>
      <span>times in {TZ}</span>
    </div>
    {server.length > 0 && <Group icon={Server} title="Server" rows={server} now={now} />}
    {cloud.length > 0 && <Group icon={Cloud} title="Cloud" rows={cloud} now={now} />}
  </>
}
