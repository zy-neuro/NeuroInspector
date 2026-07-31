export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = -1
  do {
    value /= 1024
    i += 1
  } while (value >= 1024 && i < units.length - 1)
  return `${value.toFixed(value >= 10 || i === 0 ? 1 : 0)} ${units[i]}`
}

export function formatShape(shape: number[] | null | undefined): string {
  if (!shape || shape.length === 0) return 'scalar'
  return `(${shape.join(' × ')})`
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n < 1000) return String(n)
  if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)}k`
  if (n < 1e9) return `${(n / 1e6).toFixed(n < 1e7 ? 1 : 0)}M`
  return `${(n / 1e9).toFixed(1)}B`
}

export function formatNumber(n: number | null | undefined, digits = 4): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e4 || (Math.abs(n) > 0 && Math.abs(n) < 1e-3)) {
    return n.toExponential(2)
  }
  return Number(n.toPrecision(digits)).toString()
}

export function basename(path: string): string {
  if (path === '/' || path === '') return '/'
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function joinPath(parent: string, name: string): string {
  if (parent === '/' || parent === '') return `/${name}`
  return `${parent.replace(/\/$/, '')}/${name}`
}

export const ATTR_PREVIEW_LEN = 80
/** Hover tip budget for long string attrs (e.g. IGORWaveNote). */
export const ATTR_TIP_LEN = 4000

export function previewValue(value: unknown, maxLen = ATTR_PREVIEW_LEN): string {
  if (value == null) return 'null'
  if (typeof value === 'string') {
    return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const view = value as unknown as ArrayLike<number | bigint>
    const limit = maxLen <= ATTR_PREVIEW_LEN ? 8 : Math.min(view.length, 64)
    const arr = Array.from(view).slice(0, limit)
    const more = view.length > limit ? ', …' : ''
    return `[${arr.join(', ')}${more}]`
  }
  if (Array.isArray(value)) {
    try {
      const s = JSON.stringify(value)
      return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
    } catch {
      return `[array × ${value.length}]`
    }
  }
  try {
    const s = String(value)
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
  } catch {
    return typeof value
  }
}

/** Display preview + optional longer tip when the value was shortened. */
export function attrPreviewPair(value: unknown): { preview: string; tip?: string } {
  const preview = previewValue(value, ATTR_PREVIEW_LEN)
  const tip = previewValue(value, ATTR_TIP_LEN)
  return tip !== preview ? { preview, tip } : { preview }
}

export function looksContentTruncated(text: string) {
  return text.endsWith('…') || text.endsWith('...')
}
