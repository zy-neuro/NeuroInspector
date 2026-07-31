import type { NeuroInspectorProject, ProjectFileIdentity } from './types'
import { PROJECT_FORMAT, isProjectPayload } from './types'

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildProjectPayload(args: {
  sourceFile: ProjectFileIdentity
  selectedPaths: string[]
  annotations: Record<string, { note: string; tags: string[]; updatedAt: string }>
  title?: string
  description?: string
}): NeuroInspectorProject {
  const annotations = Object.entries(args.annotations)
    .filter(([, a]) => a.note.trim() || a.tags.length)
    .map(([path, a]) => ({
      path,
      note: a.note,
      tags: a.tags,
      updatedAt: a.updatedAt,
    }))
    .sort((a, b) => a.path.localeCompare(b.path))

  return {
    format: PROJECT_FORMAT,
    exportedAt: new Date().toISOString(),
    title: args.title,
    description: args.description,
    sourceFile: args.sourceFile,
    selectedPaths: [...args.selectedPaths].sort(),
    annotations,
  }
}

export function saveProjectJson(project: NeuroInspectorProject) {
  const base = project.sourceFile.name.replace(/\.(nwb|h5|hdf5)$/i, '')
  downloadBlob(
    `${base}.neuroinspector.json`,
    new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
  )
}

export async function readProjectFile(file: File): Promise<NeuroInspectorProject> {
  const text = await file.text()
  const data = JSON.parse(text) as unknown
  if (!isProjectPayload(data)) {
    throw new Error('Not a NeuroInspector project file (expected neuroinspector-project/v1).')
  }
  return data
}
