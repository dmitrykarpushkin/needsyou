// console.json: who the owner is and which projects the console shows. Loaded once by main.tsx before the app mounts,
// re-read every minute by the shell.
export type Project = { id: string; name: string; color: string; icon?: string; shared?: boolean; blocking?: boolean; repos?: string[]; links?: { name: string; url: string; about?: string }[] }
export type ConsoleData = { generated: string; owner: { login: string; name?: string }; projects: Project[] }

let current: ConsoleData = { generated: new Date().toISOString(), owner: { login: '' }, projects: [] }
export const setConsole = (d: ConsoleData) => { current = { ...d, projects: d.projects || [] } }
export const getConsole = () => current
export const projectOf = (id?: string): Project => current.projects.find(p => p.id === id) || { id: id || '—', name: id || '—', color: '#71717a', icon: '•' }
