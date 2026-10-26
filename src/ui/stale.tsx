import { TriangleAlert } from 'lucide-react'
import { Badge } from './badge'
import { isStale, type Polled } from '../live'

// "Data is stale" badge: shown when the file's own age (Last-Modified) is over the limit, or when the file exists but cannot be read.
export function Stale({ p, what = 'Data' }: { p: Polled<any>; what?: string }) {
  if (p.broken) return <Badge tone="bad"><TriangleAlert size={12} />{what}: file is unreadable</Badge>
  if (!isStale(p)) return null
  return <Badge tone="warn"><TriangleAlert size={12} />{what} is stale: {Math.round((p.ageMs as number) / 6e4)} min</Badge>
}
