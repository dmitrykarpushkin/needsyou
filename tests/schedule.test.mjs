import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRule, nextIn } from '../src/schedule.ts'

test('reads the common schedule phrases', () => {
  assert.deepEqual(parseRule('daily 07:30'), { kind: 'times', mins: [450], label: 'daily' })
  const m = parseRule('every 15 min'); assert.equal(m.kind, 'times'); assert.equal(m.dense, 15); assert.equal(m.mins.length, 96)
  const h = parseRule('every 2 h 06:00-22:00'); assert.equal(h.mins[0], 360); assert.equal(h.mins.at(-1), 1320); assert.equal(h.mins.length, 9)
  assert.deepEqual(parseRule('hourly at :15').mins.slice(0, 2), [15, 75])
  assert.deepEqual(parseRule('tue, fri 07:00').days, [2, 5])
  assert.deepEqual(parseRule('once 2026-10-28 at 10:00').once, { y: 2026, m: 9, d: 28 })
  assert.equal(parseRule('on demand').kind, 'event')
  assert.equal(parseRule('whenever').kind, 'event')
  const half = parseRule('every 30 min'); assert.equal(half.dense, undefined); assert.equal(half.mins.length, 48) // sparse: drawn as ticks
  const fb = parseRule('', 0.5); assert.equal(fb.dense, undefined); assert.equal(fb.mins.length, 48)
  assert.equal(parseRule('', 0.1).dense, 6)
})

test('next firing respects weekdays and the time zone', () => {
  const mon0900utc = Date.parse('2026-10-26T09:00:00Z') // a Monday
  assert.equal(nextIn(parseRule('daily 10:00'), mon0900utc, 'UTC'), 60)
  assert.equal(nextIn(parseRule('daily 10:00'), mon0900utc, 'Asia/Tokyo'), 16 * 60) // 18:00 in Tokyo: next 10:00 is 16 h later
  assert.equal(nextIn(parseRule('wed 09:00'), mon0900utc, 'UTC'), 2 * 1440)
  assert.equal(nextIn(parseRule('once 2026-10-20 at 10:00'), mon0900utc, 'UTC'), null)
})
