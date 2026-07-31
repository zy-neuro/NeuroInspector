import { basename, formatBytes, formatShape } from '../../lib/h5/format'
import { findTreeNode } from '../../lib/h5/walkTree'
import { BUNDLE_DATASET_LIMIT, useFileStore } from '../../store/fileStore'
import { TipText } from '../common/HoverTip'
import { DatasetVizContent } from './DatasetVizContent'
import { EmptyDatasetNotice } from './viz/vizMeta'

/** Combined view: every dataset under a Quick-tree group, stacked in one panel. */
export function GroupBundleView() {
  const overview = useFileStore((s) => s.overview)
  const groupPath = useFileStore((s) => s.bundleGroupPath)
  const paths = useFileStore((s) => s.bundlePaths)
  const truncated = useFileStore((s) => s.bundleTruncated)
  const previews = useFileStore((s) => s.bundlePreviews)
  const datasetError = useFileStore((s) => s.datasetError)
  const selectDataset = useFileStore((s) => s.selectDataset)

  if (!overview || !groupPath) return null

  const groupNode = findTreeNode(overview.tree, groupPath)
  const title = groupNode?.name === '/' ? 'root' : (groupNode?.name ?? basename(groupPath))

  return (
    <section className="largest-expanded">
      <div className="bundle-head">
        <div>
          <h2 className="row-title" style={{ marginBottom: 0 }}>
            Group view — {title}
          </h2>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            All datasets under <span className="mono">{groupPath}</span>, shown together.
            Right-click a Quick tree folder to open this view.
          </p>
        </div>
        <div className="full-tree-stats">
          <span>
            {paths.length} dataset{paths.length === 1 ? '' : 's'}
          </span>
          {truncated ? <span>showing first {BUNDLE_DATASET_LIMIT}</span> : null}
        </div>
      </div>

      {datasetError ? <div className="error-box">{datasetError}</div> : null}

      {!paths.length && !datasetError ? (
        <EmptyDatasetNotice reason="This group has no datasets underneath." />
      ) : (
        <div className="largest-expanded-list">
          {paths.map((path) => {
            const node = findTreeNode(overview.tree, path)
            const preview = previews[path]
            return (
              <article key={path} className="expanded-dataset">
                <header className="expanded-dataset-head">
                  <div className="expanded-dataset-titles">
                    <h3 className="expanded-dataset-name">
                      <TipText text={basename(path)} />
                    </h3>
                    <TipText className="expanded-dataset-path mono" text={path} />
                  </div>
                  <div className="expanded-dataset-meta">
                    {node?.nbytes != null ? <span>{formatBytes(node.nbytes)}</span> : null}
                    {node?.shape ? <span>{formatShape(node.shape)}</span> : null}
                    <button
                      type="button"
                      className="btn open-dataset-btn"
                      onClick={() => void selectDataset(path)}
                    >
                      Open alone
                    </button>
                  </div>
                </header>
                <div className="expanded-dataset-body">
                  {preview?.loading || !preview ? (
                    <p className="muted">Loading data view…</p>
                  ) : preview.error ? (
                    <div className="error-box">{preview.error}</div>
                  ) : preview.stats ? (
                    <>
                      {preview.stats.sliceNote ? (
                        <div className="viz-note">{preview.stats.sliceNote}</div>
                      ) : null}
                      <DatasetVizContent stats={preview.stats} density="overview" />
                    </>
                  ) : (
                    <EmptyDatasetNotice reason="No preview could be built for this dataset." />
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
