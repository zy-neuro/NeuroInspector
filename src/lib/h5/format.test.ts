import { describe, expect, it } from 'vitest'
import { basename, formatBytes, formatShape, joinPath, previewValue } from './format'

describe('format helpers', () => {
  it('formats bytes and shapes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toMatch(/KB/)
    expect(formatShape(null)).toBe('scalar')
    expect(formatShape([10, 20])).toBe('(10 × 20)')
  })

  it('joins HDF5-style paths', () => {
    expect(joinPath('/', 'acquisition')).toBe('/acquisition')
    expect(joinPath('/acquisition', 'data')).toBe('/acquisition/data')
    expect(basename('/acquisition/data')).toBe('data')
  })

  it('previews values without throwing on common types', () => {
    expect(previewValue(null)).toBe('null')
    expect(previewValue('short')).toBe('short')
    expect(previewValue('x'.repeat(100)).endsWith('…')).toBe(true)
    expect(previewValue(new Float32Array([1, 2, 3]))).toContain('1')
  })
})
