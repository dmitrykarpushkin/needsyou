// Reads a plain-language schedule ("daily 07:30", "every 15 min", "every 2 h 08:00-20:00", "hourly at :05", "mon, thu 09:00",
// "once 2026-10-28 at 10:00", "on demand") into the minutes of the day it fires at, and finds the next firing in a time zone.
// Pure functions without React or config, so they are tested on their own (tests/schedule.test.mjs).

export const DAY = 1440
// Rule: minutes of the day it fires at; dense = fires every 15 minutes or more often, drawn as a band instead of ticks
export type Rule =
  | { kind: 'times'; mins: number[]; dense?: number; days?: number[]; once?: { y: number; m: number; d: number }; label: string }
  | { kind: 'event'; label: string }

const WDAYS: [RegExp, number, string][] = [
  [/\bmon(day)?\b/, 1, 'Mon'], [/\btue(s|sday)?\b/, 2, 'Tue'], [/\bwed(nesday)?\b/, 3, 'Wed'], [/\bthu(rs|rsday)?\b/, 4, 'Thu'],
  [/\bfri(day)?\b/, 5, 'Fri'], [/\bsat(urday)?\b/, 6, 'Sat'], [/\bsun(day)?\b/, 0, 'Sun'],
]
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const hm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const DENSE_MAX_MIN = 15
const range = (from: number, to: number, step: number) => { const r: number[] = []; for (let m = from; m <= to; m += step) r.push(m); return r }

export function parseRule(text: string, everyHours?: number): Rule {
  const s = ' ' + (text || '').toLowerCase() + ' '
  if (/no schedule|on demand|on request|on event|manual/.test(s)) return { kind: 'event', label: /no schedule/.test(s) ? 'no schedule' : 'on demand' }
  const once = /\bonce\b/.test(s) ? s.match(/(\d{4})-(\d{2})-(\d{2})/) : null
  const times = [...s.replace(/\d{4}-\d{2}-\d{2}/g, '').matchAll(/(\d{1,2}):(\d{2})/g)].map(x => +x[1] * 60 + +x[2]).filter(m => m < DAY)
  const nMin = s.match(/every\s*(\d+)?\s*min/), nHour = s.match(/every\s*(\d+)?\s*(h\b|hour)|hourly/)
  const off = s.match(/at\s*:(\d{2})/)
  if (nMin) { const n = +(nMin[1] || 1); return { kind: 'times', mins: range(0, DAY - 1, n), ...(n <= DENSE_MAX_MIN ? { dense: n } : {}), label: `every ${n} min` } }
  if (nHour) {
    const n = +(nHour[1] || 1), from = times.length >= 2 ? times[0] : off ? +off[1] : 0, to = times.length >= 2 ? times[1] : DAY - 1
    return { kind: 'times', mins: range(from, to, n * 60), label: n === 1 ? `hourly${off ? ' at :' + off[1] : ''}` : `every ${n} h${times.length >= 2 ? ` ${hm(from)}–${hm(to)}` : ''}` }
  }
  const days = WDAYS.filter(([re]) => re.test(s))
  if (times.length) {
    if (once) return { kind: 'times', mins: times, once: { y: +once[1], m: +once[2] - 1, d: +once[3] }, label: `once, ${MON[+once[2] - 1]} ${+once[3]}` }
    if (days.length && !/daily|every day/.test(s)) return { kind: 'times', mins: times, days: days.map(d => d[1]), label: days.map(d => d[2]).join(', ') }
    return { kind: 'times', mins: times, label: 'daily' }
  }
  // the text says nothing readable: fall back to the expected period of the timer
  if (everyHours && everyHours > 0) {
    const n = Math.round(everyHours * 60)
    if (n < 60) return { kind: 'times', mins: range(0, DAY - 1, n), ...(n <= DENSE_MAX_MIN ? { dense: n } : {}), label: `every ${n} min` }
    if (n < DAY) return { kind: 'times', mins: range(0, DAY - 1, n), label: `every ${n / 60} h` }
  }
  return { kind: 'event', label: 'on event' }
}

// Wall clock of a moment in a time zone: date parts and minute of the day
export const wall = (t: number, tz: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' })
    .formatToParts(new Date(t)).map(x => [x.type, x.value]))
  return { y: +p.year, mo: +p.month - 1, d: +p.day, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: +p.hour * 60 + +p.minute }
}
const onceMatch = (r: Rule & { kind: 'times' }, w: ReturnType<typeof wall>) => !r.once || (r.once.y === w.y && r.once.m === w.mo && r.once.d === w.d)

// Next firing from now, in minutes from now; null when it will not fire again within a week
export function nextIn(r: Rule, now: number, tz: string): number | null {
  if (r.kind !== 'times' || !r.mins.length) return null
  const c = wall(now, tz)
  for (let dd = 0; dd < 8; dd++) {
    const t = wall(now + dd * 864e5, tz)
    if (r.days && !r.days.includes(t.wd)) continue
    if (!onceMatch(r, t)) continue
    const m = r.mins.find(x => dd > 0 || x > c.min)
    if (m !== undefined) return dd * DAY + m - c.min
  }
  return null
}
export const firesToday = (r: Rule, now: number, tz: string) => { if (r.kind !== 'times') return false; const c = wall(now, tz); return (!r.days || r.days.includes(c.wd)) && onceMatch(r, c) }
export const inWords = (n: number) => n < 1 ? 'now' : n < 60 ? `in ${n} min` : n < DAY ? `in ${Math.floor(n / 60)} h${n % 60 ? ' ' + (n % 60) + ' min' : ''}` : `in ${Math.round(n / DAY)} d`
