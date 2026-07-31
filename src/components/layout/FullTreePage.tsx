import { useState } from 'react'
import { findTreeNode } from '../../lib/h5/walkTree'
import { useFileStore } from '../../store/fileStore'
import { ProjectSelectionPanel } from '../project/ProjectSelectionPanel'
import { TreeFieldsPanel, TreeItem, type TreeExpandMode } from './TreeItem'

export function FullTreePage() {
  const overview = useFileStore((s) => s.overview)
  const selectedPath = useFileStore((s) => s.selectedPath)
  const [expandMode, setExpandMode] = useState<TreeExpandMode>('default')
  const [treeKey, setTreeKey] = useState(0)

  if (!overview) return null

  const selectedNode = selectedPath ? findTreeNode(overview.tree, selectedPath) : null

  const remount = (mode: TreeExpandMode) => {
    setExpandMode(mode)
    setTreeKey((k) => k + 1)
  }

  return (
    <section className="row-card full-tree-page">
      <div className="full-tree-head">
        <div>
          <h2 className="row-title" style={{ marginBottom: 0 }}>
            File tree
          </h2>
        </div>
        <div className="full-tree-actions">
          <div className="full-tree-stats">
            <span>{overview.groupCount} groups</span>
            <span>{overview.datasetCount} datasets</span>
            <span>{overview.formatLabel}</span>
          </div>
          <div className="full-tree-btns">
            <button type="button" className="btn" onClick={() => remount('all')}>
              Expand all
            </button>
            <button type="button" className="btn" onClick={() => remount('none')}>
              Collapse all
            </button>
          </div>
        </div>
      </div>
      <div className="full-tree-split">
        <div className="full-tree-body">
          <TreeItem
            key={treeKey}
            node={overview.tree}
            depth={0}
            dense
            allowNavigate={false}
            expandMode={expandMode}
            showProjectCheck
          />
        </div>
        <TreeFieldsPanel node={selectedNode} />
      </div>
      <ProjectSelectionPanel />
    </section>
  )
}
