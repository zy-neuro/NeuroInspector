import type { DatasetFlag, DatasetStats, H5AttrSummary } from './types'
import {
  HEATMAP_MAX_SIDE,
  LARGE_BYTES_THRESHOLD,
  PREVIEW_ELEMENT_LIMIT,
} from './types'

function isTypedNumericArray(
  value: unknown,
): value is
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | BigInt64Array
  | BigUint64Array {
  return ArrayBuffer.isView(value) && !(value instanceof DataView)
}

export function flattenNumeric(value: unknown, out: number[], limit: number): void {
  if (out.length >= limit) return
  if (typeof value === 'number') {
    out.push(value)
    return
  }
  if (typeof value === 'bigint') {
    out.push(Number(value))
    return
  }
  if (isTypedNumericArray(value)) {
    const len = Math.min(value.length, limit - out.length)
    for (let i = 0; i < len; i += 1) {
      const v = value[i]
      out.push(typeof v === 'bigint' ? Number(v) : Number(v))
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (out.length >= limit) break
      flattenNumeric(item, out, limit)
    }
  }
}

function buildHistogram(values: number[], binCount = 24): { bins: number[]; counts: number[] } | null {
  if (values.length === 0) return null
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  if (min === max) {
    return { bins: [min, max], counts: [values.length] }
  }
  const width = (max - min) / binCount
  const counts = new Array<number>(binCount).fill(0)
  const bins = new Array<number>(binCount + 1)
  for (let i = 0; i <= binCount; i += 1) bins[i] = min + i * width
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    let idx = Math.floor((v - min) / width)
    if (idx >= binCount) idx = binCount - 1
    if (idx < 0) idx = 0
    counts[idx] += 1
  }
  return { bins, counts }
}

function detectConstantDims(values: number[], shape: number[]): number[] {
  if (shape.length < 2 || values.length === 0) return []
  const total = shape.reduce((a, b) => a * b, 1)
  if (total !== values.length) return []

  const constant: number[] = []
  for (let dim = 0; dim < shape.length; dim += 1) {
    const dimSize = shape[dim]
    if (dimSize <= 1) continue

    let stride = 1
    for (let d = dim + 1; d < shape.length; d += 1) stride *= shape[d]
    const outer = total / (dimSize * stride)

    let isConstant = true
    outerLoop: for (let o = 0; o < outer; o += 1) {
      for (let s = 0; s < stride; s += 1) {
        const base = o * dimSize * stride + s
        const first = values[base]
        for (let i = 1; i < dimSize; i += 1) {
          const v = values[base + i * stride]
          if (v !== first && !(Number.isNaN(v) && Number.isNaN(first))) {
            isConstant = false
            break outerLoop
          }
        }
      }
    }
    if (isConstant) constant.push(dim)
  }
  return constant
}

export function dtypeLooksNumeric(dtype: string): boolean {
  return /[fiuFbBdDlLqQ]|float|int|uint|double|bool/i.test(dtype)
}

/** Downsample a 2D matrix (row-major flat) to at most maxSide on each axis. */
export function downsample2D(
  values: number[],
  rows: number,
  cols: number,
  maxSide = HEATMAP_MAX_SIDE,
): { values: number[]; rows: number; cols: number } {
  const outRows = Math.min(rows, maxSide)
  const outCols = Math.min(cols, maxSide)
  if (outRows === rows && outCols === cols) {
    return { values, rows, cols }
  }
  const out = new Array<number>(outRows * outCols)
  for (let r = 0; r < outRows; r += 1) {
    const srcR = Math.floor((r * rows) / outRows)
    for (let c = 0; c < outCols; c += 1) {
      const srcC = Math.floor((c * cols) / outCols)
      out[r * outCols + c] = values[srcR * cols + srcC]
    }
  }
  return { values: out, rows: outRows, cols: outCols }
}

/**
 * Build a display plane from already-read values.
 * Prefer an explicit plane shape hint from the reader (sliced 2D / 1D).
 */
export function toDisplayPlane(
  values: number[],
  shape: number[],
  hintShape?: number[] | null,
  maxSide = HEATMAP_MAX_SIDE,
): { values: number[]; displayShape: number[]; sliceNote: string | null } {
  const plane = hintShape?.length ? hintShape : shape

  if (plane.length <= 1) {
    const n = plane[0] ?? values.length
    return {
      values: values.slice(0, n),
      displayShape: [Math.min(n, values.length)],
      sliceNote: null,
    }
  }

  if (plane.length >= 2) {
    const rows = plane[0]
    const cols = plane[1]
    const need = rows * cols
    const src =
      values.length >= need
        ? values.slice(0, need)
        : values.concat(new Array(Math.max(0, need - values.length)).fill(Number.NaN))
    const ds = downsample2D(src, rows, cols, maxSide)
    const note =
      ds.rows !== rows || ds.cols !== cols
        ? `Plane downsampled to ${ds.rows}×${ds.cols}`
        : null
    return { values: ds.values, displayShape: [ds.rows, ds.cols], sliceNote: note }
  }

  return { values, displayShape: shape, sliceNote: null }
}

