// Page tab strips: the agents section tabs and the project strip on phones.
import { useEffect, useRef } from 'react'

export type Tab = { key: string; label: string; href: string; n?: number | string; dot?: string }

// "Agents": who works (Lab, sessions, services), when things run, and what ran.
export const AGENT_TABS = (): Tab[] => [
  { key: 'agents', label: 'Agents', href: '#/agents' }, { key: 'timers', label: 'Schedule', href: '#/timers' }, { key: 'activity', label: 'Activity', href: '#/activity' },
]
export const PROJECT_TABS = (projects: { id: string; name: string; color: string }[]): Tab[] =>
  projects.map(p => ({ key: 'p/' + p.id, label: p.name, href: '#/p/' + p.id, dot: p.color }))

// The strip of pages inside a section: scrolls sideways on a phone, every tab is at least 40 px high.
export function Tabs({ tabs, cur }: { tabs: Tab[]; cur: string }) {
  const box = useRef<HTMLElement>(null)
  // bring the current tab into view: on a phone the strip scrolls sideways and the open page must never hide off-screen
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[aria-current="page"]')
    const go = () => { if (el && box.current) box.current.scrollLeft = Math.max(0, el.offsetLeft - (box.current.clientWidth - el.offsetWidth) / 2) }
    go(); const t = setTimeout(go, 150); return () => clearTimeout(t)
  }, [cur])
  return <nav ref={box} aria-label="Section pages" className="flex gap-1.5 overflow-x-auto pb-0.5 pr-8 [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]">
    {tabs.map(t => {
      const on = t.key === cur
      return <a key={t.key} href={t.href} aria-current={on ? 'page' : undefined}
        className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${on ? 'border-indigo-300/50 bg-indigo-400/15 text-zinc-50' : 'border-white/[.08] text-zinc-400 hover:bg-white/[.05]'}`}>
        {t.dot && <span className="size-2 rounded-full" style={{ background: t.dot }} />}{t.label}
        {t.n !== undefined && <span className="text-xs tabular-nums text-amber-300/90">{t.n}</span>}
      </a>
    })}
  </nav>
}
