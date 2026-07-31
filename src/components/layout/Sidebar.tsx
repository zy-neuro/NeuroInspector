import { useState } from 'react'
import { basename } from '../../lib/h5/format'
import { useFileStore } from '../../store/fileStore'
import { useProjectStore } from '../../store/projectStore'
import { IconOverview } from '../common/Icons'
import { GroupContextMenu, TreeItem, type CtxMenu } from './TreeItem'

function IconTree({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M6 3v6" />
      <path d="M18 9v6" />
      <path d="M6 9h12" />
      <circle cx="6" cy="3" r="2" />
      <circle cx="18" cy="9" r="2" />
      <circle cx="6" cy="15" r="2" />
      <circle cx="18" cy="21" r="2" />
      <path d="M18 15v6" />
    </svg>
  )
}

export function Sidebar() {
  const overview = useFileStore((s) => s.overview)
  const mode = useFileStore((s) => s.mode)
  const clearSelection = useFileStore((s) => s.clearSelection)
  const setMode = useFileStore((s) => s.setMode)
  const projectSelected = useProjectStore((s) => s.selectedPaths.size)
  const projectNotes = useProjectStore((s) =>
    Object.values(s.annotations).filter((a) => a.note.trim() || a.tags.length).length,
  )
  const [ctx, setCtx] = useState<CtxMenu | null>(null)

  if (!overview) return null

  return (
    <aside className="sidebar">
      <div className="side-header">
        <div className="side-header-title">Navigation</div>
        <div className="side-header-sub" title={overview.name}>
          {basename(overview.name)}
        </div>
      </div>

      <div className="side-nav">
        <button
          type="button"
          className={`side-nav-btn ${mode === 'overview' ? 'active' : ''}`}
          onClick={() => clearSelection()}
        >
          <IconOverview size={16} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          className={`side-nav-btn ${mode === 'tree' ? 'active' : ''}`}
          onClick={() => setMode('tree')}
          title="Full-page file tree — faithful hierarchy of the original file"
        >
          <IconTree size={16} />
          <span>File tree</span>
        </button>
      </div>

      {mode !== 'tree' ? (
        <>
          <div className="side-tree-label">Quick tree</div>
          <p className="side-tree-hint">
            Right-click a folder to show all its datasets in one view.
          </p>
          <div className="tree-wrap">
            <TreeItem
              node={overview.tree}
              depth={0}
              allowNavigate
              onGroupContextMenu={(e, n) =>
                setCtx({
                  x: e.clientX,
                  y: e.clientY,
                  path: n.path,
                  name: n.name === '/' ? 'root' : n.name,
                })
              }
            />
          </div>
          {ctx ? <GroupContextMenu menu={ctx} onClose={() => setCtx(null)} /> : null}
        </>
      ) : (
        <div className="side-tree-note">
          Full tree is on the right: check paths for the project subset while inspecting fields.
          Quick tree (Overview) is for navigation only — no project checkboxes.
        </div>
      )}

      <div className="side-summary">
        <div>
          Groups: <strong>{overview.groupCount}</strong>
        </div>
        <div>
          Datasets: <strong>{overview.datasetCount}</strong>
        </div>
        <div title={overview.formatLabel}>
          Format: <strong>{overview.formatLabel}</strong>
        </div>
        <div title="Paths marked for the project subset / notes">
          Project: <strong>{projectSelected}</strong> sel · <strong>{projectNotes}</strong> notes
        </div>
      </div>
    </aside>
  )
}
