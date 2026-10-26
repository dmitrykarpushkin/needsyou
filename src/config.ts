// Where the console reads its data from. Set at build time through Vite env variables (see .env.example and docs/DATA.md).
//   VITE_DATA_SOURCE  demo (default): the bundled synthetic files in public/demo, timestamps shifted so the demo always looks "live".
//                     http: real JSON files served by your backend under VITE_DATA_URL.
//   VITE_DATA_URL     base URL of the JSON files in http mode (default "./", next to the page).
//   VITE_LIVE_FEED    "1" to also listen to a Server-Sent Events feed at <VITE_DATA_URL>live/events (optional, http mode only).
//   VITE_TIME_ZONE    IANA time zone for clocks and schedules (default: the browser's; UTC in demo mode).
export type Source = 'demo' | 'http'
const env = import.meta.env
const source: Source = env.VITE_DATA_SOURCE === 'http' ? 'http' : 'demo'
const base = String(env.VITE_DATA_URL || './')

export const CONFIG = {
  source,
  baseUrl: source === 'demo' ? './demo/' : base.endsWith('/') ? base : base + '/',
  liveFeed: source === 'http' && env.VITE_LIVE_FEED === '1',
  // the demo schedules and journal are written in UTC, so the demo shows UTC unless a zone is set explicitly
  timeZone: String(env.VITE_TIME_ZONE || (source === 'demo' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC'),
}

// The moment the demo files were "written". In demo mode every timestamp in them is moved by (now - DEMO_ANCHOR),
// so "3 minutes ago" in the files stays "3 minutes ago" whenever you open the page.
export const DEMO_ANCHOR = Date.parse('2026-10-26T09:00:00Z')
