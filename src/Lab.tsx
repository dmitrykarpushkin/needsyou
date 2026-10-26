// The Lab in plain words: how many ideas were found, what is being worked on, what was put into the system. No chain stages, no methods.
// Reads lab.json. Per idea: phrase, why, priority (1 first), done_at; without a phrase the machine title is shown after the phrased ones.
import { useState } from 'react'
import { Check, ChevronDown, FlaskConical, Hourglass, Loader } from 'lucide-react'
import { usePolled } from './live'
import { Stale } from './ui/stale'
import { Card } from './ui/card'
import { Empty } from './ui/empty'

const ago = (iso?: string) => { const d = iso ? Math.round((Date.now() - Date.parse(iso)) / 864e5) : NaN; return isNaN(d) ? '' : d < 1 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago` }
const name = (i: any) => i.phrase || i.title || 'Untitled idea'

function List({ title, Icon, tone, items: list, link }: { title: string; Icon: any; tone: string; items: any[]; link?: [string, string] }) {
  const [all, setAll] = useState(false)
  if (!list.length) return null
  // phrased ideas first; the rest wait for the Lab to name them
  const items = [...list.filter(i => i.phrase), ...list.filter(i => !i.phrase)]
  const shown = all ? items : items.slice(0, 6)
  return <div>
    <h2 className={`mb-2 flex items-center gap-2 text-sm font-medium ${tone}`}><Icon size={15} />{title} <span className="text-zinc-500">· {items.length}</span>{link && <a href={link[0]} className="ml-auto text-xs font-normal text-indigo-300">{link[1]}</a>}</h2>
    <Card className="divide-y divide-white/[.05]">
      {shown.map(i => <div key={i.id} className="px-4 py-3">
        <div className="break-words text-sm font-medium leading-snug text-zinc-100">{name(i)}</div>
        {i.why && <div className="mt-1 break-words text-sm leading-relaxed text-zinc-400">{i.why}</div>}
        {(i.done_at || i.last?.ts) && <div className="mt-1 text-xs text-zinc-500">{ago(i.done_at || i.last?.ts)}</div>}
      </div>)}
      {items.length > 6 && <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm text-indigo-300 hover:bg-white/[.03]">
        <ChevronDown size={14} className={`transition-transform ${all ? 'rotate-180' : ''}`} />{all ? 'Collapse' : `Show all ${items.length}`}</button>}
    </Card>
  </div>
}

export default function Lab() {
  const polled = usePolled('lab.json'), d = polled.data
  if (d === undefined) return <Card className="p-5 text-sm text-zinc-400">Loading…</Card>
  if (!d) return <Empty icon={<FlaskConical size={22} />} title="The Lab has not started yet">No data yet. When the first ideas arrive, they show up here.</Empty>
  const T = d.totals, ideas: any[] = d.ideas || []
  const byPrio = (a: any, b: any) => (a.priority || 3) - (b.priority || 3)
  const active = ideas.filter(i => i.state === 'active').sort(byPrio)
  const parked = ideas.filter(i => i.state === 'parked').sort(byPrio)
  const done = ideas.filter(i => i.state === 'done').sort((a, b) => String(b.done_at || b.last?.ts || '').localeCompare(String(a.done_at || a.last?.ts || '')))
  const cnt = (n: number, label: string, tone: string) => <Card className="h-full p-4 md:p-5"><div className="text-sm text-zinc-400">{label}</div><div className={`mt-1 text-4xl font-semibold tabular-nums md:text-5xl ${n ? tone : 'text-zinc-500'}`}>{n}</div></Card>
  return <>
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400"><span>The Lab finds and tries ideas for the system on its own. You only decide what to take.</span><Stale p={polled} what="Lab" /></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cnt(T.ideas, 'Ideas found', 'text-zinc-50')}{cnt(T.active, 'In work now', 'text-indigo-300')}
      <a href="#/" className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">{cnt(T.parked, 'Wait for you →', 'text-amber-300')}</a>{cnt(T.done, 'Shipped', 'text-emerald-300')}
    </div>
    <List title="Shipped" Icon={Check} tone="text-emerald-300" items={done} />
    <List title="In work now" Icon={Loader} tone="text-indigo-300" items={active} />
    <List title="Wait for your word" Icon={Hourglass} tone="text-amber-300" items={parked} link={['#/', 'answer →']} />
    {T.dropped > 0 && <div className="text-sm text-zinc-500">{T.dropped === 1 ? '1 more idea was' : `${T.dropped} more ideas were`} dropped at triage as not worth the work.</div>}
  </>
}
