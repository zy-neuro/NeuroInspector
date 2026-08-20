#!/usr/bin/env node
/**
 * Optional local harness: time h5wasm open + full hierarchy walk for sample files.
 * Does not upload data. Skips missing samples quietly.
 *
 *   node scripts/bench_open.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as h5wasm from 'h5wasm/node'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const samples = [
  'samples/sub-853715134_ses-855488126_icephys.clean.h5',
  'samples/sub-758112406_ses-760315976_icephys.nwb',
]

function walk(group) {
  let groups = 0
  let datasets = 0
  for (const key of group.keys()) {
    const child = group.get(key)
    if (child.type === 'Group') {
      groups += 1
      const nested = walk(child)
      groups += nested.groups
      datasets += nested.datasets
    } else {
      datasets += 1
    }
  }
  return { groups, datasets }
}

function firstReadableDataset(group, prefix = '') {
  for (const key of group.keys()) {
    const child = group.get(key)
    const childPath = `${prefix}/${key}`
    if (child.type === 'Dataset') {
      const shape = child.shape ?? []
      const n = shape.reduce((a, b) => a * b, 1)
      if (n > 0 && n <= 250_000) return { path: childPath, ds: child, n }
    } else {
      const hit = firstReadableDataset(child, childPath)
      if (hit) return hit
    }
  }
  return null
}

await h5wasm.ready
const { File } = h5wasm
const rows = []

for (const rel of samples) {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    console.error(`skip missing ${rel}`)
    continue
  }
  const buf = fs.readFileSync(abs)
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  const tOpen0 = performance.now()
  const file = new File(abs, 'r')
  const tOpen1 = performance.now()
  const counts = walk(file.get('/'))
  const tWalk1 = performance.now()
  const hit = firstReadableDataset(file.get('/'))
  let previewMs = null
  if (hit) {
    const t0 = performance.now()
    void hit.ds.value
    previewMs = Number((performance.now() - t0).toFixed(1))
  }
  file.close()
  rows.push({
    file: path.basename(abs),
    size_MB: Number((buf.length / 1e6).toFixed(1)),
    groups: counts.groups,
    datasets: counts.datasets,
    open_ms: Number((tOpen1 - tOpen0).toFixed(1)),
    walk_ms: Number((tWalk1 - tOpen1).toFixed(1)),
    open_plus_walk_ms: Number((tWalk1 - tOpen0).toFixed(1)),
    preview_ms: previewMs,
    sha256,
  })
}

console.log(JSON.stringify(rows, null, 2))
