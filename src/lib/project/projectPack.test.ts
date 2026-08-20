import { describe, expect, it } from 'vitest'
import { buildProjectPayload, readProjectFile } from './exportProject'
import { hashFileSha256 } from './hash'
import {
  PROJECT_FORMAT,
  identitiesMatch,
  isProjectPayload,
  type ProjectFileIdentity,
} from './types'

const sourceA: ProjectFileIdentity = {
  name: 'demo.nwb',
  sizeBytes: 128,
  sha256: 'a'.repeat(64),
}

const sourceB: ProjectFileIdentity = {
  name: 'demo.nwb',
  sizeBytes: 128,
  sha256: 'b'.repeat(64),
}

describe('project pack schema', () => {
  it('accepts a valid neuroinspector-project/v1 payload', () => {
    const payload = buildProjectPayload({
      sourceFile: sourceA,
      selectedPaths: ['/acquisition', '/general/subject'],
      annotations: {
        '/acquisition': {
          note: 'primary signal',
          tags: ['keep'],
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      },
      title: 'Demo pack',
    })

    expect(payload.format).toBe(PROJECT_FORMAT)
    expect(payload.selectedPaths).toEqual(['/acquisition', '/general/subject'])
    expect(payload.annotations).toHaveLength(1)
    expect(isProjectPayload(payload)).toBe(true)
  })

  it('rejects malformed or wrong-format payloads', () => {
    expect(isProjectPayload(null)).toBe(false)
    expect(isProjectPayload({})).toBe(false)
    expect(
      isProjectPayload({
        format: 'other/v1',
        sourceFile: sourceA,
        selectedPaths: [],
        annotations: [],
      }),
    ).toBe(false)
    expect(
      isProjectPayload({
        format: PROJECT_FORMAT,
        sourceFile: { name: 'x', sizeBytes: 'nope', sha256: 'abc' },
        selectedPaths: [],
        annotations: [],
      }),
    ).toBe(false)
  })
})

describe('project pack round-trip', () => {
  it('JSON serialize → File → readProjectFile restores fields', async () => {
    const original = buildProjectPayload({
      sourceFile: sourceA,
      selectedPaths: ['/a', '/b'],
      annotations: {
        '/a': { note: 'note A', tags: [], updatedAt: '2026-08-01T00:00:00.000Z' },
      },
      description: 'round-trip',
    })

    const file = new File([JSON.stringify(original)], 'demo.neuroinspector.json', {
      type: 'application/json',
    })
    const restored = await readProjectFile(file)

    expect(restored.format).toBe(original.format)
    expect(restored.sourceFile).toEqual(original.sourceFile)
    expect(restored.selectedPaths).toEqual(original.selectedPaths)
    expect(restored.annotations).toEqual(original.annotations)
    expect(restored.description).toBe('round-trip')
  })

  it('throws on non-project JSON without silent success', async () => {
    const file = new File([JSON.stringify({ hello: 'world' })], 'bad.json', {
      type: 'application/json',
    })
    await expect(readProjectFile(file)).rejects.toThrow(/Not a NeuroInspector project file/)
  })
})

describe('source fingerprint match / mismatch', () => {
  it('matches on sha256 + sizeBytes', () => {
    expect(identitiesMatch(sourceA, { ...sourceA, name: 'renamed.nwb' })).toBe(true)
  })

  it('mismatches when hash differs', () => {
    expect(identitiesMatch(sourceA, sourceB)).toBe(false)
  })

  it('mismatches when size differs', () => {
    expect(identitiesMatch(sourceA, { ...sourceA, sizeBytes: 129 })).toBe(false)
  })
})

describe('SHA-256 identity', () => {
  it('hashes File bytes stably', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    const file = new File([bytes], 'chunk.bin')
    const once = await hashFileSha256(file)
    const twice = await hashFileSha256(new File([bytes], 'chunk.bin'))
    expect(once).toMatch(/^[0-9a-f]{64}$/)
    expect(once).toBe(twice)
  })

  it('changes when bytes change', async () => {
    const a = await hashFileSha256(new File([new Uint8Array([1, 2, 3])], 'a.bin'))
    const b = await hashFileSha256(new File([new Uint8Array([1, 2, 4])], 'b.bin'))
    expect(a).not.toBe(b)
  })
})
