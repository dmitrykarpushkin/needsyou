import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shiftTimes } from '../src/shift.ts'

test('moves ISO timestamps by the offset and keeps the Z form', () => {
  const out = shiftTimes('{"ts":"2026-10-26T09:00:00Z","b":"2026-10-26T08:30Z"}', 90 * 60000)
  assert.equal(out, '{"ts":"2026-10-26T10:30:00Z","b":"2026-10-26T10:00:00Z"}')
})

test('moves date-only values by whole days, not timestamps twice', () => {
  const out = shiftTimes('once 2026-10-28 at 10:00; at 2026-10-26T23:00:00Z', 2 * 864e5)
  assert.equal(out, 'once 2026-10-30 at 10:00; at 2026-10-28T23:00:00Z')
})

test('leaves other numbers alone', () => {
  const s = '{"n":214,"id":"idea-001","pct":"35%","time":"07:30"}'
  assert.equal(shiftTimes(s, 5 * 864e5), s)
})
