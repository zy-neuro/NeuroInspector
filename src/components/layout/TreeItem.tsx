import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { formatBytes, formatShape } from '../../lib/h5/format'
import type { H5TreeNode } from '../../lib/h5/types'
import { useFileStore } from '../../store/fileStore'
import { useProjectStore } from '../../store/projectStore'
import { IconArray, IconFolder } from '../common/Icons'
import { TipText } from '../common/HoverTip'
import { AnnotationEditor } from '../project/AnnotationEditor'

type CtxMenu = { x: number; y: number; path: string; name: string }

export type TreeExpandMode = 'default' | 'all' | 'none'

function initialOpen(depth: number, dense: boolean, expandMode: TreeExpandMode) {
  if (expandMode === 'all') return true
  if (expandMode === 'none') return false
  return depth < (dense ? 3 : 1)
}

export function TreeItem({
  node,
  depth,
  dense = false,
  allowNavigate = true,
  expandMode = 'default',
  showProjectCheck = false,
  onGroupContextMenu,
}: {
  node: H5TreeNode
  depth: number
  dense?: boolean
  /** When false (File tree page), only expand/highlight — never leave the tree page. */
  allowNavigate?: boolean
  /** File tree Expand all / Collapse all (remount with key). */
  expandMode?: TreeExpandMode
  /** Project subset checkboxes — File tree only (not Quick tree). */
  showProjectCheck?: boolean
  onGroupContextMenu?: (e: ReactMouseEvent, node: H5TreeNode) => void
}) {
  const [open, setOpen] = useState(() => initialOpen(depth, dense, expandMode))
  const selectedPath = useFileStore((s) => s.selectedPath)
  const mode = useFileStore((s) => s.mode)
  const bundleGroupPath = useFileStore((s) => s.bundleGroupPath)
  const selectDataset = useFileStore((s) => s.selectDataset)
  const highlightInTree = useFileStore((s) => s.highlightInTree)
  const inProject = useProjectStore((s) => s.selectedPaths.has(node.path))
  const hasNote = useProjectStore((s) => {
    const a = s.annotations[node.path]
    return Boolean(a?.note.trim() || a?.tags.length)
  })
  const toggleSelected = useProjectStore((s) => s.toggleSelected)
  const isGroup = node.kind === 'group'
  const hasKids = isGroup && (node.children?.length ?? 0) > 0
  const active =
    selectedPath === node.path &&
    (mode === 'dataset' || mode === 'tree' || mode === 'bundle' || !allowNavigate)
  const bundleActive = mode === 'bundle' && bundleGroupPath === node.path

  return (
    <div className="tree-node">
      <div
        className={`tree-row ${active || bundleActive ? 'active' : ''} ${dense ? 'tree-row-dense' : ''} ${showProjectCheck && inProject ? 'in-project' : ''}`}
        style={{ paddingLeft: `${0.25 + depth * (dense ? 0.7 : 0.55)}rem` }}
      >
        {showProjectCheck ? (
          <input
            type="checkbox"
            className="tree-project-check"
            checked={inProject}
            title="Include in project subset"
            aria-label={`Include ${node.path} in project`}
            onChange={() => toggleSelected(node.path)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
        <button
          type="button"
          className="tree-row-main"
          title={node.path}
          onClick={() => {
            if (isGroup) {
              if (hasKids) setOpen((v) => !v)
              if (!allowNavigate) highlightInTree(node.path)
              return
            }
            if (allowNavigate) void selectDataset(node.path)
            else highlightInTree(node.path)
          }}
          onContextMenu={(e) => {
            if (!isGroup || !onGroupContextMenu) return
            e.preventDefault()
            onGroupContextMenu(e, node)
          }}
        >
          <span className="tree-twisty">
            {hasKids ? (open ? '▾' : '▸') : isGroup ? '·' : ''}
          </span>
          <span className="tree-kind-icon">
            {isGroup ? (
              <IconFolder size={dense ? 15 : 13} />
            ) : (
              <IconArray size={dense ? 15 : 13} />
            )}
          </span>
          <span className="tree-name">{node.name === '/' ? 'root' : node.name}</span>
          {showProjectCheck && hasNote ? (
            <span className="tree-note-dot" title="Has project note">
              ●
            </span>
          ) : null}
          {!isGroup && node.shape ? (
            <span className="tree-meta" title={formatShape(node.shape)}>
              {formatShape(node.shape)}
            </span>
          ) : node.dtype ? (
            <span className="tree-meta" title={node.dtype}>
              {node.dtype}
            </span>
          ) : node.kind === 'unknown' ? (
            <span className="tree-meta">link?</span>
          ) : null}
        </button>
      </div>
      {isGroup && open
        ? node.children?.map((child) => (
            <div key={child.path} className="tree-children">
              <TreeItem
                node={child}
                depth={depth + 1}
                dense={dense}
                allowNavigate={allowNavigate}
                expandMode={expandMode}
                showProjectCheck={showProjectCheck}
                onGroupContextMenu={onGroupContextMenu}
              />
            </div>
          ))
        : null}
    </div>
  )
}

/** Fields / attributes for the node selected in File tree (no charts). */
export function TreeFieldsPanel({ node }: { node: H5TreeNode | null }) {
  const selectDataset = useFileStore((s) => s.selectDataset)

  if (!node) {
    return (
      <div className="tree-fields-panel">
        <h3 className="tree-fields-title">Entry fields</h3>
        <p className="muted" style={{ margin: 0 }}>
          Select a group or dataset in the tree to inspect its fields here.
        </p>
      </div>
    )
  }

  const attrs = node.attrs ?? []
  const childCount = node.children?.length ?? 0

  return (
    <div className="tree-fields-panel">
      <div className="tree-fields-head">
        <h3 className="tree-fields-title">Entry fields</h3>
        {node.kind === 'dataset' ? (
          <button
            type="button"
            className="tree-fields-open-btn"
            onClick={() => void selectDataset(node.path)}
            title="Open sampled charts for this dataset"
          >
            Data view →
          </button>
        ) : null}
      </div>
      <TipText className="path-line mono tree-fields-path" text={node.path} />

      <div className="tree-fields-meta">
        <span className="badge">{node.kind}</span>
        {node.nwbType ? <span className="badge accent">{node.nwbType}</span> : null}
        {node.shape ? <span className="badge">{formatShape(node.shape)}</span> : null}
        {node.dtype ? <span className="badge mono-badge">{node.dtype}</span> : null}
        {node.nbytes != null && node.kind === 'dataset' ? (
          <span className="badge">{formatBytes(node.nbytes)}</span>
        ) : null}
        {node.compression ? <span className="badge">{node.compression}</span> : null}
        {node.kind === 'group' ? (
          <span className="badge">{childCount} children</span>
        ) : null}
      </div>

      {attrs.length === 0 ? (
        <p className="muted" style={{ margin: '0.75rem 0 0' }}>
          No attribute fields on this entry.
        </p>
      ) : (
        <div className="tree-fields-list">
          <div className="tree-fields-list-head">Attributes ({attrs.length})</div>
          {attrs.map((a) => (
            <div key={a.name} className="tree-field-row">
              <TipText className="tree-field-name" text={a.name} />
              <span className="tree-field-dtype" title={a.dtype}>
                {a.dtype}
              </span>
              <TipText
                className="tree-field-val"
                text={a.preview}
                tip={a.tip ? `${a.name} = ${a.tip}` : undefined}
              />
            </div>
          ))}
        </div>
      )}

      <AnnotationEditor path={node.path} />
    </div>
  )
}

export function GroupContextMenu({
  menu,
  onClose,
}: {
  menu: CtxMenu
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const openGroupBundle = useFileStore((s) => s.openGroupBundle)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const left = Math.min(menu.x, window.innerWidth - 220)
  const top = Math.min(menu.y, window.innerHeight - 80)

  return createPortal(
    <div
      ref={ref}
      className="tree-ctx-menu menu-portal"
      style={{ left, top }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          void openGroupBundle(menu.path)
          onClose()
        }}
      >
        Show all datasets together
      </button>
      <p className="tree-ctx-note">
        Open every dataset under <strong>{menu.name}</strong> in one combined view.
      </p>
    </div>,
    document.body,
  )
}

export type { CtxMenu }
