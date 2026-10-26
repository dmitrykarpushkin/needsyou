// Agents: one list of everyone who works for the owner, in three groups (Lab roles, agent sessions, background services); a click shows,
// in plain words, what the agent does, when it starts, what it does now and its last run. Wide screens: list and detail side by side;
// narrower than 1024 px the detail opens as its own page with a back link (#/agents/<key>).
// Sources: agent-info.json (hand-written descriptions), agents.json (session heartbeats), lab.json (ideas and their steps),
// services.json (background services and their runs). Run results come only from these fields; nothing is made up.
import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { usePolled, useLive, useNarrow } from './live'
import { Empty } from './ui/empty'
import { Stale } from './ui/stale'
import { agoMin, minutesSince as mins, plural, when } from './format'
import type { AgentInfoFile, AgentsFile, LabFile, LabIdea, LabStep, ServicesFile, WorkFile } from './types'

type GroupId = 'lab' | 'threads' | 'services'
type Tone = 'run' | 'ok' | 'warn' | 'bad' | 'idle'
type Item = {
  key: string; group: GroupId; name: string; what?: string; when?: string
  word: string; tone: Tone; rank: number // rank sorts inside a group: lower first (errors and waiting on top)
  now?: string; last?: string; lastLabel?: string; line: string; recent?: string
}
type Info = { group?: GroupId; name?: string; what?: string; when?: string }

const GROUPS: { id: GroupId; name: string; empty: string }[] = [
  { id: 'lab', name: 'Lab', empty: 'No Lab data yet.' },
  { id: 'threads', name: 'Agent sessions', empty: 'No session is reporting right now.' },
  { id: 'services', name: 'Background services', empty: 'No service data yet.' },
]
const FRESH_MIN = 30 // a Lab step newer than this counts as "working"
const THREAD_SILENT_MIN = 60 // a working session quiet for longer than this is shown as silent
const OLD_RUN_MIN = 36 * 60 // a service whose last run is older than this is shown as silent
const ideas = (n: number) => plural(n, 'idea', 'ideas')
const dur = (s?: number) => s === undefined || s === null ? '' : s < 60 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`
const sentence = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}${/[.!?]$/.test(s) ? '' : '.'}`

// What a Lab verdict means in words
const VERDICT: Record<string, Record<string, string>> = {
  triage: { go: 'took the idea into work', drop: 'dropped the idea', park: 'parked the idea for your word' },
  method: { ok: 'chose a method for the idea' },
  builder: { ok: 'made the change', fail: 'could not make the change' },
  tester: { ok: 'tests passed', fail: 'found a bug' },
  applier: { ok: 'applied the change', fail: 'could not apply the change' },
  validator: { ok: 'confirmed the result', fail: 'did not confirm the result' },
  retro: { worked: 'the method worked', partly: 'the method partly worked', failed: 'the method failed' },
}

