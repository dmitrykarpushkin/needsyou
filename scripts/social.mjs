// Renders docs/social-preview.png (1280x640, the GitHub social preview) from docs/screenshots/now-desktop.png.
// Needs Playwright with Chromium (not a project dependency). Usage: node scripts/social.mjs
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const docs = new URL('../docs/', import.meta.url).pathname
const shot = readFileSync(`${docs}screenshots/now-desktop.png`).toString('base64')
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; width: 1280px; height: 640px; overflow: hidden; background: #0a0a0c; color: #f4f4f5;
         font-family: Inter, "Helvetica Neue", Arial, sans-serif; position: relative; }
  .glow { position: absolute; inset: 0; background: radial-gradient(900px 500px at 0% 0%, rgba(139,92,246,.22), transparent 60%); }
  .text { position: absolute; left: 72px; top: 92px; width: 470px; }
  .logo { display: flex; align-items: center; gap: 16px; margin-bottom: 40px; }
  .mark { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg,#8b5cf6,#d946ef);
          display: grid; place-items: center; font-weight: 700; font-size: 30px; color: #fff; }
  .name { font-size: 44px; font-weight: 700; letter-spacing: -0.5px; }
  h1 { font-size: 40px; line-height: 1.18; font-weight: 650; margin: 0 0 24px; letter-spacing: -0.4px; }
  p { font-size: 22px; line-height: 1.45; color: #a1a1aa; margin: 0; }
  .shot { position: absolute; left: 600px; top: 70px; width: 900px; border-radius: 14px; overflow: hidden;
          border: 1px solid rgba(255,255,255,.12); box-shadow: 0 30px 80px rgba(0,0,0,.6); }
  .shot img { display: block; width: 900px; }
</style></head><body><div class="glow"></div>
  <div class="text">
    <div class="logo"><div class="mark">N</div><div class="name">needsyou</div></div>
    <h1>What your AI agents need from you, ranked by what waiting costs.</h1>
    <p>One read-only page across PRs, sessions, schedules and services. Plain JSON in, plain sentences out.</p>
  </div>
  <div class="shot"><img src="data:image/png;base64,${shot}"></div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 640 } })
await page.setContent(html)
await page.screenshot({ path: `${docs}social-preview.png` })
await browser.close()
console.log('docs/social-preview.png')
