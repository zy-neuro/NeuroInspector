import { basename, formatBytes, formatShape } from '../../lib/h5/format'
import { useFileStore } from '../../store/fileStore'
import { TipText } from '../common/HoverTip'
import { DatasetVizContent } from '../dataset/DatasetVizContent'
import { EmptyDatasetNotice } from '../dataset/viz/vizMeta'

/** Overview: lightweight preview for the currently focused entry. */
export function FocusedDataView() {
  const overview = useFileStore((s) => s.overview)
  const selectedPath = useFileStore((s) => s.selectedPath)
  const stats = useFileStore((s) => s.datasetStats)
  const loading = useFileStore((s) => s.datasetLoading)
  const error = useFileStore((s) => s.datasetError)
  const selectDataset = useFileStore((s) => s.selectDataset)
  const focusOverviewPath = useFileStore((s) => s.focusOverviewPath)

  if (!overview) return null

  if (!overview.focusCandidates.length && !overview.largestDatasets.length) {
    return (
      <section className="row-card">
        <h2 className="row-title">Focused data view</h2>
        <EmptyDatasetNotice reason="This file has no datasets to preview." />
      </section>
    )
  }

  if (!selectedPath) return null

  const candidates = overview.focusCandidates.length
    ? overview.focusCandidates
    : overview.largestDatasets
  const listed = candidates.find((d) => d.path === selectedPath)
  const readyStats = stats && stats.path === selectedPath ? stats : null

  return (
    <section className="largest-expanded">
      <div className="focused-view-head">
        <h2 className="row-title" style={{ marginBottom: 0 }}>
          Focused data view
        </h2>
        <p className="muted focused-view-note">
          Lightweight preview of the Focused entry above. Open dataset view for full sampling.
          File tree shows structure and fields only.
        </p>
      </div>

      {candidates.length > 1 ? (
        <div className="focus-chip-row" role="tablist" aria-label="Focus candidates">
          {candidates.map((d) => (
            <button
              key={d.path}
              type="button"
              role="tab"
              aria-selected={selectedPath === d.path}
              className={`focus-chip ${selectedPath === d.path ? 'active' : ''}`}
              title={d.path}
              onClick={() => focusOverviewPath(d.path)}
            >
              {basename(d.path)}
            </button>
          ))}
        </div>
      ) : null}

      <article className="expanded-dataset active">
        <header className="expanded-dataset-head">
          <div className="expanded-dataset-titles">
            <h3 className="expanded-dataset-name">
              <TipText text={basename(selectedPath)} />
            </h3>
            <TipText className="expanded-dataset-path mono" text={selectedPath} />
          </div>
          <div className="expanded-dataset-meta">
            {listed ? (
              <>
                <span>{formatBytes(listed.nbytes)}</span>
                <span>{formatShape(listed.shape)}</span>
              </>
            ) : null}
            <button
              type="button"
              className="btn open-dataset-btn"
              onClick={() => void selectDataset(selectedPath)}
            >
              Open dataset view
            </button>
          </div>
        </header>

        <div className="expanded-dataset-body">
          {loading && !readyStats ? (
            <p className="muted">Loading data view…</p>
          ) : error && !readyStats ? (
            <div className="error-box">{error}</div>
          ) : readyStats ? (
            <>
              {readyStats.sliceNote ? (
                <div className="viz-note">{readyStats.sliceNote}</div>
              ) : null}
              <DatasetVizContent stats={readyStats} density="overview" />
            </>
          ) : (
            <EmptyDatasetNotice reason="No preview could be built for this dataset." />
          )}
        </div>
      </article>
    </section>
  )
}
