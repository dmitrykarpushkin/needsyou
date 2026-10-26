// Project page: the work in progress as tasks (agents by role, result), the owner's open pull requests, what was merged this week, and on the
// right what waits for the owner in this project and its links. Reads work.json, agents.json and prs.json; nothing is stored here.
import { useState } from 'react'
import { ArrowUpRight, FolderGit2, GitPullRequest, GitPullRequestDraft, Link as LinkIcon, Loader } from 'lucide-react'
import { Badge } from './ui/badge'
import { usePolled } from './live'
import { threadName, useActions } from './actions'
import { WorkBlock } from './Now'
import { getConsole, type Project as P } from './store'
import type { AgentInfoFile, AgentsFile, MergedPr, OpenPr, PrWait, PrsFile, WorkFile } from './types'

const ageText = (d: number) => d < 1 ? 'today' : d === 1 ? '1 day' : `${d} days`
const WAIT: Record<string, string> = { draft: 'author not done yet', changes: 'changes requested', red: 'checks are red', running: 'checks are running', review_wait: 'waits for review', ready: 'ready to merge' }
const waitText = (w: PrWait) => w.k === 'review' ? 'review requested: ' + (w.who || []).join(', ') : WAIT[w.k] || w.k
const waitTone = (k: string): 'ok' | 'warn' | 'bad' | 'neutral' => k === 'ready' ? 'ok' : k === 'red' || k === 'changes' ? 'bad' : k === 'running' ? 'neutral' : 'warn'
const ago = (iso?: string) => { const h = iso ? Math.round((Date.now() - Date.parse(iso)) / 36e5) : NaN; return isNaN(h) ? '' : h < 1 ? 'just now' : h < 48 ? `${h}\u00a0h ago` : `${Math.round(h / 24)}\u00a0d ago` }

