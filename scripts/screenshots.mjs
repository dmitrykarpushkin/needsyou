// Captures the screenshots in docs/screenshots from a running build. Needs Playwright with Chromium installed (not a project dependency).
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/screenshots.mjs [http://localhost:4173/]
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const BASE = process.argv[2] || 'http://localhost:4173/'
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname
const PAGES = [['now', '#/'], ['project', '#/p/api-service'], ['agents', '#/agents'], ['schedule', '#/timers'], ['activity', '#/activity'], ['wiring', '#/wiring/skill-review'], ['backlog', '#/backlog'], ['lab', '#/lab']]
const PHONE = ['now', 'project', 'agents', 'schedule']

const browser = await chromium.launch()
for (const [kind, viewport, only] of [['desktop', { width: 1440, height: 900 }, null], ['phone', { width: 400, height: 860 }, PHONE]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: kind === 'phone' ? 2 : 1, timezoneId: 'UTC', colorScheme: 'dark' })
  const page = await ctx.newPage()
  for (const [name, hash] of PAGES) {
    if (only && !only.includes(name)) continue
    await page.goto(BASE + hash)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}${name}-${kind}.png` })
    console.log(`${name}-${kind}.png`)
  }
  await ctx.close()
}
await browser.close()
