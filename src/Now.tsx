// The home screen: on the left the one ranked list of what the owner must do now (actions.ts), on the right what is moving (work items and
// sessions). No tiles, no counters: sentences. Everything comes from data files polled by the page.
import { useState } from 'react'
import { CircleCheck, Loader } from 'lucide-react'
import { threadName, useActions } from './actions'
import { failedServices, useLive, usePolled } from './live'
import { rowsOf } from './backlogRows.mjs'
import { Stale } from './ui/stale'
import { ago, clip } from './format'
import { getConsole, projectOf } from './store'
import type { AgentInfoFile, AgentsFile, PrsFile, Role, Service, WorkFile, WorkItem } from './types'

export const STATE_WORD: Record<string, [string, string]> = { going: ['running', 'text-sky-300'], done: ['done', 'text-emerald-300'], waiting: ['waiting', 'text-amber-300'], error: ['error', 'text-red-300'] }
const PR_STATE: Record<string, string> = { draft: 'draft', review: 'in review', merged: 'merged' }

// Roles of one work item, one line each: who, what it does, its state.
export function RoleLines({ roles }: { roles: Role[] }) {
  return <ul className="divide-y divide-white/[.06]">{roles.map(r => {
    const [w, tone] = STATE_WORD[r.state] || [r.state, 'text-zinc-400']
    return <li key={r.name} className="flex items-baseline gap-3 py-2 text-sm">
      <span className="min-w-0 flex-1 text-zinc-200">{r.name}{r.does && <span className="text-zinc-500"> — {r.does}</span>}</span>
      <span className={`shrink-0 ${tone}`}>{w}{r.note ? `, ${r.note}` : ''}</span>
    </li>
  })}</ul>
}

export function WorkBlock({ w }: { w: WorkItem & { projectName?: string } }) {
  return <div>
    <div className="flex flex-wrap items-baseline gap-x-3"><h3 className="text-base font-semibold text-zinc-50">{w.title}</h3><span className="text-xs text-zinc-500">{w.projectName}</span></div>
    {w.status && <p className="mt-1 border-l-2 border-sky-400/60 pl-3 text-[15px] leading-snug text-zinc-100">{w.status}</p>}
    {w.summary && <p className="mt-2 text-sm leading-relaxed text-zinc-300">{w.summary}</p>}
    {w.changed && <p className="mt-1 text-sm text-zinc-400"><b className="font-medium text-zinc-300">Since last time:</b> {w.changed}</p>}
    {w.roles?.length > 0 && <div className="mt-3"><RoleLines roles={w.roles} /></div>}
    {(w.pr || w.plan) && <p className="mt-3 text-sm text-zinc-300"><b className="font-medium text-zinc-100">Result:</b> {w.pr ? `PR #${w.pr.n} (${PR_STATE[w.pr.state] || w.pr.state})` : 'no PR yet'}{w.plan ? `. Acceptance: ${w.plan.done} of ${w.plan.total} plan items confirmed; the independent check runs last.` : '.'}</p>}
  </div>
}

const WAIT_WORD: Record<string, string> = { ready: 'ready to merge', red: 'checks are red', running: 'checks are running', review: 'waits for review', changes: 'waits for changes' }

