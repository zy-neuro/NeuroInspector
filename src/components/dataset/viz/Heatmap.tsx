import { useEffect, useRef } from 'react'

function colorFor(t: number): [number, number, number] {
  const stops: [number, number, number][] = [
    [15, 40, 90],
    [40, 140, 200],
    [240, 220, 90],
    [220, 60, 70],
  ]
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = stops[i]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ]
}

export function Heatmap({
  values,
  rows,
  cols,
}: {
  values: number[]
  rows: number
  cols: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || rows <= 0 || cols <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const finite: number[] = []
    for (const v of values) {
      if (Number.isFinite(v)) finite.push(v)
    }
    if (!finite.length) return
    finite.sort((a, b) => a - b)
    const lo = finite[Math.floor(finite.length * 0.02)] ?? finite[0]
    const hi = finite[Math.floor(finite.length * 0.98)] ?? finite[finite.length - 1]
    const span = hi - lo || 1

    canvas.width = cols
    canvas.height = rows
    const img = ctx.createImageData(cols, rows)
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const v = values[r * cols + c]
        const t = Number.isFinite(v) ? (v - lo) / span : 0
        const [red, g, b] = colorFor(t)
        const idx = (r * cols + c) * 4
        img.data[idx] = red
        img.data[idx + 1] = g
        img.data[idx + 2] = b
        img.data[idx + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [values, rows, cols])

  return (
    <div className="heatmap-wrap">
      <canvas ref={ref} style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }} />
      <p className="muted" style={{ margin: '0.4rem 0 0', fontSize: '0.7rem' }}>
        Color scale uses 2–98% percentiles (robust to outliers)
      </p>
    </div>
  )
}