function labItems(lab: LabFile | null | undefined, info: Record<string, Info>): Item[] {
  const all: LabIdea[] = lab?.ideas || []
  const stages = lab?.stages || []
  const out: Item[] = []
  // scouts: a news scout and per-area scouts submit ideas as "news-scout" and "scout-<area>"
  const scouts: [string, (by: string) => boolean][] = [['news-scout', b => b === 'news-scout'], ['scout', b => b !== 'news-scout' && b.startsWith('scout')]]
  for (const [id, mine] of scouts) {
    const subs = all.filter(i => mine(String(i.submitted_by || ''))).map(i => i.submitted_at).filter(Boolean).sort()
    const lastTs: string | undefined = subs[subs.length - 1]
    const batch = lastTs ? subs.filter(t => Date.parse(lastTs) - Date.parse(t) <= 2 * 36e5).length : 0
    const fresh = (mins(lastTs) ?? 1e9) <= FRESH_MIN
    const inf = info['lab:' + id] || {}
    out.push({
      key: 'lab:' + id, group: 'lab', name: inf.name || 'Scout', what: inf.what, when: inf.when,
      word: fresh ? 'working' : 'idle', tone: fresh ? 'run' : 'idle', rank: 0,
      now: fresh ? 'Just brought new ideas.' : 'No sign of work in the last half hour.',
      last: lastTs ? `${when(lastTs)}: brought ${ideas(batch)}.` : 'Has not brought any ideas yet.',
      line: lastTs ? `last time: ${agoMin(mins(lastTs))}` : 'never ran',
    })
  }
  for (const st of stages) {
    const role = st.role
    let lastStep: LabStep | null = null, lastIdea: LabIdea | null = null
    for (const i of all) for (const s of i.steps || []) if (s.role === role && (!lastStep || s.ts > lastStep.ts)) { lastStep = s; lastIdea = i }
    const waiting = Number(st.waiting) || 0
    const fresh = !!lastStep && (mins(lastStep.ts) ?? 1e9) <= FRESH_MIN
    const inf = info['lab:' + role] || {}
    const title = lastIdea?.phrase || lastIdea?.title
    const did = lastStep ? (VERDICT[role]?.[lastStep.verdict] || 'finished a step') : ''
    out.push({
      key: 'lab:' + role, group: 'lab', name: inf.name || 'Lab step', what: inf.what, when: inf.when,
      word: fresh ? 'working' : waiting ? `${waiting} queued` : 'no work', tone: fresh ? 'run' : 'idle', rank: 0,
      now: `${fresh ? 'Just finished a step. ' : 'No sign of work in the last half hour. '}${waiting ? `${ideas(waiting)} wait for this step.` : 'No ideas are at this step now.'}`,
      last: lastStep ? `${when(lastStep.ts)}: ${did}${title ? ` "${title}"` : ''}.` : 'Has not worked yet.',
      line: lastStep ? `last time: ${agoMin(mins(lastStep.ts))}, ${did}` : 'has not worked yet',
    })
  }
  return out
}

function threadItems(th: AgentsFile | null | undefined, info: Record<string, Info>): Item[] {
  return (th?.agents || []).map(a => {
    const inf = info['thread:' + a.id] || {}
    const m = mins(a.updated)
    const task: string = a.task || '', wait: string = a.waiting_on || ''
    const silent = a.status === 'working' && (m ?? 1e9) > THREAD_SILENT_MIN
    const [word, tone, rank]: [string, Tone, number] = a.status === 'done' ? ['done', 'ok', 3] : a.status === 'waiting' ? ['waiting', 'warn', 0] : silent ? ['silent', 'idle', 2] : ['working', 'run', 1]
    const now = [task && sentence(task), wait && !task.toLowerCase().includes(wait.toLowerCase().slice(0, 25)) && `Waits for: ${wait.replace(/\.$/, '')}.`,
      silent && 'Has not reported for a long time; whether it still works cannot be seen from here.'].filter(Boolean).join(' ')
    return {
      key: 'thread:' + a.id, group: 'threads' as GroupId, name: inf.name || a.title || a.id, what: inf.what, when: inf.when,
      word, tone, rank, now: now || 'The heartbeat has no details.',
      lastLabel: 'Last heartbeat',
      last: a.updated ? `${when(a.updated)}${typeof a.progress === 'number' ? `; by its own estimate ${a.progress}% done` : ''}.` : undefined,
      line: tone === 'run' && task ? `now: ${task[0].toLowerCase()}${task.slice(1)}` : wait ? `waits for: ${wait}` : a.updated ? `last heartbeat: ${agoMin(m)}` : '',
    }
  })
}