export default function Now() {
  const { actions, loading, sources, topN } = useActions()
  const { services, checks, servicesPolled } = useLive()
  const { owner, projects } = getConsole()
  const workP = usePolled<WorkFile>('work.json'), agentsP = usePolled<AgentsFile>('agents.json', 20000), infoP = usePolled<AgentInfoFile>('agent-info.json', 300000), blP = usePolled('backlog.json', 120000)
  const inBacklog = blP.data ? rowsOf(blP.data).rows.filter((r: any) => r.act === 'me').length : 0
  const [pick, setPick] = useState('all')
  const name = (id: string) => projectOf(id).name
  const list = pick === 'all' ? actions : actions.filter(a => a.project === pick)
  const failed = failedServices(services), sick = failed.length + (checks && checks.ok === false ? 1 : 0)
  const work = (workP.data?.work || []).filter(w => w.state !== 'closed').map(w => ({ ...w, projectName: name(w.project) }))
  const covered = new Set(work.map(w => w.project))
  // sessions that report in but have no work item: one plain row each
  const threads = (agentsP.data?.agents || []).filter(t => t.status === 'working' && Date.now() - Date.parse(t.updated) < 6 * 36e5 && !covered.has(t.project))
  // own open PRs in progress in projects without a work item: one line each, so a project with a PR in flight never reads as idle
  const prRows = Object.entries((sources.prs.data as PrsFile | null | undefined)?.projects || {}).flatMap(([pid, p]) => covered.has(pid) ? [] : (p?.open || [])
    .filter(x => (x.author === owner.login || !projectOf(pid).shared) && ((x.waiting || []).some(w => w.k === 'running') || x.draft) && Date.now() - Date.parse(x.updated) < 3 * 864e5)
    .map(x => ({ id: pid + (x.repo || '') + x.n, project: pid, text: `PR #${x.n}${x.repo ? ' in ' + x.repo.split('/').pop() : ''}${x.title ? ` "${clip(String(x.title), 70)}"` : ''}: ` + ((x.waiting || []).map(w => WAIT_WORD[w.k] || 'in progress').join(', ') || 'in progress') })))
  const nothing = !loading && list.length === 0

  return <div className="grid grid-cols-1 gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Needs you</h1>
        <select aria-label="Project" value={pick} onChange={e => setPick(e.target.value)} className="ml-auto min-h-10 rounded-lg border border-white/[.1] bg-zinc-900 px-3 text-sm text-zinc-200">
          <option value="all">All projects, by importance</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {sick > 0 && <p className="mt-3 text-sm text-red-300">Something is broken: {[...(checks && checks.ok === false ? ['repository checks are red'] : []), ...failed.map((n: Service) => (n.name || n.id) + ' failed')].join(', ')}.</p>}
      {loading && <div className="mt-4 space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-white/[.05]" />)}</div>}
      {!loading && list.length > 0 && <ol className="mt-3 divide-y divide-white/[.06] border-y border-white/[.06]">{list.map((a, i) => <li key={a.id} className="flex gap-4 py-4">
        <span className="w-5 shrink-0 pt-0.5 text-right text-sm tabular-nums text-zinc-500">{i + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="break-words text-[16px] leading-snug text-zinc-50">{a.text}</div>
          {a.note && <div className="mt-0.5 break-words text-sm text-zinc-400">{a.note}</div>}
          <div className="mt-1 text-sm text-zinc-500">{name(a.project)}{a.stopped && <> · <b className="font-medium text-red-400">Work is stopped</b> until you answer</>}{a.since && <> · {ago(a.since)}</>}</div>
        </div>
      </li>)}</ol>}
      {!loading && inBacklog - topN > 0 && <a href="#/backlog?me" className="mt-3 inline-flex min-h-10 items-center text-sm text-indigo-300">{inBacklog - topN} more backlog {inBacklog - topN === 1 ? 'item needs' : 'items need'} your word →</a>}
      {nothing && <div className="mt-4 flex items-start gap-3 text-[15px] text-zinc-300"><CircleCheck size={20} className="mt-0.5 shrink-0 text-emerald-300" /><div>Nothing else waits for you.{(work.length > 0 || threads.length > 0) && <span className="text-zinc-400"> Work in progress: {[...work.map(w => w.title), ...threads.map(t => threadName(t, infoP.data))].join(', ')}.</span>}</div></div>}
      <div className="mt-3 flex gap-3 text-xs text-zinc-500"><Stale p={sources.prs} what="PRs" /><Stale p={servicesPolled} what="Services" /></div>
    </section>

    <aside>
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">In progress</h2>
      {work.length === 0 && threads.length === 0 && prRows.length === 0 && <p className="mt-3 text-[15px] text-zinc-400">{workP.data === undefined ? 'Loading…' : 'No task is running right now.'}</p>}
      <div className="mt-3 space-y-7">
        {work.map(w => <a key={w.id} href={`#/p/${w.project}`} className="block rounded-lg hover:bg-white/[.03]"><WorkBlock w={w} /></a>)}
        {prRows.length > 0 && <ul className="space-y-2">{prRows.map(r => <li key={r.id} className="text-sm text-zinc-300"><a href={`#/p/${r.project}`} className="hover:underline"><b className="font-medium text-zinc-100">{name(r.project)}.</b> {r.text}</a></li>)}</ul>}
        {threads.map(t => <div key={t.id}>
          <div className="flex items-baseline gap-3"><h3 className="text-base font-semibold text-zinc-50">{threadName(t, infoP.data)}</h3><span className="text-xs text-zinc-500">{name(t.project)}</span></div>
          <p className="mt-1 flex items-start gap-2 text-sm text-zinc-300"><Loader size={14} className="mt-1 shrink-0 animate-spin text-sky-300 [animation-duration:3s]" /><span><span className="text-zinc-500">Session reports:</span> {t.task}</span></p>
        </div>)}
      </div>
    </aside>
  </div>
}
