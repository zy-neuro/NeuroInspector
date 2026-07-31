import type { DatasetFlag } from '../../lib/h5/types'
import { flagLabel } from '../../lib/h5/types'

const tone: Record<DatasetFlag, 'danger' | 'warn' | 'accent' | 'good'> = {
  has_nan: 'danger',
  has_inf: 'danger',
  all_nan: 'danger',
  constant: 'warn',
  constant_dim: 'warn',
  empty: 'warn',
  large: 'accent',
  sampled: 'accent',
  string: 'good',
  non_numeric: 'good',
}

export function Flags({ flags }: { flags: DatasetFlag[] }) {
  if (!flags.length) return null
  return (
    <div className="flags">
      {flags.map((f) => (
        <span key={f} className={`badge ${tone[f]}`}>
          {flagLabel(f)}
        </span>
      ))}
    </div>
  )
}
