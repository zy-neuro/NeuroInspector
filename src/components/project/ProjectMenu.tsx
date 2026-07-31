import { useRef } from 'react'
import { collectAllPaths, useProjectStore } from '../../store/projectStore'
import { useFileStore } from '../../store/fileStore'
import { MenuDropdown } from '../common/MenuDropdown'

export function ProjectMenu() {
  const overview = useFileStore((s) => s.overview)
  const openFile = useFileStore((s) => s.openFile)
  const exportProject = useProjectStore((s) => s.exportProject)
  const importProject = useProjectStore((s) => s.importProject)
  const selectedCount = useProjectStore((s) => s.selectedPaths.size)
  const annotationCount = useProjectStore((s) => Object.keys(s.annotations).length)
  const hashing = useProjectStore((s) => s.hashing)
  const projectInputRef = useRef<HTMLInputElement>(null)
  const originalInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <MenuDropdown label="Project ▾">
        {(close) => (
          <>
            <button
              type="button"
              disabled={!overview || hashing}
              onClick={() => {
                exportProject()
                close()
              }}
            >
              Export project JSON
              {selectedCount || annotationCount
                ? ` (${selectedCount} selected · ${annotationCount} notes)`
                : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                projectInputRef.current?.click()
                close()
              }}
            >
              Import project JSON
            </button>
            <button
              type="button"
              onClick={() => {
                originalInputRef.current?.click()
                close()
              }}
            >
              Connect original file…
            </button>
            <p className="save-menu-note">
              Project packs store selected paths and notes with a fingerprint of the source file.
              The H5/NWB bytes are never modified. Subset .h5 export comes later.
            </p>
          </>
        )}
      </MenuDropdown>
      <input
        ref={projectInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) {
            const paths = overview ? collectAllPaths(overview.tree) : undefined
            void importProject(f, paths)
          }
          e.target.value = ''
        }}
      />
      <input
        ref={originalInputRef}
        type="file"
        accept=".h5,.hdf5,.nwb,application/x-hdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void openFile(f)
          e.target.value = ''
        }}
      />
    </>
  )
}