function serviceItems(svc: ServicesFile | null | undefined, info: Record<string, Info>): Item[] {
  return (svc?.services || []).filter(n => !n.planned && n.kind !== 'storage').map(n => {
    const inf = info['service:' + n.id] || {}
    const r = n.runs?.[0]
    const old = !!r && (mins(r.ts) ?? 0) > OLD_RUN_MIN // jobs run at least daily: a last run this old means the journal stopped seeing it
    const [word, tone, rank]: [string, Tone, number] = n.running_since ? ['running', 'run', 1] : r && r.ok === false ? ['error', 'bad', 0] : old ? ['silent', 'idle', 2] : r ? ['ok', 'ok', 2] : ['no runs', 'idle', 3]
    const runs = n.runs || []
    const bad = runs.filter(x => x.ok === false).length
    return {
      key: 'service:' + n.id, group: 'services' as GroupId, name: n.name || n.id, what: inf.what || n.about || undefined, when: inf.when || n.schedule || undefined,
      word, tone, rank,
      now: n.running_since ? `A run is in progress, started ${when(n.running_since)}.` : r && r.ok === false ? 'The last run ended with an error; waiting for the next one.' : old ? 'The last run was long ago; whether it still starts cannot be seen from here.' : n.always_on
        ? 'Should run all the time; the journal has no runs for it, so whether it is alive cannot be seen from here.' : 'Waiting for the next run.',
      last: r ? `${when(r.ts)}: ${r.ok === false ? 'ended with an error' : 'no errors'}${r.dur ? `, took ${dur(r.dur)}` : ''}.` : 'The journal has no runs for it.',
      recent: runs.length > 1 ? `Of the last ${runs.length} runs ${bad ? `${bad} failed` : 'none failed'}.` : undefined,
      line: n.running_since ? `now: running, ${agoMin(mins(n.running_since))}` : r ? `last time: ${agoMin(mins(r.ts))}, ${r.ok === false ? 'error' : 'no errors'}` : 'no runs recorded',
    }
  })
}

