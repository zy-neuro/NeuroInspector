import { basename } from '../../lib/h5/format'
import { useFileStore } from '../../store/fileStore'
import { useProjectStore } from '../../store/projectStore'
import { TipText } from '../common/HoverTip'

/** Bottom summary: every selected path and every note, so nothing gets lost in the tree. */
export function ProjectSelectionPanel() {
  const selectedPaths = useProjectStore((s) => s.selectedPaths)
  const annotations = useProjectStore((s) => s.annotations)
  const setSelected = useProjectStore((s) => s.setSelected)
  const clearAnnotation = useProjectStore((s) => s.clearAnnotation)
  const highlightInTree = useFileStore((s) => s.highlightInTree)

  const notedPaths = Object.keys(annotations).filter(
    (p) => annotations[p]?.note.trim() || annotations[p]?.tags.length,
  )
  const paths = [...new Set([...selectedPaths, ...notedPaths])].sort()
  const noteCount = notedPaths.length

  return (
    <section className="project-selection-panel">
      <div className="project-selection-head">
        <h3 className="tree-fields-title" style={{ marginBottom: 0 }}>
          Project summary
        </h3>
        <span className="muted project-selection-count">
          {selectedPaths.size} selected · {noteCount} notes
        </span>
      </div>

      {paths.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No subset paths or notes yet. Check items in the tree, or add a note on an entry.
        </p>
      ) : (
        <ul className="project-selection-list">
          {paths.map((path) => {
            const selected = selectedPaths.has(path)
            const note = annotations[path]?.note?.trim() ?? ''
            return (
              <li key={path} className="project-selection-row">
                <input
                  type="checkbox"
                  checked={selected}
                  title="Include in project subset"
                  aria-label={`Toggle ${path} in project subset`}
                  onChange={(e) => setSelected(path, e.target.checked)}
                />
                <button
                  type="button"
                  className="project-selection-path"
                  onClick={() => highlightInTree(path)}
                  title="Show in File tree"
                >
                  <TipText className="project-selection-name" text={basename(path)} tip={path} />
                  <TipText className="project-selection-full mono" text={path} />
                  {note ? <span className="project-selection-note">{note}</span> : null}
                </button>
                {note ? (
                  <button
                    type="button"
                    className="project-selection-clear"
                    onClick={() => clearAnnotation(path)}
                    title="Clear note"
                  >
                    Clear note
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
