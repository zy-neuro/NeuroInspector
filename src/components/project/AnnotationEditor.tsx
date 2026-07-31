import { useProjectStore } from '../../store/projectStore'

/** Note field for the currently focused / selected path. */
export function AnnotationEditor({ path }: { path: string }) {
  const note = useProjectStore((s) => s.annotations[path]?.note ?? '')
  const selected = useProjectStore((s) => s.selectedPaths.has(path))
  const setAnnotationNote = useProjectStore((s) => s.setAnnotationNote)
  const setSelected = useProjectStore((s) => s.setSelected)

  return (
    <div className="annotation-editor">
      <label className="annotation-select">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => setSelected(path, e.target.checked)}
        />
        <span>Include in project subset</span>
      </label>
      <label className="annotation-note-label">
        <span>Note</span>
        <textarea
          className="annotation-note"
          rows={3}
          value={note}
          placeholder="Annotation for this path (saved in project JSON, not in the H5/NWB file)"
          onChange={(e) => setAnnotationNote(path, e.target.value)}
        />
      </label>
    </div>
  )
}
