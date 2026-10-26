import type { ReactNode } from 'react'

// Calm placeholder for a page whose data has not arrived yet: icon, one short title, one plain line.
export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center">
    <div className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-zinc-400">{icon}</div>
    <div className="text-base font-medium text-zinc-200">{title}</div>
    {children && <div className="text-sm text-zinc-500">{children}</div>}
  </div>
}
