import { useProjectStore } from '../../store/projectStore'

export function ProjectBanner() {
  const linkStatus = useProjectStore((s) => s.linkStatus)
  const projectSource = useProjectStore((s) => s.projectSource)
  const openIdentity = useProjectStore((s) => s.openIdentity)
  const hashing = useProjectStore((s) => s.hashing)
  const selectedCount = useProjectStore((s) => s.selectedPaths.size)
  const annotations = useProjectStore((s) => s.annotations)
  const missingPaths = useProjectStore((s) => s.missingPaths)
  const lastError = useProjectStore((s) => s.lastError)
  const hasImportedPack = useProjectStore((s) => s.hasImportedPack)

  const annotationCount = Object.values(annotations).filter(
    (a) => a.note.trim() || a.tags.length,
  ).length

  if (lastError) {
    return <div className="project-banner project-banner-error">{lastError}</div>
  }

  if (hashing) {
    return (
      <div className="project-banner project-banner-muted">
        Fingerprinting open file for project linking…
      </div>
    )
  }

  if (!projectSource && !hasImportedPack) return null

  const quiet =
    linkStatus === 'matched' &&
    !hasImportedPack &&
    selectedCount === 0 &&
    annotationCount === 0 &&
    missingPaths.length === 0
  if (quiet) return null

  if (linkStatus === 'matched') {
    return (
      <div className="project-banner project-banner-ok">
        Linked to <strong>{projectSource?.name}</strong>
        {openIdentity && openIdentity.name !== projectSource?.name
          ? ` (open: ${openIdentity.name})`
          : null}
        {' · '}
        {selectedCount} selected · {annotationCount} notes
        {missingPaths.length ? ` · ${missingPaths.length} paths missing in this file` : ''}
      </div>
    )
  }

  if (linkStatus === 'mismatch') {
    return (
      <div className="project-banner project-banner-warn">
        Project source is <strong>{projectSource?.name}</strong>, but the open file does not match.
        Use <em>Project → Connect original file</em> to attach the full source, or keep working with
        notes as an overlay.
        {missingPaths.length
          ? ` ${missingPaths.length} selected/annotated paths are absent here.`
          : ''}
      </div>
    )
  }

  if (linkStatus === 'pending' && hasImportedPack) {
    return (
      <div className="project-banner project-banner-muted">
        Project loaded for <strong>{projectSource?.name}</strong>. Open or connect that file to
        verify the link.
      </div>
    )
  }

  return null
}
