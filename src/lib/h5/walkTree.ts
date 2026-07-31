import type { Dataset, File as H5File, Group } from 'h5wasm'
import { attrPreviewPair, basename, joinPath } from './format'
import type { FileOverview, H5AttrSummary, H5TreeNode } from './types'

function dtypeToString(dtype: unknown): string {
  if (typeof dtype === 'string') return dtype
  try {
    return JSON.stringify(dtype)
  } catch {
    return String(dtype)
  }
}

function readAttrs(entity: Group | Dataset): H5AttrSummary[] {
  const out: H5AttrSummary[] = []
  try {
    const attrs = entity.attrs
    for (const [name, attr] of Object.entries(attrs)) {
      let preview = '—'
      let tip: string | undefined
      try {
        ;({ preview, tip } = attrPreviewPair(attr.value))
      } catch {
        preview = '(unreadable)'
      }
      out.push({
        name,
        dtype: dtypeToString(attr.dtype),
        shape: attr.shape,
        preview,
        tip,
      })
    }
  } catch {
    /* ignore attr errors */
  }
  return out
}

function estimateNbytes(ds: Dataset, shape: number[] | null): number {
  try {
    const meta = ds.metadata
    if (meta?.total_size && Number.isFinite(meta.total_size)) {
      return meta.total_size
    }
    const elemSize = meta?.size ?? 0
    if (shape && shape.length && elemSize) {
      return shape.reduce((a, b) => a * b, 1) * elemSize
    }
  } catch {
    /* ignore */
  }
  return 0
}

function compressionLabel(ds: Dataset): string | null {
  try {
    const filters = ds.filters
    if (!filters?.length) return null
    return filters.map((f) => f.name || `filter:${f.id}`).join(', ')
  } catch {
    return null
  }
}

function nwbTypeFromAttrs(attrs: H5AttrSummary[]): string | undefined {
  const hit = attrs.find((a) => a.name === 'neurodata_type' || a.name === 'namespace')
  return hit?.preview
}

function walkGroup(group: Group, path: string): H5TreeNode {
  const attrs = readAttrs(group)
  const children: H5TreeNode[] = []

  let keys: string[] = []
  try {
    keys = group.keys()
  } catch {
    keys = []
  }

  for (const key of keys) {
    let child
    try {
      child = group.get(key)
    } catch {
      continue
    }
    if (!child) continue

    const childPath = path === '/' ? `/${key}` : joinPath(path, key)
    const entityType = (child as { type?: string }).type
    const looksLikeGroup =
      entityType === 'Group' ||
      (typeof (child as Group).keys === 'function' && typeof (child as Group).get === 'function')
    const looksLikeDataset =
      entityType === 'Dataset' ||
      (typeof (child as Dataset).slice === 'function' && 'shape' in child)

    if (looksLikeGroup && !looksLikeDataset) {
      children.push(walkGroup(child as Group, childPath))
    } else if (looksLikeDataset) {
      const ds = child as Dataset
      let shape: number[] | null = null
      let dtype = '?'
      try {
        shape = ds.shape
        dtype = dtypeToString(ds.dtype)
      } catch {
        /* ignore */
      }
      const dsAttrs = readAttrs(ds)
      children.push({
        path: childPath,
        name: key,
        kind: 'dataset',
        shape,
        dtype,
        nbytes: estimateNbytes(ds, shape),
        compression: compressionLabel(ds),
        attrs: dsAttrs,
        nwbType: nwbTypeFromAttrs(dsAttrs),
      })
    } else if (looksLikeGroup) {
      // Prefer group when both heuristics fire (rare)
      children.push(walkGroup(child as Group, childPath))
    } else {
      children.push({
        path: childPath,
        name: key,
        kind: 'unknown',
      })
    }
  }

  children.sort((a, b) => {
    if (a.kind !== b.kind) {
      if (a.kind === 'group') return -1
      if (b.kind === 'group') return 1
    }
    return a.name.localeCompare(b.name)
  })

  return {
    path,
    name: path === '/' ? '/' : basename(path),
    kind: 'group',
    children,
    attrs,
    nwbType: nwbTypeFromAttrs(attrs),
  }
}

