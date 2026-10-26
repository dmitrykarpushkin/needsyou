// Data files re-read on a timer. One polling hook serves every page (usePolled); useLive bundles the files several pages share.
import { useEffect, useState } from 'react'
import { CONFIG } from './config'
import { fetchFile } from './data'
import type { Service, ServicesFile } from './types'

export type Polled<T> = {
  data: T | null | undefined // undefined: loading, null: missing (404) or unreadable
  broken: boolean // the file exists but is not valid JSON
  ageMs: number | null // age of the file by its Last-Modified header, when the server sends it
}
const LOADING: Polled<any> = { data: undefined, broken: false, ageMs: null }

// Optional live feed (Server-Sent Events at <base>live/events, event name "state", body {"parts": {"agents.json": {...}, ...}}).
// When it is connected, every part it carries replaces the polled file the moment it changes; when it is not, polling keeps working.
const feed: { es: EventSource | null; open: boolean; parts: Record<string, any>; at: number; subs: Set<() => void> } = { es: null, open: false, parts: {}, at: 0, subs: new Set() }
const FEED_FRESH_MS = 45000
function startFeed() {
  if (!CONFIG.liveFeed || feed.es || typeof EventSource === 'undefined') return
  const es = new EventSource(CONFIG.baseUrl + 'live/events')
  feed.es = es
  es.addEventListener('state', (e: MessageEvent) => {
    try { feed.parts = JSON.parse(e.data).parts || {}; feed.open = true; feed.at = Date.now(); feed.subs.forEach(f => f()) } catch { /* a bad message leaves the files in charge */ }
  })
  es.onerror = () => { feed.open = false; feed.subs.forEach(f => f()) } // EventSource reconnects by itself; until then the files are read
  setInterval(() => { if (feed.open && Date.now() - feed.at > FEED_FRESH_MS * 2) { feed.open = false; feed.subs.forEach(f => f()) } }, 15000)
}
const fromFeed = (name: string) => feed.open && feed.parts[name] !== undefined && !feed.parts[name]?.error ? feed.parts[name] : undefined

// True while the live feed is connected (the sidebar says "live").
export function useFeedOpen() {
  const [o, setO] = useState(feed.open)
  useEffect(() => { startFeed(); const f = () => setO(feed.open); feed.subs.add(f); f(); return () => { feed.subs.delete(f) } }, [])
  return o
}

export function usePolled<T = any>(name: string, everyMs = 60000): Polled<T> {
  const [s, setS] = useState<Polled<T>>(LOADING)
  useEffect(() => {
    let dead = false
    startFeed()
    const live = () => { const v = fromFeed(name); if (v === undefined) return false; if (!dead) setS({ data: v as T, broken: false, ageMs: 0 }); return true }
    const go = () => {
      if (live()) return
      fetchFile(name).then(f => {
        const ageMs = f.lastModified === null ? null : Date.now() - f.lastModified
        if (f.text === null) return { data: null, broken: false, ageMs: null }
        try { return { data: JSON.parse(f.text) as T, broken: false, ageMs } } catch { return { data: null, broken: true, ageMs } }
      }).then(v => { if (!dead && !fromFeed(name)) setS(v) })
    }
    go()
    feed.subs.add(live)
    const t = setInterval(go, everyMs)
    return () => { dead = true; clearInterval(t); feed.subs.delete(live) }
  }, [name, everyMs])
  return s
}

export const STALE_MIN = 15
export const isStale = (p: Polled<any>) => p.ageMs !== null && p.ageMs > STALE_MIN * 60000

export function useLive() {
  const m = usePolled<ServicesFile>('services.json'), c = usePolled<{ ok?: boolean; at?: string }>('checks.json')
  return { services: m.data ?? null, checks: c.data ?? null, servicesPolled: m }
}

// The one definition of "broken now": a service whose newest run failed. Home, Agents and Activity all use it.
export const failedServices = (s: ServicesFile | null | undefined): Service[] => (s?.services || []).filter(n => !n.planned && n.runs?.[0] && n.runs[0].ok === false)

// True while the window is narrower than the given width (phone layout); one hook for every page.
export function useNarrow(px: number) {
  const [n, setN] = useState(() => innerWidth < px)
  useEffect(() => { const f = () => setN(innerWidth < px); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [px])
  return n
}
