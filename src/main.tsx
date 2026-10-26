import { createRoot } from 'react-dom/client'
import './index.css'
import { fetchJson } from './data'
import { setConsole, type ConsoleData } from './store'

// console.json (owner and projects) is loaded first; every page then polls its own files.
fetchJson<ConsoleData>('console.json')
  .then(async data => {
    setConsole(data)
    const { default: App } = await import('./App')
    createRoot(document.getElementById('root')!).render(<App />)
  })
  .catch(e => { document.getElementById('root')!.innerHTML = `<div style="padding:40px;font:14px system-ui;color:#a1a1aa">Could not load the data (${String(e.message).replace(/</g, '&lt;')}). Try again in a minute.</div>` })

// Makes the page installable as an app (dock on desktop, home screen on a phone); the worker caches nothing.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { /* not installable here, the page works anyway */ })