function PR({ x, showRepo }: { x: OpenPr; showRepo?: boolean }) {
  const pct = x.total ? Math.round(100 * x.done / x.total) : null
  return <li className="py-3 first:pt-0 last:pb-0">
    <a href={x.url} target="_blank" rel="noopener" className="group flex items-start gap-2.5">
      {x.draft ? <GitPullRequestDraft size={17} className="mt-0.5 shrink-0 text-zinc-500" /> : <GitPullRequest size={17} className="mt-0.5 shrink-0 text-emerald-300" />}
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[15px] font-medium leading-snug text-zinc-50 group-hover:underline">{x.title} <span className="font-normal text-zinc-500">#{x.n}{showRepo && x.repo ? ` · ${x.repo.split('/').pop()}` : ''}</span></span>
        {x.why && <span className="mt-1 block break-words text-sm leading-relaxed text-zinc-400">{x.why}</span>}
      </span>
    </a>
    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[27px]">
      {(x.waiting || []).map((w, i) => <Badge key={i} tone={waitTone(w.k)}>{waitText(w)}</Badge>)}
      {pct !== null && <span className="inline-flex items-center gap-2 text-xs text-zinc-400"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-emerald-400/70" style={{ width: pct + '%' }} /></span>{x.done} of {x.total} items</span>}
      <span className="text-xs text-zinc-500">open {ageText(x.age_days)} · updated {ago(x.updated)}{x.base && x.base !== 'main' ? ` · into ${x.base}` : ''}</span>
    </div>
  </li>
}

export default function Project({ p }: { p: P }) {
  const polled = usePolled<PrsFile>('prs.json'), d = polled.data, pr = d?.projects?.[p.id]
  const workP = usePolled<WorkFile>('work.json'), agentsP = usePolled<AgentsFile>('agents.json', 20000), infoP = usePolled<AgentInfoFile>('agent-info.json', 300000)
  const { actions } = useActions()
  const [others, setOthers] = useState(false)
  const OWNER = getConsole().owner.login
  const mine = actions.filter(a => a.project === p.id)
  const fresh = d && d.built && Date.now() - Date.parse(d.built) < 30 * 60000
  const work = (workP.data?.work || []).filter(w => w.project === p.id && w.state !== 'closed').map(w => ({ ...w, projectName: '' }))
  const threads = (agentsP.data?.agents || []).filter(t => t.project === p.id && t.status === 'working' && Date.now() - Date.parse(t.updated) < 6 * 36e5)
  // in a shared (team) repo only the owner's own merged PRs are listed; a row without an author field stays
  const ownMerged = (pr?.merged || []).filter(x => !p.shared || !x.author || x.author === OWNER)
  const seen = [...new Set<string>([...(pr?.open || []), ...(pr?.merged || [])].map((x: OpenPr | MergedPr) => x.repo || pr?.repo).filter(Boolean))]
  const repos: string[] = seen.length ? seen : pr?.repo ? [pr.repo] : p.repos || []
  const links = [...(p.links || []).map(l => ({ href: l.url, name: l.name, about: l.about || l.url, Icon: LinkIcon })),
    ...repos.map(r => ({ href: 'https://github.com/' + r, name: 'Repository', about: r, Icon: FolderGit2 }))]

  const open: OpenPr[] = pr?.open || [], ours = open.filter(x => x.author === OWNER), rest = open.filter(x => x.author !== OWNER)
  const running = open.filter(x => x.author === OWNER || !p.shared).filter(x => ((x.waiting || []).some(w => ['running', 'draft'].includes(w.k)) || x.draft) && Date.now() - Date.parse(x.updated) < 3 * 864e5)
  let prs
  if (polled.data === undefined) prs = <p className="text-sm text-zinc-400">Loading…</p>
  else if (!pr) prs = <p className="text-sm text-zinc-400">No repository is connected to this project, so no PRs are read.</p>
  else if (pr.error) prs = <p className="text-sm text-zinc-400">GitHub did not return the PR list: {pr.error}</p>
  else prs = <>
    {ours.length ? <ul className="divide-y divide-white/[.06]">{ours.map(x => <PR key={(x.repo || '') + x.n} x={x} showRepo={repos.length > 1} />)}</ul> : <p className="text-sm text-zinc-400">You have no open PRs here.</p>}
    {rest.length > 0 && <button type="button" onClick={() => setOthers(!others)} className="mt-3 inline-flex min-h-10 items-center text-sm text-indigo-300">{others ? 'Hide PRs by other authors' : `${rest.length} more ${rest.length === 1 ? 'PR' : 'PRs'} by other authors`}</button>}
    {others && <ul className="divide-y divide-white/[.06]">{rest.map(x => <PR key={(x.repo || '') + x.n} x={x} showRepo={repos.length > 1} />)}</ul>}
    {ownMerged.length > 0 && <div className="mt-6"><h3 className="mb-2 text-sm font-medium text-zinc-400">Merged this week</h3>
      <ul className="divide-y divide-white/[.06]">{ownMerged.map(x => <li key={(x.repo || '') + x.n} className="py-2"><a href={x.url} target="_blank" rel="noopener" className="flex items-start justify-between gap-3 text-sm text-zinc-300 hover:underline"><span className="min-w-0 break-words">{x.title} <span className="whitespace-nowrap text-zinc-500">#{x.n}{repos.length > 1 && x.repo ? ` · ${x.repo.split('/').pop()}` : ''}</span></span><span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">{ago(x.merged_at)}</span></a></li>)}</ul></div>}
    {!fresh && d?.built && <p className="mt-3 text-xs text-amber-300">The list was built {ago(d.built)}; it may be out of date.</p>}
  </>

  return <>
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-lg text-white" style={{ background: p.color }}>{p.icon || '•'}</span>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{p.name}</h1>
    </div>
    <div className="grid max-w-[1180px] grid-cols-1 items-start gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-50">In progress</h2>
          {work.length === 0 && threads.length === 0 && running.length === 0 && <p className="text-[15px] text-zinc-400">{workP.data === undefined ? 'Loading…' : 'No task is running in this project right now.'}</p>}
          {work.length === 0 && threads.length === 0 && running.length > 0 && <p className="flex items-start gap-2 text-[15px] text-zinc-200"><Loader size={15} className="mt-1 shrink-0 text-sky-300" /><span>Work is going on {running.map(x => `PR #${x.n}${repos.length > 1 && x.repo ? ' in ' + x.repo.split('/').pop() : ''} "${x.title}"`).join(' and ')}; see "Your PRs" below.</span></p>}
          <div className="space-y-8">
            {work.map(w => <WorkBlock key={w.id} w={w} />)}
            {threads.map(t => <p key={t.id} className="flex items-start gap-2 text-[15px] text-zinc-200"><Loader size={15} className="mt-1 shrink-0 animate-spin text-sky-300 [animation-duration:3s]" /><span><b className="font-medium text-zinc-50">{threadName(t, infoP.data)}.</b> <span className="text-zinc-500">Session reports:</span> {t.task}</span></p>)}
          </div>
        </section>
        <section><h2 className="mb-3 text-lg font-semibold text-zinc-50">Your PRs</h2>{prs}</section>
      </div>
      <div className="space-y-8 max-xl:order-first">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-50">Waits for you here</h2>
          {mine.length ? <ol className="divide-y divide-white/[.06] border-y border-white/[.06]">{mine.map((a, i) => <li key={a.id} className="flex gap-3 py-3"><span className="w-5 shrink-0 text-right text-sm tabular-nums text-zinc-500">{i + 1}</span><span className="min-w-0 break-words text-[15px] leading-snug text-zinc-100">{a.text}{a.stopped && <span className="mt-0.5 block text-sm text-red-400">Work is stopped until you answer</span>}{a.note && <span className="mt-0.5 block text-sm text-zinc-400">{a.note}</span>}</span></li>)}</ol>
            : <p className="text-[15px] text-zinc-400">Nothing waits for you here.</p>}
        </section>
        {links.length > 0 && <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-400">Links</h2>
          <ul className="divide-y divide-white/[.06]">{links.map(l => <li key={l.href}><a href={l.href} target="_blank" rel="noopener" className="flex items-center gap-3 py-2.5 text-sm text-zinc-200 hover:underline"><l.Icon size={16} className="shrink-0 text-zinc-500" /><span className="min-w-0 flex-1"><span className="block font-medium">{l.name}</span><span className="block break-words text-xs text-zinc-500">{l.about}</span></span><ArrowUpRight size={14} className="shrink-0 text-zinc-500" /></a></li>)}</ul>
        </section>}
      </div>
    </div>
  </>
}
