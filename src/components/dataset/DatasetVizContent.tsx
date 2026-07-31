import { formatNumber } from '../../lib/h5/format'
import { decidePreviewKind } from '../../lib/h5/previewKind'
import { meanAcrossAxis1 } from '../../lib/h5/stats'
import type { DatasetStats, VizDensity } from '../../lib/h5/types'
import { HistogramChart, LineSeriesChart } from './viz/Charts'
import { Heatmap } from './viz/Heatmap'
import { EmptyDatasetNotice, hasUsefulMeta } from './viz/vizMeta'

function StatsAside({ stats }: { stats: DatasetStats }) {
  return (
    <div className="stat-list">
      <div>
        <span>Min</span>
        <span>{formatNumber(stats.min)}</span>
      </div>
      <div>
        <span>Max</span>
        <span>{formatNumber(stats.max)}</span>
      </div>
      <div>
        <span>Mean</span>
        <span>{formatNumber(stats.mean)}</span>
      </div>
      <div>
        <span>Std</span>
        <span>{formatNumber(stats.std)}</span>
      </div>
      <div>
        <span>Finite</span>
        <span>{stats.finite}</span>
      </div>
      <div>
        <span>NaN</span>
        <span>{stats.nan}</span>
      </div>
    </div>
  )
}

function MatrixTable({
  values,
  rows,
  cols,
}: {
  values: number[]
  rows: number
  cols: number
}) {
  return (
    <div className="matrix-table-wrap">
      <table className="matrix-table">
        <thead>
          <tr>
            <th scope="col" className="matrix-corner" />
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              <th scope="row">{r}</th>
              {Array.from({ length: cols }, (_, c) => {
                const v = values[r * cols + c]
                return (
                  <td key={c} title={String(v)}>
                    {formatNumber(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Pure visualization body driven by stats + shared preview gate. */
export function DatasetVizContent({
  stats,
  density = 'full',
  compact = false,
}: {
  stats: DatasetStats
  density?: VizDensity
  /** @deprecated prefer density; still skips StatsAside when true */
  compact?: boolean
}) {
  const decision = decidePreviewKind(stats, density)
  const hideAside = compact || density === 'overview'

  if (density === 'full' && decision.kind === 'none' && stats.textPreview?.length) {
    return (
      <div className="viz-panel">
        <h3>Text preview</h3>
        <pre className="text-preview">{stats.textPreview.join('\n')}</pre>
      </div>
    )
  }

  if (decision.kind === 'none') {
    return (
      <EmptyDatasetNotice
        reason={
          decision.reason ??
          (hasUsefulMeta(stats)
            ? 'No chart preview for this entry. Metadata is available in the summary above.'
            : 'This node has no readable values and almost no metadata.')
        }
      />
    )
  }

  const values = stats.values
  if (!values?.length) {
    return <EmptyDatasetNotice reason="Preview not available: no sampled values" />
  }

  if (decision.kind === 'series') {
    return (
      <div className="viz-grid">
        <div className="viz-panel">
          <h3>Series</h3>
          <LineSeriesChart values={values} label="value" />
        </div>
        <div className="viz-panel">
          <h3>Distribution</h3>
          {stats.histogram ? (
            <HistogramChart bins={stats.histogram.bins} counts={stats.histogram.counts} />
          ) : null}
          {!hideAside ? (
            <div style={{ marginTop: '0.75rem' }}>
              <StatsAside stats={stats} />
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const [rows, cols] = stats.displayShape ?? [0, 0]

  if (decision.kind === 'table' && rows > 0 && cols > 0) {
    return (
      <div className="viz-grid">
        <div className="viz-panel viz-panel-wide">
          <h3>
            Table ({rows}×{cols})
          </h3>
          <MatrixTable values={values} rows={rows} cols={cols} />
        </div>
        {!hideAside ? (
          <div className="viz-panel">
            <h3>Summary</h3>
            <StatsAside stats={stats} />
          </div>
        ) : null}
      </div>
    )
  }

  // heatmap (Dataset view). Overview: series of row means to avoid sparse heatmaps.
  if (density === 'overview') {
    const means =
      rows > 0 && cols > 0 && values.length >= rows * cols
        ? meanAcrossAxis1(values, rows, cols)
        : values
    return (
      <div className="viz-grid">
        <div className="viz-panel">
          <h3>{means !== values ? 'Row means' : 'Series (flattened plane)'}</h3>
          <LineSeriesChart values={means} label={means !== values ? 'mean' : 'value'} />
        </div>
        <div className="viz-panel">
          <h3>Distribution</h3>
          {stats.histogram ? (
            <HistogramChart bins={stats.histogram.bins} counts={stats.histogram.counts} />
          ) : null}
        </div>
      </div>
    )
  }

  const means =
    rows > 0 && cols > 0 && values.length >= rows * cols
      ? meanAcrossAxis1(values, rows, cols)
      : []

  return (
    <div className="viz-grid">
      <div className="viz-panel">
        <h3>Heatmap preview</h3>
        {rows > 0 && cols > 0 ? (
          <Heatmap values={values} rows={rows} cols={cols} />
        ) : (
          <p className="muted">Could not build 2D preview.</p>
        )}
      </div>
      <div className="viz-panel">
        <h3>{means.length ? 'Row means' : 'Summary'}</h3>
        {means.length ? <LineSeriesChart values={means} label="mean" /> : null}
        {stats.histogram ? (
          <div style={{ marginTop: means.length ? '0.75rem' : 0 }}>
            {means.length ? (
              <h3 style={{ marginTop: '0.5rem' }}>Distribution</h3>
            ) : null}
            <HistogramChart bins={stats.histogram.bins} counts={stats.histogram.counts} />
          </div>
        ) : null}
        {!hideAside ? (
          <div style={{ marginTop: '0.75rem' }}>
            <StatsAside stats={stats} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
