import { useRef, useState } from 'react'
import { IconWave } from './Icons'
import { useFileStore } from '../../store/fileStore'

export function DropZone() {
  const openFile = useFileStore((s) => s.openFile)
  const status = useFileStore((s) => s.status)
  const error = useFileStore((s) => s.error)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const onFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) void openFile(file)
  }

  const loading = status === 'loading'

  return (
    <div className="landing">
      <div className="landing-atmosphere" aria-hidden="true">
        <div className="landing-orb landing-orb-a" />
        <div className="landing-orb landing-orb-b" />
        <svg className="landing-wave" viewBox="0 0 640 160" preserveAspectRatio="none">
          <path
            className="landing-wave-path"
            d="M0 90 C 80 20, 140 140, 220 80 S 360 10, 440 70 S 560 150, 640 60"
            fill="none"
          />
          <path
            className="landing-wave-path landing-wave-path-b"
            d="M0 110 C 100 60, 160 150, 250 100 S 400 40, 480 95 S 580 140, 640 85"
            fill="none"
          />
        </svg>
      </div>

      <div
        className={`landing-stage ${drag ? 'drag' : ''} ${loading ? 'loading' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          onFiles(e.dataTransfer.files)
        }}
      >
        <div className="landing-brand">
          <div className="brand-mark landing-mark" aria-hidden="true">
            <IconWave size={24} />
          </div>
          <h1 className="landing-title">NeuroInspector</h1>
        </div>

        <p className="landing-lead">
          Local visual inspection for HDF5 / NWB — data stays in your browser.
        </p>

        <div className="landing-actions">
          <button
            type="button"
            className="btn primary landing-cta"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? 'Reading file…' : 'Open file'}
          </button>
          <p className="landing-drag-hint">or drop a file here</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".h5,.hdf5,.nwb,application/x-hdf"
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />

        {error ? <div className="error-box landing-error">{error}</div> : null}
      </div>

      <p className="landing-disclaimer">
        Inspection aid only. Previews may be sampled — you interpret your own files.
      </p>
    </div>
  )
}
