// Wiring: the instructions, skills, hooks and settings, and MCP connectors the agents run with, as one grouped list; a click opens the
// real text of the file. Reads wiring.json (the backend must mask secrets before writing it). The selection lives in the
// address (#/wiring/<id>); it is written with pushState so the shell does not jump the list to the top on every click.
// Two panes on wide screens (the list stays visible), on a phone the list or the item as its own page with a back link.
import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import { usePolled, useNarrow } from './live'
import { plural } from './format'
import { Stale } from './ui/stale'
import { Card } from './ui/card'
import { Empty } from './ui/empty'

type Item = { id: string; kind: 'instruction' | 'skill' | 'hook' | 'mcp'; name: string; path: string; fires: string; about: string; text: string | null
  truncated?: boolean; source: string; status?: string; tools?: number | null; transport?: string | null; note?: string }

const GROUPS: { kind: Item['kind']; title: string }[] = [
  { kind: 'instruction', title: 'Instructions' }, { kind: 'skill', title: 'Skills' }, { kind: 'hook', title: 'Hooks and settings' }, { kind: 'mcp', title: 'Connectors (MCP)' },
]
const tools = (n?: number | null) => n ? plural(n, 'tool', 'tools') : ''
const NO_ABOUT = 'no description yet'
const statusTone = (s?: string) => s === 'on' ? 'text-emerald-300' : 'text-zinc-500'
const selFromHash = () => { const p = location.hash.replace(/^#\/?/, '').split('/'); return p[0] === 'wiring' && p[1] ? decodeURIComponent(p[1]) : null }

// ---- a small markdown renderer: headings, lists, fenced code, quotes, tables as plain rows, paragraphs; inline code, bold, links as text
function inline(s: string, k: string): ReactNode[] {
  const out: ReactNode[] = []
  const rx = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = rx.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    if (m[1]) out.push(<code key={k + i++} className="break-words rounded bg-white/[.07] px-1 py-px font-mono text-[0.88em] text-zinc-200">{m[1].slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k + i++} className="font-semibold text-zinc-50">{m[2].slice(2, -2)}</strong>)
    else out.push(<span key={k + i++} className="text-indigo-300">{m[4]}</span>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: ReactNode[] = []
  let i = 0, n = 0
  const key = () => 'b' + n++
  // front matter of a skill: shown as a quiet block above the text
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1)
    if (end > 0) {
      out.push(<dl key={key()} className="mb-4 rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2 text-sm">{lines.slice(1, end).filter(l => l.includes(':')).map((l, j) => {
        const [a, ...b] = l.split(':')
        return <div key={j} className="py-0.5"><dt className="inline text-zinc-500">{a.trim()}: </dt><dd className="inline text-zinc-300">{b.join(':').trim()}</dd></div>
      })}</dl>)
      i = end + 1
    }
  }
  while (i < lines.length) {
    const l = lines[i]
    if (/^\s*```/.test(l)) {
      const body: string[] = []; i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++])
      i++
      out.push(<pre key={key()} className="my-3 overflow-x-auto rounded-lg border border-white/[.06] bg-black/30 p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words text-zinc-300">{body.join('\n')}</pre>)
      continue
    }
    const h = l.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const lvl = h[1].length, cls = lvl <= 1 ? 'mt-1 mb-3 text-lg font-semibold text-zinc-50' : lvl === 2 ? 'mt-6 mb-2 text-base font-semibold text-zinc-50' : 'mt-4 mb-1.5 text-[15px] font-semibold text-zinc-100'
      out.push(<div key={key()} role="heading" aria-level={lvl + 2} className={cls}>{inline(h[2], 'h' + n)}</div>); i++; continue
    }
    if (/^\s*([-*]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d/.test(l), items: { depth: number; text: string }[] = []
      while (i < lines.length && (/^\s*([-*]|\d+[.)])\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const m = lines[i].match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/)
        if (m) items.push({ depth: Math.min(2, Math.floor(m[1].length / 2)), text: m[3] })
        else items[items.length - 1].text += ' ' + lines[i].trim()
        i++
      }
      const L = ordered ? 'ol' : 'ul'
      out.push(<L key={key()} className={`my-2 space-y-1.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-zinc-500`}>
        {items.map((it, j) => <li key={j} style={{ marginLeft: it.depth * 16 }} className="pl-1">{inline(it.text, 'l' + n + '-' + j)}</li>)}</L>)
      continue
    }
    if (/^\s*>/.test(l)) {
      const body: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''))
      out.push(<blockquote key={key()} className="my-3 border-l-2 border-white/15 pl-3 text-zinc-400">{inline(body.join(' '), 'q' + n)}</blockquote>)
      continue
    }
    if (/^\s*\|/.test(l)) {
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (!cells.every(c => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      out.push(<div key={key()} className="my-3 overflow-x-auto"><table className="w-full border-collapse text-sm">
        <tbody>{rows.map((r, j) => <tr key={j} className="border-b border-white/[.06]">{r.map((c, q) => <td key={q} className={`py-1.5 pr-3 align-top ${j === 0 ? 'font-medium text-zinc-200' : 'text-zinc-300'}`}>{inline(c, 't' + n + j + q)}</td>)}</tr>)}</tbody>
      </table></div>)
      continue
    }
    const imp = l.match(/^@(\S+)$/)
    if (imp) { out.push(<p key={key()} className="my-2.5 text-sm text-zinc-400">Imports the file <code className="rounded bg-white/[.07] px-1 py-px font-mono text-[0.92em] text-zinc-200">{imp[1]}</code>: its text is read together with this one.</p>); i++; continue }
    if (!l.trim()) { i++; continue }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,6}\s|[-*]\s|\d+[.)]\s|>|\||@\S+$)/.test(lines[i])) para.push(lines[i++].trim())
    if (!para.length) para.push(lines[i++].trim())
    out.push(<p key={key()} className="my-2.5">{inline(para.join(' '), 'p' + n)}</p>)
  }
  return <>{out}</>
}

function Row({ it, on, pick }: { it: Item; on: boolean; pick: (id: string) => void }) {
  const right = it.kind === 'mcp'
    ? <span className="text-right text-sm"><span className={statusTone(it.status)}>{it.status}</span>{it.tools ? <span className="text-zinc-500"> · {tools(it.tools)}</span> : null}</span>
    : <span className="text-right text-sm text-zinc-400">{it.fires}</span>
  return <li>
    <a href={`#/wiring/${encodeURIComponent(it.id)}`} onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); pick(it.id) }} aria-current={on ? 'true' : undefined}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-white/[.06] px-3 py-2.5 hover:bg-white/[.03] ${on ? 'bg-white/[.06] shadow-[inset_3px_0_0_#818cf8]' : ''}`}>
      <span className="min-w-0 break-words font-medium text-zinc-100">{it.name}</span>
      {right}
      <span className={`col-span-2 text-sm leading-snug ${it.about === NO_ABOUT ? 'text-zinc-500' : 'text-zinc-400'}`}>{it.about}</span>
    </a>
  </li>
}

function Detail({ it, narrow }: { it: Item; narrow: boolean }) {
  const [raw, setRaw] = useState(false)
  useEffect(() => setRaw(false), [it.id])
  const md = it.kind === 'mcp' || /\.md$/i.test(it.path) || /^```/.test(it.text || '')
  const where = [it.path, it.source].filter(Boolean).join(' · ')
  return <div className="min-w-0">
    {narrow && <a href="#/wiring" className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-[15px] text-indigo-300"><ArrowLeft size={16} />All wiring</a>}
    <h2 className="m-0 break-words text-xl font-semibold text-zinc-50">{it.name}</h2>
    <div className="mt-1 break-words text-sm text-zinc-400">{where}</div>
    <div className="mt-0.5 text-sm text-zinc-400">
      {it.kind === 'mcp' ? <>status: <span className={statusTone(it.status)}>{it.status}</span>{it.tools ? ` · ${tools(it.tools)} allowed` : ''}{it.transport ? ` · transport: ${it.transport}` : ''}</> : <>fires: <span className="text-zinc-200">{it.fires}</span>{it.status ? <> · <span className={statusTone(it.status)}>{it.status}</span></> : null}</>}
    </div>
    <p className={`mt-3 mb-0 text-[15px] ${it.about === NO_ABOUT ? 'text-zinc-500' : 'text-zinc-300'}`}>{it.about}</p>
    {it.text ? <>
      <div className="mt-4 flex gap-1" role="tablist" aria-label="View as">
        {[['Rendered', false], ['Raw file', true]].map(([t, v]) => <button key={String(t)} type="button" role="tab" aria-selected={raw === v} onClick={() => setRaw(v as boolean)}
          className={`min-h-9 rounded-md border px-3 text-sm ${raw === v ? 'border-white/15 bg-white/[.08] text-zinc-50' : 'border-white/10 text-zinc-400 hover:text-zinc-200'}`}>{t as string}</button>)}
      </div>
      <div className="mt-4 border-t border-white/[.08] pt-3 text-[15px] leading-relaxed text-zinc-200" style={{ maxWidth: '78ch' }}>
        {raw || !md
          ? <pre className="m-0 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words text-zinc-300">{it.text}</pre>
          : <Markdown text={it.text} />}
        {it.truncated && <p className="mt-4 text-sm text-amber-300/90">The file is long: only the first 20,000 characters are shown.</p>}
      </div>
    </> : <p className="mt-4 border-t border-white/[.08] pt-4 text-[15px] text-zinc-400" style={{ maxWidth: '72ch' }}>{it.note || 'The text of this item is not available here.'}</p>}
  </div>
}

export default function Wiring() {
  const polled = usePolled('./wiring.json'), d = polled.data
  const narrow = useNarrow(760)
  const [sel, setSel] = useState<string | null>(selFromHash)
  useEffect(() => { const f = () => setSel(selFromHash()); addEventListener('popstate', f); addEventListener('hashchange', f); return () => { removeEventListener('popstate', f); removeEventListener('hashchange', f) } }, [])
  const pick = (id: string) => {
    history.pushState(null, '', `#/wiring/${encodeURIComponent(id)}`); setSel(id)
    if (narrow) document.getElementById('main')?.scrollTo(0, 0)
  }
  const head = <div>
    <h1 className="m-0 text-2xl font-semibold tracking-tight text-zinc-50">Wiring</h1>
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-zinc-400"><span>The instructions, skills, hooks and connectors your agents run with. Click one to read its text.</span><Stale p={polled} what="Wiring" /></div>
  </div>
  if (d === undefined) return <>{head}<Card className="p-5 text-sm text-zinc-400">Loading…</Card></>
  const items: Item[] = d?.items || []
  if (!items.length) return <>{head}<Empty icon={<FileText size={22} />} title="No wiring collected yet">The texts arrive from the backend after its next sync.</Empty></>
  const cur = items.find(i => i.id === sel) || null
  const shown = cur || items[0]
  const list = <div className="min-w-0">
    {GROUPS.map(g => { const rows = items.filter(i => i.kind === g.kind); return rows.length ? <section key={g.kind} className="mb-5">
      <h2 className="m-0 border-b border-white/[.08] pb-1.5 text-sm font-medium text-zinc-400">{g.title} <span className="text-zinc-600">{rows.length}</span></h2>
      <ul className="m-0 list-none p-0">{rows.map(it => <Row key={it.id} it={it} on={!narrow && it.id === shown.id} pick={pick} />)}</ul>
    </section> : null })}
  </div>
  if (narrow) return <>{!cur && head}{cur ? <Detail it={cur} narrow /> : list}</>
  return <>
    {head}
    <div className="grid items-start gap-6 grid-cols-[minmax(300px,400px)_minmax(0,1fr)] min-[1700px]:grid-cols-[440px_minmax(0,1fr)]">
      {list}
      <Card className="sticky top-6 max-h-[calc(100dvh-48px)] overflow-y-auto p-5 md:p-6"><Detail it={shown} narrow={false} /></Card>
    </div>
  </>
}
