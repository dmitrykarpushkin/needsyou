// The demo data must not contradict itself: every journal run of a server timer falls on a minute its schedule phrase allows.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseRule } from '../src/schedule.ts'

const demo = f => readFileSync(new URL('../public/demo/' + f, import.meta.url), 'utf8')
const timers = JSON.parse(demo('schedules.json')).timers
const services = JSON.parse(demo('services.json')).services
const journal = demo('journal.jsonl').split('\n').filter(Boolean).map(l => JSON.parse(l))

test('every journal run matches the schedule of its timer (UTC)', () => {
  const byName = Object.fromEntries(timers.map(t => [t.name, parseRule(t.schedule)]))
  for (const e of journal) {
    const s = services.find(x => x.id === e.service)
    assert.ok(s, `journal service ${e.service} is in services.json`)
    const rule = byName[s.name]
    assert.ok(rule && rule.kind === 'times', `${s.name} has a timer schedule`)
    const d = new Date(e.ts), m = d.getUTCHours() * 60 + d.getUTCMinutes()
    assert.ok(rule.mins.includes(m), `${s.name} ran at ${e.ts.slice(11, 16)}, outside "${timers.find(t => t.name === s.name).schedule}"`)
  }
})

test('every server timer has runs in the journal', () => {
  for (const t of timers) {
    const s = services.find(x => x.name === t.name)
    assert.ok(s && journal.some(e => e.service === s.id), `${t.name} has journal runs`)
  }
})
