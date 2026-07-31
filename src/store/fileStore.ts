import { create } from 'zustand'
import { openLocalFile, getOpenFile, closeOpenFile } from '../lib/h5/openFile'
import { analyzeDatasetPath } from '../lib/h5/readDataset'
import type { DatasetStats, FileOverview, H5TreeNode, SampleBudget } from '../lib/h5/types'
import {
  buildOverview,
  collectDatasetsUnder,
  findTreeNode,
} from '../lib/h5/walkTree'
import { collectAllPaths, useProjectStore } from './projectStore'

export type AppMode = 'overview' | 'dataset' | 'tree' | 'bundle'
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export type PreviewEntry = {
  stats: DatasetStats | null
  loading: boolean
  error: string | null
}

/** Soft cap so one group click does not freeze the UI on huge folders. */
export const BUNDLE_DATASET_LIMIT = 24

interface FileState {
  status: LoadStatus
  error: string | null
  mode: AppMode
  overview: FileOverview | null
  selectedPath: string | null
  datasetStats: DatasetStats | null
  datasetLoading: boolean
  datasetError: string | null
  /** Expanded largest-dataset previews on Overview (overview sample budget) */
  largestPreviews: Record<string, PreviewEntry>
  /** Group path whose descendant datasets are shown together */
  bundleGroupPath: string | null
  bundlePaths: string[]
  bundleTruncated: boolean
  bundlePreviews: Record<string, PreviewEntry>

  openFile: (file: File) => Promise<void>
  setMode: (mode: AppMode) => void
  focusOverviewPath: (path: string) => void
  selectDataset: (path: string) => Promise<void>
  /** Show all datasets under a group path in one combined view. */
  openGroupBundle: (groupPath: string) => Promise<void>
  clearSelection: () => void
  /** Highlight a path in tree view without leaving File tree page. */
  highlightInTree: (path: string) => void
  /** Return to landing page and close the current file. */
  resetToHome: () => void
}

async function loadStats(path: string, budget: SampleBudget) {
  const { overview } = useFileStore.getState()
  const h5 = getOpenFile()
  if (!overview || !h5) throw new Error('No file open')
  return analyzeDatasetPath(h5, path, overview.tree, budget)
}

async function loadLargestPreviews() {
  const overview = useFileStore.getState().overview
  if (!overview) return
  const paths = (
    overview.focusCandidates.length ? overview.focusCandidates : overview.largestDatasets
  ).map((d) => d.path)
  useFileStore.setState({
    largestPreviews: Object.fromEntries(
      paths.map((p) => [p, { stats: null, loading: true, error: null }]),
    ),
  })

  await Promise.all(
    paths.map(async (path) => {
      try {
        const stats = await loadStats(path, 'overview')
        const current = useFileStore.getState().largestPreviews
        useFileStore.setState({
          largestPreviews: {
            ...current,
            [path]: { stats, loading: false, error: null },
          },
        })
        if (
          useFileStore.getState().selectedPath === path &&
          useFileStore.getState().mode === 'overview'
        ) {
          useFileStore.setState({
            datasetStats: stats,
            datasetLoading: false,
            datasetError: null,
          })
        }
      } catch (err) {
        const current = useFileStore.getState().largestPreviews
        const message = err instanceof Error ? err.message : String(err)
        useFileStore.setState({
          largestPreviews: {
            ...current,
            [path]: { stats: null, loading: false, error: message },
          },
        })
        if (
          useFileStore.getState().selectedPath === path &&
          useFileStore.getState().mode === 'overview'
        ) {
          useFileStore.setState({
            datasetLoading: false,
            datasetError: message,
          })
        }
      }
    }),
  )
}

async function loadBundlePreviews(paths: string[], groupPath: string) {
  useFileStore.setState({
    bundlePreviews: Object.fromEntries(
      paths.map((p) => [p, { stats: null, loading: true, error: null }]),
    ),
  })

  await Promise.all(
    paths.map(async (path) => {
      try {
        const stats = await loadStats(path, 'overview')
        if (useFileStore.getState().bundleGroupPath !== groupPath) return
        const current = useFileStore.getState().bundlePreviews
        useFileStore.setState({
          bundlePreviews: {
            ...current,
            [path]: { stats, loading: false, error: null },
          },
        })
      } catch (err) {
        if (useFileStore.getState().bundleGroupPath !== groupPath) return
        const current = useFileStore.getState().bundlePreviews
        const message = err instanceof Error ? err.message : String(err)
        useFileStore.setState({
          bundlePreviews: {
            ...current,
            [path]: { stats: null, loading: false, error: message },
          },
        })
      }
    }),
  )
}

function datasetsForGroup(tree: H5TreeNode, groupPath: string): {
  nodes: H5TreeNode[]
  truncated: boolean
} {
  const node = findTreeNode(tree, groupPath)
  if (!node || node.kind !== 'group') return { nodes: [], truncated: false }
  const all = collectDatasetsUnder(node)
  if (all.length <= BUNDLE_DATASET_LIMIT) return { nodes: all, truncated: false }
  return { nodes: all.slice(0, BUNDLE_DATASET_LIMIT), truncated: true }
}

