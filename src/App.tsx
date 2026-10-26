// The shell: a flat sidebar on wide screens (Now; the projects; Agents, Wiring, Backlog; Lab), a bottom bar on phones whose
// "More" entry opens #/more, and hash routing. console.json (owner and projects) is re-read every minute.
import { Bot, CircleDot, Ellipsis, FlaskConical, FolderKanban, ListTodo, Plug } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Now from './Now'
import Activity from './Activity'
import Backlog from './Backlog'
import Lab from './Lab'
import Wiring from './Wiring'
import Project from './Project'
import Timers from './Timers'
import Agents from './Agents'
import { useFeedOpen, useNarrow } from './live'
import { AGENT_TABS, PROJECT_TABS, Tabs } from './Section'
import { fetchJson } from './data'
import { getConsole, setConsole, type ConsoleData } from './store'
import { CONFIG } from './config'
import { ago } from './format'

// true while the last re-read of console.json failed: the screen then shows old data, and the sidebar says so
let refreshFailed = false
const parse = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'today').split('/')

export default function App() {
  const [r, setR] = useState(parse())
  const [, tick] = useState(0)
  const mainRef = useRef<HTMLElement>(null)
  const narrow = useNarrow(760)
  const feedOpen = useFeedOpen()
  const { projects, generated } = getConsole()
  const first = projects[0]?.id || ''
  useEffect(() => {
    const on = () => { setR(parse()); if (mainRef.current) mainRef.current.scrollTop = 0 }
    addEventListener('hashchange', on)
    // keys 1-5 jump between the main sections (not while typing, not with a modifier)
    const KEYS = ['#/', '#/p/' + first, '#/agents', '#/wiring', '#/backlog']
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey || (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))) return
      const i = '12345'.indexOf(e.key)
      if (e.key.length === 1 && i >= 0) location.hash = KEYS[i]
    }
    addEventListener('keydown', key)
    const t = setInterval(() => {
      fetchJson<ConsoleData>('console.json').then(d => { setConsole(d); refreshFailed = false }).catch(() => { refreshFailed = true }).finally(() => tick(x => x + 1))
    }, 60000)
    return () => { removeEventListener('keydown', key); removeEventListener('hashchange', on); clearInterval(t) }
  }, [first])

  const [k0, a] = r
  const k = k0 === 'more' && !narrow ? 'today' : k0 === 'today' ? 'today' : k0
  const sec = k === 'p' ? 'p/' + (a || first) : k === 'timers' || k === 'activity' ? 'agents' : k

  const NAV: { key: string; href: string; label: string; Icon?: any; dot?: string; group?: string }[] = [
    { key: 'today', href: '#/', label: 'Now', Icon: CircleDot },
    ...projects.map(p => ({ key: 'p/' + p.id, href: '#/p/' + p.id, label: p.name, dot: p.color, group: 'Projects' })),
    { key: 'agents', href: '#/agents', label: 'Agents', Icon: Bot, group: 'System' },
    { key: 'wiring', href: '#/wiring', label: 'Wiring', Icon: Plug, group: 'System' },
    { key: 'backlog', href: '#/backlog', label: 'Backlog', Icon: ListTodo, group: 'System' },
    { key: 'lab', href: '#/lab', label: 'Lab', Icon: FlaskConical, group: 'More' },
  ]
  // phone bar: five places; everything else sits behind "More"
  const curP = k === 'p' ? a || first : first
  const BAR = [
    { key: 'today', href: '#/', label: 'Now', Icon: CircleDot }, { key: 'p/' + curP, href: '#/p/' + curP, label: 'Projects', Icon: FolderKanban },
    { key: 'agents', href: '#/agents', label: 'Agents', Icon: Bot }, { key: 'wiring', href: '#/wiring', label: 'Wiring', Icon: Plug },
    { key: 'more', href: '#/more', label: 'More', Icon: Ellipsis },
  ]
  const barOn = (key: string) => key === 'more' ? ['more', 'backlog', 'lab'].includes(sec) : key.startsWith('p/') ? sec.startsWith('p/') : key === sec
  const tabs = sec === 'agents' ? AGENT_TABS() : k === 'p' && narrow ? PROJECT_TABS(projects) : null
  const tabCur = k === 'p' ? 'p/' + (a || first) : k
  const ttl = k === 'more' ? (narrow ? 'More' : undefined) : ({ activity: 'What the agents did', lab: 'Lab', timers: 'Schedule', agents: 'Agents' } as Record<string, string>)[k]

  let body: ReactNode = null
  if (k === 'today') body = <Now />
  else if (k === 'more') body = <ul className="divide-y divide-white/[.06] border-y border-white/[.06]">{NAV.filter(x => x.group === 'More' || x.key === 'backlog').map(x => <li key={x.key}><a href={x.href} className="flex min-h-12 items-center gap-3 text-[16px] text-zinc-100">{x.Icon && <x.Icon size={18} className="text-zinc-400" />}{x.label}</a></li>)}</ul>
  else if (k === 'p') { const p = projects.find(x => x.id === a) || projects[0]; body = p ? <Project p={p} /> : null }
  else if (k === 'agents') body = <Agents />
  else if (k === 'backlog') body = <Backlog />
  else if (k === 'wiring') body = <Wiring />
  else if (k === 'lab') body = <Lab />
  else if (k === 'activity') body = <Activity />
  else if (k === 'timers') body = <Timers />
  else body = <p className="text-zinc-400">There is no page at this address. <a href="#/" className="text-indigo-300">Go to Now</a></p>

  const min = Math.max(0, Math.round((Date.now() - Date.parse(generated)) / 6e4)), bad = refreshFailed || min > 15
  return <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', height: '100dvh', background: '#0a0a0c', color: '#e4e4e7', fontFamily: '"Inter Variable", Inter, system-ui, sans-serif', colorScheme: 'dark' }}>
    {!narrow && <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 12px', background: '#0d0d10', borderRight: '1px solid rgba(255,255,255,.06)', overflowY: 'auto', boxSizing: 'border-box' }}>
      <a href="#/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 14 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#8b5cf6,#d946ef)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>N</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>needsyou</span>
        {CONFIG.source === 'demo' && <span style={{ marginLeft: 'auto', fontSize: 11, padding: '1px 6px', borderRadius: 999, background: 'rgba(129,140,248,.15)', color: '#a5b4fc' }}>demo</span>}
      </a>
      {NAV.map((it, n) => <div key={it.key}>
        {it.group && NAV[n - 1]?.group !== it.group && <div style={{ margin: '14px 10px 4px', fontSize: 12, color: '#71717a' }}>{it.group}</div>}
        <a href={it.href} aria-current={it.key === sec ? 'page' : undefined} className="hv-nav" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, padding: it.dot ? '0 10px 0 22px' : '0 10px', borderRadius: 8, fontSize: 14, background: it.key === sec ? 'rgba(255,255,255,.07)' : 'transparent', color: it.key === sec ? '#f4f4f5' : '#a1a1aa' }}>
          {it.dot ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: it.dot, flexShrink: 0 }} /> : it.Icon ? <it.Icon size={16} style={{ width: 16 }} /> : null}
          <span style={{ flex: 1 }}>{it.label}</span>
        </a>
      </div>)}
      <div role="status" style={{ marginTop: 'auto', padding: '8px 8px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: bad && !feedOpen ? '#fcd34d' : '#a1a1aa' }}><span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: bad && !feedOpen ? '#fbbf24' : '#34d399', boxShadow: bad && !feedOpen ? '0 0 8px #fbbf24' : '0 0 8px #34d399' }} />{feedOpen ? 'live' : bad ? `data is stale: ${ago(generated)}${refreshFailed ? ', refresh failed' : ''}` : `data from ${ago(generated)}`}</div>
    </aside>}
    <main id="main" ref={mainRef} style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: narrow ? '20px 16px 32px' : '28px 40px 56px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tabs && <Tabs tabs={tabs} cur={tabCur} />}
        {ttl && <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', color: '#fafafa' }}>{ttl}</h1>}
        {body}
      </div>
    </main>
    {narrow && <nav aria-label="Sections" style={{ display: 'flex', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,.08)', background: '#0d0d10', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {BAR.map(it => <a key={it.key} href={it.href} aria-current={barOn(it.key) ? 'page' : undefined} style={{ position: 'relative', flex: 1, minHeight: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 12, color: barOn(it.key) ? '#a5b4fc' : '#a1a1aa', background: barOn(it.key) ? 'rgba(129,140,248,.12)' : 'transparent' }}>
        <it.Icon size={20} />
        {it.label}
      </a>)}
    </nav>}
  </div>
}
