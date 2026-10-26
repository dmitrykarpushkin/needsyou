// shadcn/ui Badge with the tones the panel needs
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from './utils'
const badge = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', {
  variants: { tone: {
    neutral: 'bg-white/[.06] text-zinc-300', ok: 'bg-emerald-400/10 text-emerald-300', warn: 'bg-amber-400/10 text-amber-300',
    bad: 'bg-red-400/10 text-red-300', run: 'bg-indigo-400/15 text-indigo-300',
  } }, defaultVariants: { tone: 'neutral' },
})
export const Badge = ({ className, tone, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) => <span className={cn(badge({ tone }), className)} {...p} />