function countNodes(node: H5TreeNode): {
  groups: number
  datasets: number
  largest: { path: string; nbytes: number; shape: number[] }[]
  focusCandidates: { path: string; nbytes: number; shape: number[] }[]
} {
  let groups = 0
  let datasets = 0
  const largest: { path: string; nbytes: number; shape: number[] }[] = []
  const focusCandidates: { path: string; nbytes: number; shape: number[] }[] = []

  const visit = (n: H5TreeNode) => {
    if (n.kind === 'group') {
      groups += 1
      n.children?.forEach(visit)
    } else if (n.kind === 'dataset') {
      datasets += 1
      const entry = {
        path: n.path,
        nbytes: n.nbytes ?? 0,
        shape: n.shape ?? [],
      }
      largest.push(entry)
      if (isOverviewFocusFriendly(n)) focusCandidates.push(entry)
    }
  }
  visit(node)
  largest.sort((a, b) => b.nbytes - a.nbytes)
  focusCandidates.sort((a, b) => b.nbytes - a.nbytes)
  return {
    groups,
    datasets,
    largest: largest.slice(0, 5),
    focusCandidates: focusCandidates.slice(0, 5),
  }
}

/** Skip lab-notebook tables and scalars — they make poor Overview chart previews. */
function isOverviewFocusFriendly(n: H5TreeNode): boolean {
  const name = n.name.toLowerCase()
  if (name === 'numericalvalues') return false
  if (n.nwbType?.toLowerCase().includes('labnotebook')) return false
  const elems = (n.shape ?? []).reduce((a, b) => a * b, 1)
  if (!n.shape?.length || elems <= 1) return false
  return true
}

function detectNwb(rootAttrs: H5AttrSummary[], tree: H5TreeNode): string | null {
  const versionAttr = rootAttrs.find(
    (a) => a.name === 'nwb_version' || a.name === 'NWB_version',
  )
  if (versionAttr) return versionAttr.preview

  const hasClassic =
    tree.children?.some((c) =>
      ['acquisition', 'general', 'intervals', 'stimulus', 'processing'].includes(c.name),
    ) ?? false
  return hasClassic ? 'detected' : null
}

export function buildOverview(
  h5: H5File,
  fileName: string,
  sizeBytes: number,
): FileOverview {
  const tree = walkGroup(h5, '/')
  const rootAttrs = tree.attrs ?? []
  const { groups, datasets, largest, focusCandidates } = countNodes(tree)
  const nwbVersion = detectNwb(rootAttrs, tree)

  return {
    name: fileName,
    sizeBytes,
    formatLabel: nwbVersion ? 'NWB (HDF5)' : 'HDF5',
    nwbVersion: nwbVersion === 'detected' ? null : nwbVersion,
    groupCount: groups,
    datasetCount: datasets,
    largestDatasets: largest,
    /** Overview chips / default focus — excludes lab-notebook tables etc. */
    focusCandidates: focusCandidates.length ? focusCandidates : largest,
    flaggedHintCount: 0,
    rootAttrs,
    tree,
  }
}

/** Find a node by absolute HDF5 path. */
export function findTreeNode(root: H5TreeNode, path: string): H5TreeNode | null {
  if (root.path === path) return root
  for (const child of root.children ?? []) {
    const hit = findTreeNode(child, path)
    if (hit) return hit
  }
  return null
}

/** Depth-first list of every dataset under a node (inclusive if the node is a dataset). */
export function collectDatasetsUnder(node: H5TreeNode): H5TreeNode[] {
  if (node.kind === 'dataset') return [node]
  if (node.kind !== 'group') return []
  const out: H5TreeNode[] = []
  for (const child of node.children ?? []) {
    out.push(...collectDatasetsUnder(child))
  }
  return out
}
