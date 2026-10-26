// "Needs you": the one ranked list of things the owner must do now, across all projects. Pure functions, no React, no fetching,
// so the ranking can be tested on its own (tests/rank.test.mjs).
// Sources: requests that agents wrote down (asks.json), pull requests that wait for the owner (prs.json: ready to merge, review asked of him),
// agent sessions that report they wait for him (agents.json heartbeats). Anything older than the freshness window is not shown:
// old questions and idle sessions must never hang here.

export type Action = { id: string; text: string; project: string; stopped: boolean; rank: number; since?: string; note?: string; kind: 'ask' | 'merge' | 'review' | 'thread' | 'backlog' | 'lab' }
// What ranking needs to know about projects: their order (first = most expensive when stalled) and two flags.
//   shared:   a team repo; only the owner's own PRs count as his to merge.
//   blocking: work in this project stops while a review or an answer from the owner is pending.
export type ProjectRule = { id: string; shared?: boolean; blocking?: boolean }

export const FRESH_DAYS = 4
const fresh = (now: number, iso?: string, days = FRESH_DAYS) => !!iso && now - Date.parse(iso) < days * 864e5
const repoShort = (repo?: string) => (repo || '').split('/').pop() || ''
const clip = (s: string) => (s.length > 90 ? s.slice(0, 87) + '…' : s)
// Display name of a session: a hand-written name from agent-info.json wins over the heartbeat title
export const threadName = (t: any, info: any) => info?.agents?.['thread:' + t.id]?.name || t.title || t.id

export function buildActions(asks: any, prs: any, agents: any, info: any, owner: string, projects: ProjectRule[], now = Date.now()): Action[] {
  const rule = (id: string) => projects.find(p => p.id === id) || { id }
  const out: Action[] = []
  for (const a of asks?.asks || []) {
    if (a.status !== 'open') continue
    // an ask stays until somebody closes it, but a priority 3 ask older than two weeks is background noise
    if (a.priority === 3 && !fresh(now, a.added, 14)) continue
    out.push({ id: 'ask:' + a.id, text: a.text, project: a.project, stopped: a.priority === 1, rank: a.priority === 1 ? 0 : a.priority === 3 ? 4 : 2, since: a.added, kind: 'ask' })
  }
  for (const [pid, p] of Object.entries<any>(prs?.projects || {})) {
    const r = rule(pid)
    for (const x of p?.open || []) {
      const codes = (x.waiting || []).map((w: any) => w.k)
      const mine = (x.waiting || []).some((w: any) => w.k === 'review' && (w.who || []).includes(owner))
      const repo = repoShort(x.repo || p.repo)
      if (codes.includes('ready') && (!r.shared || x.author === owner)) out.push({ id: `pr:${pid}:${x.repo || ''}:${x.n}`, text: `Merge PR #${x.n} in ${repo}: "${clip(x.title)}". Checks are green and it has a review.`, project: pid, stopped: false, rank: 1, since: x.updated, kind: 'merge' })
      else if (mine) out.push({ id: `rv:${pid}:${x.repo || ''}:${x.n}`, text: `Review PR #${x.n} in ${repo}: "${clip(x.title)}". The review is requested from you.`, project: pid, stopped: !!r.blocking, rank: r.blocking ? 0 : 1, since: x.updated, kind: 'review' })
    }
  }
  for (const t of agents?.agents || []) {
    if (t.status !== 'waiting' || !fresh(now, t.updated) || !t.waiting_on) continue
    const r = rule(t.project)
    out.push({ id: 'th:' + t.id, text: `Answer the session "${threadName(t, info)}".`, note: `It waits for: ${String(t.waiting_on).replace(/\.$/, '')}`, project: t.project, stopped: !!r.blocking, rank: r.blocking ? 0 : 3, since: t.updated, kind: 'thread' })
  }
  const order = (id: string) => { const i = projects.findIndex(p => p.id === id); return i < 0 ? 99 : i }
  return out.sort((x, y) => x.rank - y.rank || order(x.project) - order(y.project) || String(x.since || '').localeCompare(String(y.since || '')))
}
