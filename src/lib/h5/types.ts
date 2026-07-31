export const SAMPLE_ELEMENT_LIMIT = 250_000
export const PREVIEW_ELEMENT_LIMIT = 2_048
export const HEATMAP_MAX_SIDE = 256
export const LARGE_BYTES_THRESHOLD = 50 * 1024 * 1024

/** Overview / bundle: lighter read + display budget */
export const OVERVIEW_SAMPLE_LIMIT = 32_000
export const OVERVIEW_HEATMAP_MAX_SIDE = 128

export type SampleBudget = 'overview' | 'full'
export type VizDensity = 'overview' | 'full'

export type PreviewKind = 'none' | 'series' | 'table' | 'heatmap'

/** Small enough 2D planes render as a readable table instead of a chart. */
export const TABLE_MAX_ROWS = 24
export const TABLE_MAX_COLS = 24
export const TABLE_MAX_CELLS = 256

export type PreviewDecision = {
  kind: PreviewKind
  /** English reason when kind is none */
  reason?: string
}
export type H5NodeKind = 'group' | 'dataset' | 'unknown'

export interface H5AttrSummary {
  name: string
  dtype: string
  shape: number[] | null
  /** Short display string (may already be content-truncated with …). */
  preview: string
  /** Longer hover text when preview was shortened; omit if same as preview. */
  tip?: string
}

export interface H5TreeNode {
  path: string
  name: string
  kind: H5NodeKind
  children?: H5TreeNode[]
  shape?: number[] | null
  dtype?: string
  nbytes?: number
  compression?: string | null
  attrs?: H5AttrSummary[]
  nwbType?: string
}

export type DatasetFlag =
  | 'has_nan'
  | 'has_inf'
  | 'all_nan'
  | 'constant'
  | 'constant_dim'
  | 'empty'
  | 'large'
  | 'sampled'
  | 'string'
  | 'non_numeric'

export interface DatasetStats {
  path: string
  dtype: string
  shape: number[]
  nbytes: number
  compression: string | null
  attrs: H5AttrSummary[]
  sampled: boolean
  sampleCount: number
  totalElements: number
  finite: number
  nan: number
  posInf: number
  negInf: number
  min: number | null
  max: number | null
  mean: number | null
  std: number | null
  constantDims: number[]
  histogram: { bins: number[]; counts: number[] } | null
  values: number[] | null
  displayShape: number[] | null
  textPreview: string[] | null
  sliceNote: string | null
  flags: DatasetFlag[]
}

export interface FileOverview {
  name: string
  sizeBytes: number
  formatLabel: string
  nwbVersion: string | null
  groupCount: number
  datasetCount: number
  largestDatasets: { path: string; nbytes: number; shape: number[] }[]
  /** Preferred Overview focus chips (chart-friendly); falls back to largestDatasets */
  focusCandidates: { path: string; nbytes: number; shape: number[] }[]
  flaggedHintCount: number
  rootAttrs: H5AttrSummary[]
  tree: H5TreeNode
}

export function flagLabel(flag: DatasetFlag): string {
  switch (flag) {
    case 'has_nan':
      return 'NaN'
    case 'has_inf':
      return 'Inf'
    case 'all_nan':
      return 'All NaN'
    case 'constant':
      return 'Constant'
    case 'constant_dim':
      return 'Const dim'
    case 'empty':
      return 'Empty'
    case 'large':
      return 'Large'
    case 'sampled':
      return 'Sampled'
    case 'string':
      return 'String'
    case 'non_numeric':
      return 'Non-numeric'
  }
}
