import { dtypeLooksNumeric } from './stats'
import type { DatasetStats, PreviewDecision, VizDensity } from './types'
import { TABLE_MAX_CELLS, TABLE_MAX_COLS, TABLE_MAX_ROWS } from './types'

/**
 * Shared gate: what view (if any) to show for a dataset.
 */
export function decidePreviewKind(
  stats: DatasetStats,
  density: VizDensity = 'full',
): PreviewDecision {
  if (stats.flags.includes('empty') || stats.totalElements === 0) {
    return { kind: 'none', reason: 'Preview not available: empty dataset' }
  }

  const nonNumeric =
    stats.flags.includes('string') ||
    stats.flags.includes('non_numeric') ||
    !dtypeLooksNumeric(stats.dtype)

  if (nonNumeric) {
    if (density === 'full' && stats.textPreview?.length) {
      return { kind: 'none', reason: undefined }
    }
    return { kind: 'none', reason: 'Preview not available: non-numeric dtype' }
  }

  if (stats.shape.length === 0 || stats.totalElements <= 1) {
    return {
      kind: 'none',
      reason: 'Preview not available: scalar value (shown in summary)',
    }
  }

  if (stats.flags.includes('all_nan') || stats.finite === 0) {
    return { kind: 'none', reason: 'Preview not available: no finite values to plot' }
  }

  if (!stats.values?.length) {
    return { kind: 'none', reason: 'Preview not available: no sampled values' }
  }

  const rank = stats.displayShape?.length ?? stats.shape.length
  if (rank <= 1) return { kind: 'series' }

  const [rows, cols] = stats.displayShape ?? [0, 0]
  const cells = rows * cols
  if (
    rows > 0 &&
    cols > 0 &&
    rows <= TABLE_MAX_ROWS &&
    cols <= TABLE_MAX_COLS &&
    cells <= TABLE_MAX_CELLS &&
    stats.values.length >= cells
  ) {
    return { kind: 'table' }
  }

  return { kind: 'heatmap' }
}
