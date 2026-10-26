// Shapes of the data files, as documented in docs/DATA.md. Every field the page can do without is optional.

export type PrWait = { k: 'ready' | 'review' | 'changes' | 'red' | 'running' | 'draft' | 'review_wait' | string; who?: string[] }
export type OpenPr = {
  n: number; title: string; url?: string; draft?: boolean; why?: string; author?: string; updated: string
  age_days?: number; base?: string; repo?: string; waiting?: PrWait[]; done?: number; total?: number
}
export type MergedPr = { n: number; title: string; url?: string; merged_at?: string; author?: string; repo?: string }
export type ProjectPrs = { repo?: string; open?: OpenPr[]; merged?: MergedPr[]; error?: string }
export type PrsFile = { built?: string; projects?: Record<string, ProjectPrs> }

export type Heartbeat = { id: string; title?: string; project?: string; status: 'working' | 'waiting' | 'done' | string; task?: string; waiting_on?: string; updated?: string; progress?: number }
export type AgentsFile = { agents?: Heartbeat[] }
export type AgentInfo = { name?: string; what?: string; when?: string }
export type AgentInfoFile = { agents?: Record<string, AgentInfo> }

export type Role = { name: string; does?: string; state: 'going' | 'done' | 'waiting' | 'error' | string; note?: string }
export type WorkItem = {
  id: string; project: string; state?: string; title: string; status?: string; summary?: string; changed?: string
  roles?: Role[]; pr?: { n: number; state: string }; plan?: { done: number; total: number }
}
export type WorkFile = { work?: WorkItem[] }

export type Run = { ts: string; ok?: boolean; dur?: number }
export type Service = { id: string; name?: string; about?: string; schedule?: string; always_on?: boolean; running_since?: string | null; planned?: boolean; kind?: string; runs?: Run[] }
export type ServicesFile = { services?: Service[] }

export type LabStep = { stage?: string; role: string; verdict: string; ts: string; agent?: string }
export type LabIdea = {
  id: string; title?: string; phrase?: string; why?: string; priority?: number; state: 'active' | 'parked' | 'done' | 'dropped' | string
  submitted_by?: string; submitted_at?: string; done_at?: string | null; steps?: LabStep[]; last?: { ts: string } | null
}
export type LabFile = { project?: string; updated?: string; stages?: { id: string; role: string; waiting?: number }[]; totals?: Record<string, number>; ideas?: LabIdea[] }
