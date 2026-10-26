// Time and number wording shared by the pages. All clocks use CONFIG.timeZone.
import { CONFIG } from './config'

const TZ = CONFIG.timeZone
export const minutesSince = (iso?: string | null) => (iso ? Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4)) : null)

export function agoMin(m: number | null) {
  if (m === null || isNaN(m)) return ''
  // non-breaking spaces keep "2 h ago" on one line
  return m < 1 ? 'just now' : m < 90 ? `${m}\u00a0min ago` : m < 2880 ? `${Math.round(m / 60)}\u00a0h ago` : `${Math.round(m / 1440)}\u00a0d ago`
}
export const ago = (iso?: string | null) => agoMin(minutesSince(iso))

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const dayKey = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ })
export const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
// "today 13:24", "yesterday 09:10", "Oct 19 18:00"
export function clock(iso: string) {
  const t = Date.parse(iso), d = dayKey(t)
  const day = d === dayKey(Date.now()) ? 'today' : d === dayKey(Date.now() - 864e5) ? 'yesterday' : new Date(t).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' })
  return `${day} ${hhmm(t)}`
}
export const when = (iso: string) => `${ago(iso)} (${clock(iso)})`
export const clip = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 3) + '…' : s)
