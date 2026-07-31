import type { Dataset, File as H5File } from 'h5wasm'
import { attrPreviewPair } from './format'
import { analyzeNonNumeric, analyzeNumeric, dtypeLooksNumeric, flattenNumeric } from './stats'
import type { DatasetStats, H5AttrSummary, H5TreeNode, SampleBudget } from './types'
import {
  HEATMAP_MAX_SIDE,
  OVERVIEW_HEATMAP_MAX_SIDE,
  OVERVIEW_SAMPLE_LIMIT,
  SAMPLE_ELEMENT_LIMIT,
} from './types'

function dtypeToString(dtype: unknown): string {
  if (typeof dtype === 'string') return dtype
  try {
    return JSON.stringify(dtype)
  } catch {
    return String(dtype)
  }
}

function readAttrs(ds: Dataset): H5AttrSummary[] {
  const out: H5AttrSummary[] = []
  try {
    for (const [name, attr] of Object.entries(ds.attrs)) {
      const { preview, tip } = attrPreviewPair(attr.value)
      out.push({
        name,
        dtype: dtypeToString(attr.dtype),
        shape: attr.shape,
        preview,
        tip,
      })
    }
  } catch {
    /* ignore */
  }
  return out
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

function findNode(tree: H5TreeNode, path: string): H5TreeNode | null {
  if (tree.path === path) return tree
  for (const child of tree.children ?? []) {
    const hit = findNode(child, path)
    if (hit) return hit
  }
  return null
}

type SliceRange = [number, number]

/**
 * Prefer a meaningful 2D plane for rank>=3: fix the smallest axis at mid-index,
 * then shrink the remaining two axes to fit the sample budget.
 */
function planeSamplePlan(shape: number[], limit: number): {
  ranges: SliceRange[]
  planeShape: number[]
  note: string
} {
  if (shape.length === 0) {
    return { ranges: [], planeShape: [], note: 'scalar' }
  }
  if (shape.length === 1) {
    const take = Math.min(shape[0], limit)
    return {
      ranges: [[0, take]],
      planeShape: [take],
      note: take < shape[0] ? `Sampled first ${take} of ${shape[0]}` : 'Full 1D series',
    }
  }
  if (shape.length === 2) {
    let rows = shape[0]
    let cols = shape[1]
    if (rows * cols > limit) {
      const scale = Math.sqrt(limit / (rows * cols))
      rows = Math.max(1, Math.floor(rows * scale))
      cols = Math.max(1, Math.floor(limit / rows))
      cols = Math.min(cols, shape[1])
    }
    return {
      ranges: [
        [0, rows],
        [0, cols],
      ],
      planeShape: [rows, cols],
      note:
        rows < shape[0] || cols < shape[1]
          ? `Sampled leading ${rows}×${cols} of ${shape[0]}×${shape[1]}`
          : 'Full 2D array',
    }
  }

  // rank >= 3: fix smallest dimension at center
  let fixAxis = 0
  for (let i = 1; i < shape.length; i += 1) {
    if (shape[i] < shape[fixAxis]) fixAxis = i
  }
  // Prefer last axis when sizes are close (common in NWB stacks)
  if (shape[shape.length - 1] <= shape[fixAxis] * 1.5) fixAxis = shape.length - 1

  const free = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => i < shape.length && i !== fixAxis)
  const a = free[0]
  const b = free[1] ?? free[0]
  const mid = Math.floor(shape[fixAxis] / 2)

  let rows = shape[a]
  let cols = a === b ? 1 : shape[b]
  if (rows * cols > limit) {
    const scale = Math.sqrt(limit / (rows * cols))
    rows = Math.max(1, Math.floor(rows * scale))
    cols = Math.max(1, Math.floor(limit / rows))
    if (a !== b) cols = Math.min(cols, shape[b])
  }

  const ranges: SliceRange[] = shape.map((_, i) => {
    if (i === fixAxis) return [mid, mid + 1]
    if (i === a) return [0, rows]
    if (i === b && a !== b) return [0, cols]
    return [0, 1]
  })

  const planeShape = a === b ? [rows] : [rows, cols]
  const note = `Slice axis ${fixAxis}=${mid} → preview ${planeShape.join('×')} (of ${shape.join('×')})`
  return { ranges, planeShape, note }
}

function looksLikeDataset(entity: unknown): entity is Dataset {
  return (
    !!entity &&
    ((entity as { type?: string }).type === 'Dataset' ||
      (typeof (entity as Dataset).slice === 'function' && 'shape' in (entity as object)))
  )
}

function budgetLimits(budget: SampleBudget) {
  if (budget === 'overview') {
    return {
      sampleLimit: OVERVIEW_SAMPLE_LIMIT,
      heatmapMaxSide: OVERVIEW_HEATMAP_MAX_SIDE,
    }
  }
  return {
    sampleLimit: SAMPLE_ELEMENT_LIMIT,
    heatmapMaxSide: HEATMAP_MAX_SIDE,
  }
}

export function analyzeDatasetPath(
  h5: H5File,
  path: string,
  tree: H5TreeNode,
  budget: SampleBudget = 'full',
): DatasetStats {
  const entity = h5.get(path)
  if (!looksLikeDataset(entity)) {
    throw new Error(`Not a dataset: ${path}`)
  }
  const ds = entity
  const metaNode = findNode(tree, path)
  const { sampleLimit, heatmapMaxSide } = budgetLimits(budget)

  const shape = ds.shape ?? metaNode?.shape ?? []
  const dtype = dtypeToString(ds.dtype ?? metaNode?.dtype ?? '?')
  const attrs = readAttrs(ds)
  const compression = compressionLabel(ds)
  const nbytes = metaNode?.nbytes ?? 0
  const totalElements = shape.length === 0 ? 1 : shape.reduce((a, b) => a * b, 1)

  if (!dtypeLooksNumeric(dtype)) {
    let value: unknown = null
    try {
      if (totalElements <= 256) value = ds.value
      else {
        const plan = planeSamplePlan(shape, 64)
        value = ds.slice(plan.ranges)
      }
    } catch {
      value = null
    }
    return analyzeNonNumeric({
      path,
      dtype,
      shape,
      nbytes,
      compression,
      attrs,
      value,
      totalElements,
    })
  }

  const plan = planeSamplePlan(shape, sampleLimit)
  const needSample =
    totalElements > sampleLimit || plan.note.includes('Sampled') || plan.note.includes('Slice')

  let raw: unknown = null
  let sampled = needSample && totalElements > (plan.planeShape.reduce((a, b) => a * b, 1) || 1)
  try {
    if (totalElements <= sampleLimit && shape.length <= 2) {
      raw = ds.value
      sampled = false
    } else {
      raw = ds.slice(plan.ranges)
      sampled = true
    }
  } catch (err) {
    try {
      raw = ds.value
      sampled = true
    } catch {
      throw new Error(
        `Failed to read dataset values: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  const flat: number[] = []
  flattenNumeric(raw, flat, sampleLimit)
  if (flat.length < totalElements) sampled = true

  const effectiveShape =
    sampled &&
    plan.planeShape.length >= 1 &&
    flat.length === plan.planeShape.reduce((a, b) => a * b, 1)
      ? plan.planeShape
      : shape

  return analyzeNumeric({
    path,
    dtype,
    shape,
    nbytes,
    compression,
    attrs,
    flat,
    sampled,
    totalElements,
    displayShapeHint: effectiveShape,
    sliceNoteHint: sampled || shape.length >= 3 ? plan.note : null,
    heatmapMaxSide,
  })
}