export const useFileStore = create<FileState>((set, get) => ({
  status: 'idle',
  error: null,
  mode: 'overview',
  overview: null,
  selectedPath: null,
  datasetStats: null,
  datasetLoading: false,
  datasetError: null,
  largestPreviews: {},
  bundleGroupPath: null,
  bundlePaths: [],
  bundleTruncated: false,
  bundlePreviews: {},

  openFile: async (file: File) => {
    set({
      status: 'loading',
      error: null,
      overview: null,
      selectedPath: null,
      datasetStats: null,
      datasetError: null,
      datasetLoading: false,
      largestPreviews: {},
      bundleGroupPath: null,
      bundlePaths: [],
      bundleTruncated: false,
      bundlePreviews: {},
      mode: 'overview',
    })
    try {
      const { h5, name, sizeBytes } = await openLocalFile(file)
      const overview = buildOverview(h5, name, sizeBytes)
      const first =
        (overview.focusCandidates[0] ?? overview.largestDatasets[0])?.path ?? null
      set({
        status: 'ready',
        overview,
        selectedPath: first,
        datasetLoading: Boolean(first),
      })
      void loadLargestPreviews()
      void useProjectStore
        .getState()
        .bindOpenFile(file)
        .then(() => {
          useProjectStore.getState().evaluateLink(collectAllPaths(overview.tree))
        })
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  },

  setMode: (mode) => {
    set({ mode })
    if (mode === 'overview') {
      const first =
        (get().overview?.focusCandidates[0] ?? get().overview?.largestDatasets[0])?.path ??
        null
      if (first) get().focusOverviewPath(first)
      else set({ selectedPath: null, datasetStats: null, datasetError: null })
    }
  },

  focusOverviewPath: (path: string) => {
    const cached = get().largestPreviews[path]
    const samePathStats =
      get().datasetStats?.path === path ? get().datasetStats : null
    const stats = cached?.stats ?? samePathStats
    set({
      mode: 'overview',
      selectedPath: path,
      datasetStats: stats ?? null,
      datasetLoading: cached ? cached.loading && !stats : !stats,
      datasetError: cached?.error ?? null,
      bundleGroupPath: null,
      bundlePaths: [],
      bundleTruncated: false,
      bundlePreviews: {},
    })
    if (!stats) {
      void (async () => {
        try {
          const next = await loadStats(path, 'overview')
          if (get().selectedPath !== path || get().mode !== 'overview') return
          set({ datasetStats: next, datasetLoading: false, datasetError: null })
          const current = get().largestPreviews
          if (path in current) {
            useFileStore.setState({
              largestPreviews: {
                ...current,
                [path]: { stats: next, loading: false, error: null },
              },
            })
          }
        } catch (err) {
          if (get().selectedPath !== path || get().mode !== 'overview') return
          set({
            datasetLoading: false,
            datasetError: err instanceof Error ? err.message : String(err),
          })
        }
      })()
    }
  },

  selectDataset: async (path: string) => {
    set({
      mode: 'dataset',
      selectedPath: path,
      datasetLoading: true,
      datasetError: null,
      datasetStats: null,
      bundleGroupPath: null,
      bundlePaths: [],
      bundleTruncated: false,
      bundlePreviews: {},
    })

    try {
      await new Promise((r) => setTimeout(r, 0))
      const stats = await loadStats(path, 'full')
      if (get().selectedPath !== path) return
      set({ datasetStats: stats, datasetLoading: false })
    } catch (err) {
      if (get().selectedPath !== path) return
      set({
        datasetLoading: false,
        datasetError: err instanceof Error ? err.message : String(err),
      })
    }
  },

  openGroupBundle: async (groupPath: string) => {
    const overview = get().overview
    if (!overview) return
    const { nodes, truncated } = datasetsForGroup(overview.tree, groupPath)
    const paths = nodes.map((n) => n.path)
    if (!paths.length) {
      set({
        mode: 'bundle',
        selectedPath: groupPath,
        bundleGroupPath: groupPath,
        bundlePaths: [],
        bundleTruncated: false,
        bundlePreviews: {},
        datasetStats: null,
        datasetLoading: false,
        datasetError: 'This group has no datasets underneath.',
      })
      return
    }
    set({
      mode: 'bundle',
      selectedPath: groupPath,
      bundleGroupPath: groupPath,
      bundlePaths: paths,
      bundleTruncated: truncated,
      datasetStats: null,
      datasetLoading: false,
      datasetError: null,
    })
    await loadBundlePreviews(paths, groupPath)
  },

  clearSelection: () => {
    set({
      mode: 'overview',
      datasetError: null,
      bundleGroupPath: null,
      bundlePaths: [],
      bundleTruncated: false,
      bundlePreviews: {},
    })
    const first =
      (get().overview?.focusCandidates[0] ?? get().overview?.largestDatasets[0])?.path
    if (first) get().focusOverviewPath(first)
    else set({ selectedPath: null, datasetStats: null, datasetLoading: false })
  },

  highlightInTree: (path: string) => {
    set({ mode: 'tree', selectedPath: path })
  },

  resetToHome: () => {
    closeOpenFile()
    useProjectStore.getState().clearForHome()
    set({
      status: 'idle',
      error: null,
      mode: 'overview',
      overview: null,
      selectedPath: null,
      datasetStats: null,
      datasetLoading: false,
      datasetError: null,
      largestPreviews: {},
      bundleGroupPath: null,
      bundlePaths: [],
      bundleTruncated: false,
      bundlePreviews: {},
    })
  },
}))
