import { create } from 'zustand'
import { buildProjectPayload, readProjectFile, saveProjectJson } from '../lib/project/exportProject'
import { hashFileSha256 } from '../lib/project/hash'
import type {
  LinkStatus,
  NeuroInspectorProject,
  ProjectFileIdentity,
} from '../lib/project/types'
import { identitiesMatch } from '../lib/project/types'

export type AnnotationDraft = {
  note: string
  tags: string[]
  updatedAt: string
}

interface ProjectState {
  /** Identity of the currently open binary file (after hash). */
  openIdentity: ProjectFileIdentity | null
  hashing: boolean
  selectedPaths: Set<string>
  annotations: Record<string, AnnotationDraft>
  /** Source recorded in the loaded/exported project (often the original full file). */
  projectSource: ProjectFileIdentity | null
  /** True after importing a .neuroinspector.json pack (kept across file opens for reconnect). */
  hasImportedPack: boolean
  projectTitle: string
  projectDescription: string
  linkStatus: LinkStatus
  lastError: string | null
  /** Paths that exist in the project but not in the current file tree. */
  missingPaths: string[]

  bindOpenFile: (file: File) => Promise<void>
  clearForHome: () => void
  toggleSelected: (path: string) => void
  setSelected: (path: string, on: boolean) => void
  setAnnotationNote: (path: string, note: string) => void
  clearAnnotation: (path: string) => void
  exportProject: () => void
  importProject: (file: File, treePaths?: Set<string>) => Promise<void>
  /** Re-check link after user opens a candidate original file. */
  evaluateLink: (treePaths?: Set<string>) => void
}

function emptyState(): Omit<
  ProjectState,
  | 'bindOpenFile'
  | 'clearForHome'
  | 'toggleSelected'
  | 'setSelected'
  | 'setAnnotationNote'
  | 'clearAnnotation'
  | 'exportProject'
  | 'importProject'
  | 'evaluateLink'
> {
  return {
    openIdentity: null,
    hashing: false,
    selectedPaths: new Set(),
    annotations: {},
    projectSource: null,
    hasImportedPack: false,
    projectTitle: '',
    projectDescription: '',
    linkStatus: 'none',
    lastError: null,
    missingPaths: [],
  }
}

function applyProject(
  project: NeuroInspectorProject,
  openIdentity: ProjectFileIdentity | null,
  treePaths?: Set<string>,
) {
  const selectedPaths = new Set(project.selectedPaths)
  const annotations: Record<string, AnnotationDraft> = {}
  for (const a of project.annotations) {
    annotations[a.path] = {
      note: a.note,
      tags: a.tags,
      updatedAt: a.updatedAt,
    }
  }
  const missingPaths = treePaths
    ? [...selectedPaths, ...Object.keys(annotations)].filter((p) => !treePaths.has(p))
    : []
  const uniqueMissing = [...new Set(missingPaths)]

  let linkStatus: LinkStatus = 'pending'
  if (openIdentity) {
    linkStatus = identitiesMatch(openIdentity, project.sourceFile) ? 'matched' : 'mismatch'
  }

  return {
    selectedPaths,
    annotations,
    projectSource: project.sourceFile,
    hasImportedPack: true,
    projectTitle: project.title ?? '',
    projectDescription: project.description ?? '',
    linkStatus,
    missingPaths: uniqueMissing,
    lastError: null,
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...emptyState(),

  bindOpenFile: async (file: File) => {
    const keepPack = get().hasImportedPack
    set({
      hashing: true,
      lastError: null,
      openIdentity: null,
      ...(keepPack
        ? {}
        : {
            selectedPaths: new Set<string>(),
            annotations: {},
            projectTitle: '',
            projectDescription: '',
            projectSource: null,
            linkStatus: 'none' as LinkStatus,
            missingPaths: [],
          }),
    })
    try {
      const sha256 = await hashFileSha256(file)
      const openIdentity: ProjectFileIdentity = {
        name: file.name,
        sizeBytes: file.size,
        sha256,
      }
      if (keepPack && get().projectSource) {
        const linkStatus: LinkStatus = identitiesMatch(openIdentity, get().projectSource!)
          ? 'matched'
          : 'mismatch'
        set({ openIdentity, hashing: false, linkStatus })
        return
      }
      // Authoring a new project against this open file
      set({
        openIdentity,
        hashing: false,
        projectSource: openIdentity,
        linkStatus: 'matched',
        hasImportedPack: false,
      })
    } catch (err) {
      set({
        hashing: false,
        lastError: err instanceof Error ? err.message : String(err),
      })
    }
  },

  clearForHome: () => set(emptyState()),

  toggleSelected: (path) => {
    const next = new Set(get().selectedPaths)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    set({ selectedPaths: next })
  },

  setSelected: (path, on) => {
    const next = new Set(get().selectedPaths)
    if (on) next.add(path)
    else next.delete(path)
    set({ selectedPaths: next })
  },

  setAnnotationNote: (path, note) => {
    const prev = get().annotations[path]
    if (!note.trim() && !(prev?.tags.length)) {
      const next = { ...get().annotations }
      delete next[path]
      set({ annotations: next })
      return
    }
    set({
      annotations: {
        ...get().annotations,
        [path]: {
          note,
          tags: prev?.tags ?? [],
          updatedAt: new Date().toISOString(),
        },
      },
    })
  },

  clearAnnotation: (path) => {
    const next = { ...get().annotations }
    delete next[path]
    set({ annotations: next })
  },

  exportProject: () => {
    const {
      openIdentity,
      projectSource,
      selectedPaths,
      annotations,
      projectTitle,
      projectDescription,
    } = get()
    const source = projectSource ?? openIdentity
    if (!source) {
      set({ lastError: 'Open a file before exporting a project.' })
      return
    }
    const payload = buildProjectPayload({
      sourceFile: source,
      selectedPaths: [...selectedPaths],
      annotations,
      title: projectTitle || undefined,
      description: projectDescription || undefined,
    })
    saveProjectJson(payload)
    set({ lastError: null })
  },

  importProject: async (file, treePaths) => {
    try {
      const project = await readProjectFile(file)
      set(applyProject(project, get().openIdentity, treePaths))
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) })
    }
  },

  evaluateLink: (treePaths) => {
    const { openIdentity, projectSource, selectedPaths, annotations } = get()
    if (!projectSource) {
      set({ linkStatus: 'none', missingPaths: [] })
      return
    }
    if (!openIdentity) {
      set({ linkStatus: 'pending' })
      return
    }
    const missingPaths = treePaths
      ? [...selectedPaths, ...Object.keys(annotations)].filter((p) => !treePaths.has(p))
      : get().missingPaths
    set({
      linkStatus: identitiesMatch(openIdentity, projectSource) ? 'matched' : 'mismatch',
      missingPaths: [...new Set(missingPaths)],
    })
  },
}))

/** Collect every path in the tree for missing-path checks. */
export function collectAllPaths(node: {
  path: string
  children?: { path: string; children?: unknown[] }[]
}): Set<string> {
  const out = new Set<string>()
  const walk = (n: { path: string; children?: { path: string; children?: unknown[] }[] }) => {
    out.add(n.path)
    n.children?.forEach((c) => walk(c as typeof n))
  }
  walk(node)
  return out
}
