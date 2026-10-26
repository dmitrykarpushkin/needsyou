import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildActions } from '../src/rank.ts'

const NOW = Date.parse('2026-10-26T09:00:00Z')
const ago = h => new Date(NOW - h * 36e5).toISOString()
const projects = [{ id: 'api', blocking: true, shared: true }, { id: 'lab' }]

test('a blocking ask comes first, then merges, then plain asks', () => {
  const asks = { asks: [
    { id: 'x', text: 'plain', project: 'lab', priority: 2, status: 'open', added: ago(1) },
    { id: 'y', text: 'blocker', project: 'lab', priority: 1, status: 'open', added: ago(2) },
    { id: 'z', text: 'closed', project: 'lab', priority: 1, status: 'closed', added: ago(2) },
  ] }
  const prs = { projects: { lab: { repo: 'o/lab', open: [{ n: 5, title: 'T', author: 'me', updated: ago(1), waiting: [{ k: 'ready' }] }] } } }
  const out = buildActions(asks, prs, null, null, 'me', projects, NOW)
  assert.deepEqual(out.map(a => a.id), ['ask:y', 'pr:lab::5', 'ask:x'])
  assert.equal(out[0].stopped, true)
})

test('in a shared repo only the owner\'s own ready PRs are his to merge', () => {
  const prs = { projects: { api: { repo: 'o/api', open: [
    { n: 1, title: 'mine', author: 'me', updated: ago(1), waiting: [{ k: 'ready' }] },
    { n: 2, title: 'theirs', author: 'bob', updated: ago(1), waiting: [{ k: 'ready' }] },
  ] } } }
  assert.deepEqual(buildActions(null, prs, null, null, 'me', projects, NOW).map(a => a.id), ['pr:api::1'])
})

test('a review requested from the owner stops work in a blocking project', () => {
  const prs = { projects: { api: { open: [{ n: 3, title: 'R', author: 'bob', updated: ago(1), waiting: [{ k: 'review', who: ['me'] }] }] } } }
  const [a] = buildActions(null, prs, null, null, 'me', projects, NOW)
  assert.equal(a.kind, 'review'); assert.equal(a.stopped, true); assert.equal(a.rank, 0)
})

test('stale waiting sessions and old low-priority asks are hidden', () => {
  const agents = { agents: [
    { id: 'fresh', status: 'waiting', waiting_on: 'a choice', project: 'lab', updated: ago(5) },
    { id: 'old', status: 'waiting', waiting_on: 'a choice', project: 'lab', updated: ago(24 * 5) },
  ] }
  const asks = { asks: [{ id: 'o', text: 'old', project: 'lab', priority: 3, status: 'open', added: ago(24 * 15) }] }
  assert.deepEqual(buildActions(asks, null, agents, null, 'me', projects, NOW).map(a => a.id), ['th:fresh'])
})
