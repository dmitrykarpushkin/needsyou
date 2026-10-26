// Backlog: everything queued for the system as one priority list, three sections by importance, one row per item.
// Each row is a plain-language phrase and, on the right, who acts: the owner, an agent, or nobody yet.
// Reads backlog.json. The order and the level come from the builder ("order", "level"): within a level the owner's items come first,
// and agent housekeeping is never above "Normal". Items without a phrase are not shown, only counted.
// The filter "Needs me" keeps only the owner's items; the address #/backlog?me (or #/backlog/me) opens the page with it on. Nothing is written here.
import { useEffect, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { usePolled } from './live'
import { Stale } from './ui/stale'
import { Empty } from './ui/empty'
import { rowsOf, levelOf } from './backlogRows.mjs'

type Row = { id: string; module: string; phrase?: string; act?: string; level?: number; value?: number; status?: string }

const LEVELS: [number, string][] = [[5, 'Most important'], [4, 'Important'], [3, 'Normal']]
const WHO: Record<string, string> = { me: 'needs you', agent: 'an agent will do it', wait: 'waiting' }
const meInHash = () => /^#\/?backlog(\?|\/)me\b/.test(location.hash)

function Item({ r }: { r: Row }) {
  const act = r.act && WHO[r.act] ? r.act : 'agent'
  const who = act === 'agent' && r.status === 'doing' ? 'an agent is on it' : WHO[act]
  return <li className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-white/[.06] py-3 md:grid-cols-[minmax(0,1fr)_10rem] md:items-baseline">
    <div className="break-words text-[15px] leading-snug text-zinc-100">{r.phrase}</div>
    <div className={`text-sm md:text-right ${act === 'me' ? 'text-amber-300' : 'text-zinc-500'}`}>{who}</div>
  </li>
}

export default function Backlog() {
  const polled = usePolled('backlog.json'), d = polled.data
  const [me, setMe] = useState(meInHash())
  useEffect(() => { const on = () => setMe(meInHash()); addEventListener('hashchange', on); return () => removeEventListener('hashchange', on) }, [])
  const pick = (v: boolean) => { setMe(v); history.replaceState(null, '', v ? '#/backlog?me' : '#/backlog') }
  const head = <div className="flex flex-col gap-1">
    <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Backlog</h1>
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
      <span>What is still to do, by importance. Each item says whether it needs something from you.</span>
      <Stale p={polled} what="Backlog" />
    </div>
  </div>
  if (d === undefined) return <>{head}<div className="text-sm text-zinc-400">Loading…</div></>
  if (polled.broken) return <>{head}<Empty icon={<ListTodo size={22} />} title="The backlog cannot be read">The file is damaged. The next rebuild should fix it.</Empty></>
  if (!d) return <>{head}<Empty icon={<ListTodo size={22} />} title="No backlog yet">The list comes from the backend and has not arrived yet.</Empty></>
  const { rows, unphrased } = rowsOf(d)
  const mine = rows.filter(r => r.act === 'me')
  const list = me ? mine : rows
  const seg = (on: boolean) => `min-h-9 px-3 text-sm ${on ? 'bg-white/[.08] text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'}`
  return <div className="flex max-w-[980px] flex-col gap-5">
    {head}
    <div role="group" aria-label="Filter" className="flex w-fit overflow-hidden rounded-lg border border-white/10">
      <button type="button" aria-pressed={!me} onClick={() => pick(false)} className={seg(!me)}>All <span className="text-zinc-500">{rows.length}</span></button>
      <button type="button" aria-pressed={me} onClick={() => pick(true)} className={`${seg(me)} border-l border-white/10`}>Needs me <span className={mine.length ? 'text-amber-300' : 'text-zinc-500'}>{mine.length}</span></button>
    </div>
    {!list.length && <Empty icon={<ListTodo size={22} />} title={me ? 'Nothing needs you right now' : 'The backlog is empty'}>{me ? 'Agents handle every backlog item themselves, or the items wait for something else.' : 'No new ideas or postponed work yet.'}</Empty>}
    {LEVELS.map(([lv, title]) => {
      const part = list.filter(r => levelOf(r) === lv)
      if (!part.length) return null
      return <section key={lv}>
        <h2 className="border-b border-white/[.06] pb-2 text-sm text-zinc-400">{title}</h2>
        <ul>{part.map(r => <Item key={r.module + '/' + r.id} r={r} />)}</ul>
      </section>
    })}
    {unphrased > 0 && <div className="text-sm text-zinc-500">{unphrased} more {unphrased === 1 ? 'item has' : 'items have'} no plain-language phrase yet, so {unphrased === 1 ? 'it is' : 'they are'} not shown.</div>}
  </div>
}
