import { basename, formatBytes, formatCount, formatShape } from '../../lib/h5/format'
import { useFileStore } from '../../store/fileStore'
import { HoverTip, TipText } from '../common/HoverTip'
import { IconAttrs, IconDatabase, IconFile, IconGrid } from '../common/Icons'

/** Row 1 — file overview. Stays fixed while focusing entries. */
export function FileSummaryRow() {
  const overview = useFileStore((s) => s.overview)
  if (!overview) return null

  const largest = overview.largestDatasets[0]
  const rootPreview = overview.rootAttrs.map((a) => a.name).join(', ') || 'none'
  const largestTip = largest
    ? `${largest.path} · ${formatBytes(largest.nbytes)} · ${formatShape(largest.shape)}`
    : 'No datasets'

  return (
    <section className="row-card">
      <h2 className="row-title">File overview</h2>
      <div className="hero-cards">
        <div className="hero-card">
          <div className="hero-icon tone-blue">
            <IconFile size={28} />
          </div>
          <div className="hero-body">
            <div className="hero-label">File</div>
            <div className="hero-value">{formatBytes(overview.sizeBytes)}</div>
            <TipText
              className="hero-sub"
              text={`${overview.name} · ${overview.formatLabel}${
                overview.nwbVersion ? ` · nwb ${overview.nwbVersion}` : ''
              }`}
            />
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-icon tone-blue">
            <IconDatabase size={28} />
          </div>
          <div className="hero-body">
            <div className="hero-label">Datasets</div>
            <div className="hero-value">{formatCount(overview.datasetCount)}</div>
            <div className="hero-sub">Groups: {formatCount(overview.groupCount)}</div>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-icon tone-purple">
            <IconAttrs size={28} />
          </div>
          <div className="hero-body">
            <div className="hero-label">Root attributes</div>
            <div className="hero-value">{overview.rootAttrs.length}</div>
            <TipText className="hero-sub" text={rootPreview} />
          </div>
        </div>

        <HoverTip text={largestTip} always>
          <div className="hero-card">
            <div className="hero-icon tone-cyan">
              <IconGrid size={28} />
            </div>
            <div className="hero-body">
              <div className="hero-label">Largest dataset</div>
              <div className="hero-value hero-value-sm">
                {largest ? basename(largest.path) : '—'}
              </div>
              <div className="hero-sub">
                {largest
                  ? `${formatBytes(largest.nbytes)} · ${formatShape(largest.shape)}`
                  : 'No datasets'}
              </div>
            </div>
          </div>
        </HoverTip>
      </div>
    </section>
  )
}