export function meanAcrossAxis1(values: number[], rows: number, cols: number): number[] {
  const means = new Array<number>(rows).fill(0)
  for (let r = 0; r < rows; r += 1) {
    let sum = 0
    let count = 0
    for (let c = 0; c < cols; c += 1) {
      const v = values[r * cols + c]
      if (Number.isFinite(v)) {
        sum += v
        count += 1
      }
    }
    means[r] = count ? sum / count : Number.NaN
  }
  return means
}

export function analyzeNumeric(args: {
  path: string
  dtype: string
  shape: number[]
  nbytes: number
  compression: string | null
  attrs: H5AttrSummary[]
  flat: number[]
  sampled: boolean
  totalElements: number
  displayShapeHint?: number[] | null
  sliceNoteHint?: string | null
  heatmapMaxSide?: number
}): DatasetStats {
  const flags: DatasetFlag[] = []
  const { flat, shape, totalElements } = args
  const heatmapMaxSide = args.heatmapMaxSide ?? HEATMAP_MAX_SIDE

  if (totalElements === 0) flags.push('empty')
  if (args.nbytes >= LARGE_BYTES_THRESHOLD) flags.push('large')
  if (args.sampled) flags.push('sampled')

  let nan = 0
  let posInf = 0
  let negInf = 0
  let finite = 0
  let sum = 0
  let sumSq = 0
  let min = Infinity
  let max = -Infinity

  for (const v of flat) {
    if (Number.isNaN(v)) {
      nan += 1
      continue
    }
    if (v === Infinity) {
      posInf += 1
      continue
    }
    if (v === -Infinity) {
      negInf += 1
      continue
    }
    finite += 1
    sum += v
    sumSq += v * v
    if (v < min) min = v
    if (v > max) max = v
  }

  if (nan > 0) flags.push('has_nan')
  if (posInf > 0 || negInf > 0) flags.push('has_inf')
  if (flat.length > 0 && nan === flat.length) flags.push('all_nan')

  const mean = finite > 0 ? sum / finite : null
  const variance = finite > 1 ? (sumSq - (sum * sum) / finite) / (finite - 1) : null
  const std = variance != null && variance >= 0 ? Math.sqrt(variance) : null

  const finiteValues = flat.filter((v) => Number.isFinite(v))
  if (finiteValues.length > 0) {
    const first = finiteValues[0]
    if (finiteValues.every((v) => v === first)) flags.push('constant')
  }

  const constantDims =
    !args.sampled && flat.length === totalElements && shape.length >= 2
      ? detectConstantDims(flat, shape)
      : []
  if (constantDims.length) flags.push('constant_dim')

  const plane = toDisplayPlane(
    flat.slice(0, Math.min(flat.length, flat.length)),
    shape,
    args.displayShapeHint,
    heatmapMaxSide,
  )
  const sliceNote = [args.sliceNoteHint, plane.sliceNote].filter(Boolean).join(' · ') || null

  // Keep enough samples for heatmap plus 1D charts
  const keep = Math.max(heatmapMaxSide * heatmapMaxSide, PREVIEW_ELEMENT_LIMIT)

  return {
    path: args.path,
    dtype: args.dtype,
    shape,
    nbytes: args.nbytes,
    compression: args.compression,
    attrs: args.attrs,
    sampled: args.sampled,
    sampleCount: flat.length,
    totalElements,
    finite,
    nan,
    posInf,
    negInf,
    min: finite > 0 ? min : null,
    max: finite > 0 ? max : null,
    mean,
    std,
    constantDims,
    histogram: buildHistogram(finiteValues),
    values: plane.values.slice(0, keep),
    displayShape: plane.displayShape,
    textPreview: null,
    sliceNote,
    flags,
  }
}

export function analyzeNonNumeric(args: {
  path: string
  dtype: string
  shape: number[]
  nbytes: number
  compression: string | null
  attrs: H5AttrSummary[]
  value: unknown
  totalElements: number
}): DatasetStats {
  const flags: DatasetFlag[] = []
  if (args.totalElements === 0) flags.push('empty')
  if (args.nbytes >= LARGE_BYTES_THRESHOLD) flags.push('large')
  if (/S|string|UTF|U\d/i.test(args.dtype)) flags.push('string')
  else flags.push('non_numeric')

  let textPreview: string[] | null = null
  if (typeof args.value === 'string') textPreview = [args.value]
  else if (Array.isArray(args.value)) {
    textPreview = args.value.slice(0, 32).map((v) => String(v))
  } else if (args.value != null) {
    textPreview = [String(args.value)]
  }

  return {
    path: args.path,
    dtype: args.dtype,
    shape: args.shape,
    nbytes: args.nbytes,
    compression: args.compression,
    attrs: args.attrs,
    sampled: false,
    sampleCount: 0,
    totalElements: args.totalElements,
    finite: 0,
    nan: 0,
    posInf: 0,
    negInf: 0,
    min: null,
    max: null,
    mean: null,
    std: null,
    constantDims: [],
    histogram: null,
    values: null,
    displayShape: null,
    textPreview,
    sliceNote: null,
    flags,
  }
}
