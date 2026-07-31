import h5wasm from 'h5wasm'
import type { File as H5File } from 'h5wasm'

let openHandle: H5File | null = null
let virtualName: string | null = null

export async function ensureH5Ready() {
  return h5wasm.ready
}

export async function openLocalFile(file: File): Promise<{ h5: H5File; name: string; sizeBytes: number }> {
  const { FS } = await h5wasm.ready

  if (openHandle) {
    try {
      openHandle.close()
    } catch {
      /* ignore */
    }
    openHandle = null
  }
  if (virtualName) {
    try {
      FS.unlink(virtualName)
    } catch {
      /* ignore */
    }
    virtualName = null
  }

  const ab = await file.arrayBuffer()
  const name = file.name.replace(/[^\w.\-]+/g, '_')
  virtualName = `/neurodata_${Date.now()}_${name}`
  FS.writeFile(virtualName, new Uint8Array(ab))

  const h5 = new h5wasm.File(virtualName, 'r')
  openHandle = h5
  return { h5, name: file.name, sizeBytes: file.size }
}

export function getOpenFile(): H5File | null {
  return openHandle
}

export function closeOpenFile() {
  if (openHandle) {
    try {
      openHandle.close()
    } catch {
      /* ignore */
    }
    openHandle = null
  }
}
