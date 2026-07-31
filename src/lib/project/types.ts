/** NeuroInspector project pack — annotations + lineage, never mutates the H5/NWB bytes. */

export const PROJECT_FORMAT = 'neuroinspector-project/v1' as const

export type ProjectFileIdentity = {
  name: string
  sizeBytes: number
  sha256: string
}

export type PathAnnotation = {
  path: string
  note: string
  tags: string[]
  updatedAt: string
}

export type NeuroInspectorProject = {
  format: typeof PROJECT_FORMAT
  exportedAt: string
  title?: string
  description?: string
  /** File this project was authored against (usually the full original). */
  sourceFile: ProjectFileIdentity
  /** Paths the user marked for the analysis subset. */
  selectedPaths: string[]
  annotations: PathAnnotation[]
}

export type LinkStatus = 'none' | 'matched' | 'mismatch' | 'pending'

export function isProjectPayload(value: unknown): value is NeuroInspectorProject {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.format !== PROJECT_FORMAT) return false
  if (!v.sourceFile || typeof v.sourceFile !== 'object') return false
  const src = v.sourceFile as Record<string, unknown>
  if (typeof src.name !== 'string' || typeof src.sizeBytes !== 'number' || typeof src.sha256 !== 'string') {
    return false
  }
  if (!Array.isArray(v.selectedPaths) || !Array.isArray(v.annotations)) return false
  return true
}

export function identitiesMatch(a: ProjectFileIdentity, b: ProjectFileIdentity): boolean {
  return a.sha256 === b.sha256 && a.sizeBytes === b.sizeBytes
}
