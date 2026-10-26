import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rowsOf, levelOf } from '../src/backlogRows.mjs'

test('only phrased rows are shown, in the builder order, the rest counted', () => {
  const d = { order: ['m/b', 'm/a'], modules: [{ module: 'm', todo: [{ id: 'a', phrase: 'A' }, { id: 'b', phrase: 'B' }, { id: 'c', title: 'raw' }] }] }
  const { rows, unphrased } = rowsOf(d)
  assert.deepEqual(rows.map(r => r.id), ['b', 'a'])
  assert.equal(unphrased, 1)
})

test('without an order, higher value first; level is clamped to 3..5', () => {
  const d = { modules: [{ module: 'm', todo: [{ id: 'lo', phrase: 'x', value: 1 }, { id: 'hi', phrase: 'y', value: 9 }] }] }
  assert.deepEqual(rowsOf(d).rows.map(r => r.id), ['hi', 'lo'])
  assert.equal(levelOf({ value: 9 }), 5); assert.equal(levelOf({ value: 1 }), 3); assert.equal(levelOf({ level: 4, value: 9 }), 4)
})
