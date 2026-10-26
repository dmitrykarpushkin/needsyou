// The live "Needs you" list: rank.ts over the polled files, plus the top backlog items and Lab ideas that wait for the owner's word.
import { usePolled } from './live'
import { rowsOf } from './backlogRows.mjs'
import { buildActions, type Action } from './rank'
import { getConsole } from './store'

export { threadName } from './rank'
export type { Action } from './rank'

export function useActions() {
  const a = usePolled('asks.json'), p = usePolled('prs.json'), g = usePolled('agents.json', 20000), i = usePolled('agent-info.json', 300000), b = usePolled('backlog.json', 120000), lb = usePolled('lab.json', 120000)
  const { owner, projects } = getConsole()
  const parked = ((lb.data?.ideas || []) as any[]).filter(x => x.state === 'parked').length
  const labRow: Action[] = parked ? [{ id: 'lab:parked', text: `Decide which of the ${parked} parked Lab ideas to take and which to drop. The list is on the Lab page.`, project: lb.data?.project || projects[0]?.id || '', stopped: false, rank: 2, kind: 'lab' }] : []
  // the top backlog items that wait for the owner rank with his other requests
  const top: Action[] = (b.data ? rowsOf(b.data).rows : []).filter((r: any) => r.act === 'me' && (r.level ?? r.value) >= 5)
    .map((r: any) => ({ id: 'bl:' + r.module + '/' + r.id, text: r.phrase, project: r.project || b.data?.project || projects[0]?.id || '', stopped: false, rank: 2, kind: 'backlog' as const }))
  const loading = a.data === undefined && p.data === undefined && g.data === undefined
  const actions = loading ? [] : [...buildActions(a.data, p.data, g.data, i.data, owner.login, projects), ...top, ...labRow].sort((x, y) => x.rank - y.rank)
  return { actions, topN: top.length, loading, sources: { asks: a, prs: p, agents: g } }
}