const DOT: Record<Tone, string> = { run: 'bg-indigo-400', ok: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-red-400', idle: 'bg-zinc-500' }
const TXT: Record<Tone, string> = { run: 'text-indigo-300', ok: 'text-emerald-300', warn: 'text-amber-300', bad: 'text-red-300', idle: 'text-zinc-400' }
const Status = ({ it }: { it: Item }) => <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm ${TXT[it.tone]}`}>
  <span className={`size-2 shrink-0 rounded-full ${DOT[it.tone]} ${it.tone === 'run' ? 'animate-pulse' : ''}`} />{it.word}</span>

const keyFromHash = () => { const p = location.hash.replace(/^#\/?/, '').split('/'); return p[0] === 'agents' && p[1] ? decodeURIComponent(p[1]) : null }

function Detail({ it, back }: { it: Item; back: boolean }) {
  const group = GROUPS.find(g => g.id === it.group)!.name
  const rows: [string, string | undefined][] = [
    ['What it does', it.what || 'No description has been written for this agent yet.'], ['When it starts', it.when],
    ['Now', it.now], [it.lastLabel || 'Last run', it.last], ['Recent runs', it.recent],
  ]
  return <article aria-label={it.name} className={back ? '' : 'sticky top-6 rounded-xl border border-white/[.08] bg-white/[.025] px-6 py-5'}>
    {back && <a href="#/agents" className="mb-3 inline-flex min-h-10 items-center text-[15px] text-indigo-300">← All agents</a>}
    <h2 className="m-0 text-xl font-semibold text-zinc-50">{it.name}</h2>
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><Status it={it} /><span className="text-sm text-zinc-500">{group}</span></div>
    <dl className="m-0 mt-2">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="mt-4">
      <dt className="text-sm text-zinc-400">{k}</dt>
      <dd className="m-0 mt-0.5 max-w-[68ch] break-words text-[15px] leading-relaxed text-zinc-100">{v}</dd>
    </div>)}</dl>
  </article>
}

export default function Agents() {
  const th = usePolled<AgentsFile>('agents.json', 20000), lab = usePolled<LabFile>('lab.json', 20000), inf = usePolled<AgentInfoFile>('agent-info.json', 300000), { services, servicesPolled } = useLive()
  const narrow = useNarrow(1024)
  const workN = (usePolled<WorkFile>('work.json').data?.work || []).filter(w => w.state !== 'closed').length
  const [sel, setSel] = useState<string | null>(keyFromHash())
  useEffect(() => { const f = () => setSel(keyFromHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  if (th.data === undefined && lab.data === undefined && servicesPolled.data === undefined) return null
  const info: Record<string, Info> = inf.data?.agents || {}
  const order = (xs: Item[]) => xs.map((x, i) => [x, i] as const).sort((a, b) => a[0].rank - b[0].rank || a[1] - b[1]).map(x => x[0])
  const items: Record<GroupId, Item[]> = { lab: labItems(lab.data, info), threads: order(threadItems(th.data, info)), services: order(serviceItems(services, info)) }
  const flat = GROUPS.flatMap(g => items[g.id])
  const picked = flat.find(x => x.key === sel) || null
  const shown = picked || (narrow ? null : flat[0] || null)
  const running = flat.filter(x => x.tone === 'run').length, waiting = flat.filter(x => x.tone === 'warn').length, broken = flat.filter(x => x.tone === 'bad').length
  // wide: switch the detail without a hash change (the shell scrolls to the top on every hash change), keep the address shareable
  const open = (k: string) => { if (narrow) location.hash = `#/agents/${encodeURIComponent(k)}`; else { history.replaceState(null, '', `#/agents/${encodeURIComponent(k)}`); setSel(k) } }

  if (narrow && picked) return <Detail it={picked} back />
  return <>
    <div className="-mt-2 text-[15px] leading-relaxed text-zinc-400">
      <p className="m-0">Everyone who works for you: in the Lab, in agent sessions and as background services. Click an agent to see what it does.</p>
      <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-zinc-300">
        <span>{[workN && `Tasks in progress: ${workN}.`, running && `Working now: ${running}.`, waiting && `Waiting for your word: ${waiting}.`, broken && `With an error: ${broken}.`].filter(Boolean).join(' ') || 'Nobody is working right now.'}</span>
        <Stale p={lab} what="Lab" /><Stale p={th} what="Sessions" />
      </p>
    </div>
    {!flat.length && <Empty icon={<Bot size={22} />} title="No agents yet">When Lab, session or service data arrives, it shows up here.</Empty>}
    {flat.length > 0 && <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(340px,500px)_minmax(0,1fr)]">
      <div>{GROUPS.map((g, gi) => <section key={g.id} aria-label={g.name}>
        <h2 className={`m-0 flex items-baseline justify-between border-b border-white/[.08] pb-1.5 text-sm font-normal text-zinc-400 ${gi ? 'pt-6' : ''}`}>
          <span>{g.name}</span><span className="tabular-nums text-zinc-500">{items[g.id].length || ''}</span>
        </h2>
        {!items[g.id].length && <p className="m-0 border-b border-white/[.06] px-2.5 py-3 text-sm text-zinc-500">{g.empty}</p>}
        <ul className="m-0 list-none p-0">{items[g.id].map(it => {
          const on = !narrow && shown?.key === it.key
          return <li key={it.key}><button type="button" onClick={() => open(it.key)} aria-current={on ? 'true' : undefined}
            className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-white/[.06] px-2.5 py-2.5 text-left transition-colors hover:bg-white/[.04] ${on ? 'bg-white/[.06] shadow-[inset_3px_0_0_#818cf8]' : ''}`}>
            <span className="min-w-0 break-words text-[15px] font-medium text-zinc-50">{it.name}</span>
            <Status it={it} />
            <span className="col-span-2 break-words text-sm leading-snug text-zinc-400">{it.what || g.name}</span>
            {it.line && <span className="col-span-2 truncate text-[13px] text-zinc-500">{it.line}</span>}
          </button></li>
        })}</ul>
      </section>)}</div>
      {!narrow && shown && <Detail it={shown} back={false} />}
    </div>}
  </>
}
