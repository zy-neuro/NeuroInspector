import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { basename, formatBytes, formatCount, formatNumber, formatShape } from '../../lib/h5/format'
import { findTreeNode } from '../../lib/h5/walkTree'
import { useFileStore } from '../../store/fileStore'
import { Flags } from '../common/Flags'
import { TipText } from '../common/HoverTip'
import {
  EmptyDatasetNotice,
  hasRenderableData,
  hasUsefulMeta,
} from './viz/vizMeta'

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-item">
      <span className="k">{label}</span>
      <TipText className="v" text={value} />
    </div>
  )
}

const MIN_H = 120
const MAX_H = 720
const DEFAULT_H = 220

/** Row 2: focused entry summary. Resizable; does not replace file overview. */
export function DatasetInfoRow() {
  const mode = useFileStore((s) => s.mode)
  const overview = useFileStore((s) => s.overview)
  const selectedPath = useFileStore((s) => s.selectedPath)
  const stats = useFileStore((s) => s.datasetStats)
  const loading = useFileStore((s) => s.datasetLoading)
  const error = useFileStore((s) => s.datasetError)
  const focusOverviewPath = useFileStore((s) => s.focusOverviewPath)
  const [height, setHeight] = useState(DEFAULT_H)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  const onResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault()
      dragRef.current = { startY: e.clientY, startH: height }
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const next = dragRef.current.startH + (ev.clientY - dragRef.current.startY)
        setHeight(Math.min(MAX_H, Math.max(MIN_H, next)))
      }
      const onUp = () => {
        dragRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [height],
  )

  useEffect(() => {
    setHeight(DEFAULT_H)
  }, [selectedPath])

  if (!selectedPath) return null

  const largest = overview?.focusCandidates ?? overview?.largestDatasets ?? []
  const focusOptions = (() => {
    const paths = largest.map((d) => d.path)
    if (!paths.includes(selectedPath)) paths.unshift(selectedPath)
    return paths
  })()

  const readyStats = stats && stats.path === selectedPath ? stats : null
  const showAttrs = Boolean(readyStats && readyStats.attrs.length > 0)
  const sparse = Boolean(
    readyStats &&
      hasRenderableData(readyStats) &&
      !readyStats.attrs.length &&
      readyStats.totalElements <= 1,
  )
  const selectedKind = overview ? findTreeNode(overview.tree, selectedPath)?.kind : null

  return (
    <section className="row-card entry-summary">
      <div className="entry-summary-chrome">
        <h2 className="row-title" style={{ marginBottom: 0 }}>
          {mode === 'overview' ? 'Focused entry' : 'Selected dataset'}
        </h2>
        <span className="entry-summary-hint">Drag bottom edge to resize</span>
      </div>

      <div className="entry-summary-body" style={{ height }}>
        {mode === 'overview' && focusOptions.length > 0 ? (
          <label className="focus-select-wrap">
            <span className="focus-select-label">Showing</span>
            <select
              className="focus-select"
              value={selectedPath}
              onChange={(e) => focusOverviewPath(e.target.value)}
              title="Choose which entry’s summary and charts are shown below"
            >
              {focusOptions.map((path) => {
                const hit = largest.find((d) => d.path === path)
                const label = hit
                  ? `${basename(path)} · ${formatBytes(hit.nbytes)} · ${formatShape(hit.shape)}`
                  : path
                return (
                  <option key={path} value={path}>
                    {label}
                  </option>
                )
              })}
            </select>
          </label>
        ) : (
          <TipText className="path-line mono" text={selectedPath} />
        )}

        {mode === 'overview' ? (
          <TipText className="path-line mono focus-path-sub" text={selectedPath} />
        ) : null}

        {selectedKind === 'group' ? (
          <p className="muted" style={{ margin: 0 }}>
            This path is a group. Pick a dataset in Quick tree, or use the dropdown above.
          </p>
        ) : null}

        {loading && !readyStats ? <p className="muted">Loading summary…</p> : null}
        {error && !readyStats ? <div className="error-box">{error}</div> : null}
        {readyStats && sparse ? (
          <p className="muted" style={{ margin: 0 }}>
            Sparse entry — data view only.
          </p>
        ) : null}
        {readyStats && !sparse ? (
          <>
            <div className="meta-strip">
              <MetaItem label="Shape" value={formatShape(readyStats.shape)} />
              <MetaItem label="Dtype" value={readyStats.dtype} />
              <MetaItem label="Size" value={formatBytes(readyStats.nbytes)} />
              <MetaItem label="Compression" value={readyStats.compression ?? 'none'} />
              <MetaItem
                label="Elements"
                value={`${formatCount(readyStats.sampleCount)}${
                  readyStats.sampled ? ` / ${formatCount(readyStats.totalElements)}` : ''
                }`}
              />
              <MetaItem
                label="Min / Max"
                value={`${formatNumber(readyStats.min)} · ${formatNumber(readyStats.max)}`}
              />
              <MetaItem
                label="Mean / Std"
                value={`${formatNumber(readyStats.mean)} · ${formatNumber(readyStats.std)}`}
              />
              <MetaItem
                label="NaN / Inf"
                value={`${readyStats.nan} / ${readyStats.posInf + readyStats.negInf}`}
              />
            </div>
            <Flags flags={readyStats.flags} />
            {showAttrs ? (
              <div className="attr-list">
                {readyStats.attrs.map((a) => (
                  <div key={a.name} className="attr-row">
                    <TipText className="name" text={a.name} />
                    <TipText
                      className="attr-val"
                      text={a.preview}
                      tip={a.tip ? `${a.name} = ${a.tip}` : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
        {!loading && !error && !readyStats && selectedKind !== 'group' ? (
          <EmptyDatasetNotice reason="Summary is not ready for this entry." />
        ) : null}
        {!loading &&
        readyStats &&
        !hasRenderableData(readyStats) &&
        !hasUsefulMeta(readyStats) ? (
          <EmptyDatasetNotice reason="This child entry has no descriptive fields and no readable values." />
        ) : null}
      </div>

      <div
        className="entry-resize-handle"
        onMouseDown={onResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize focused entry panel"
        title="Drag to resize"
      />
    </section>
  )
}
