import type { DatasetStats } from '../../../lib/h5/types'

export function hasRenderableData(stats: DatasetStats): boolean {
  if (stats.textPreview?.length) return true
  if (stats.values && stats.values.length > 0) return true
  return false
}

export function hasUsefulMeta(stats: DatasetStats): boolean {
  return (
    stats.attrs.length > 0 ||
    stats.shape.length > 0 ||
    Boolean(stats.dtype && stats.dtype !== '?') ||
    stats.totalElements > 0
  )
}

export function EmptyDatasetNotice({ reason }: { reason: string }) {
  return (
    <div className="empty-dataset-notice">
      <strong>Nothing to display</strong>
      <p>{reason}</p>
    </div>
  )
}
