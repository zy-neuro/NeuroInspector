import { useFileStore } from '../../store/fileStore'
import { DatasetVizContent } from './DatasetVizContent'
import {
  EmptyDatasetNotice,
  hasRenderableData,
  hasUsefulMeta,
} from './viz/vizMeta'

export function DatasetVizRow() {
  const stats = useFileStore((s) => s.datasetStats)
  const loading = useFileStore((s) => s.datasetLoading)
  const selectedPath = useFileStore((s) => s.selectedPath)
  const error = useFileStore((s) => s.datasetError)

  if (!selectedPath) return null

  if (loading) {
    return (
      <section className="row-card">
        <h2 className="row-title">Visualization</h2>
        <p className="muted">Preparing preview…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="row-card">
        <h2 className="row-title">Visualization</h2>
        <div className="error-box">{error}</div>
      </section>
    )
  }

  if (!stats) {
    return (
      <section className="row-card">
        <h2 className="row-title">Visualization</h2>
        <EmptyDatasetNotice reason="No preview is available for this selection yet." />
      </section>
    )
  }

  // Sparse leaf: only data view, skip heavy chrome
  const onlyData = hasRenderableData(stats) && !stats.attrs.length

  return (
    <section className="row-card">
      <h2 className="row-title">Visualization</h2>
      {stats.sliceNote ? <div className="viz-note">{stats.sliceNote}</div> : null}
      {!hasRenderableData(stats) && !hasUsefulMeta(stats) ? (
        <EmptyDatasetNotice reason="This child entry has no descriptive metadata and no readable data payload." />
      ) : (
        <DatasetVizContent stats={stats} density="full" compact={onlyData} />
      )}
    </section>
  )
}
