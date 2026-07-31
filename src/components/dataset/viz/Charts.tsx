import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '../../../lib/h5/format'
import { useThemeStore } from '../../../store/themeStore'

function useChartTheme() {
  const resolved = useThemeStore((s) => s.resolved)
  const light = resolved === 'light'
  return {
    light,
    tick: light ? '#5a6578' : '#93a0bd',
    grid: light ? 'transparent' : '#2a3650',
    showGrid: !light,
    tooltipBg: light ? '#ffffff' : '#151e32',
    tooltipBorder: light ? '#cfd7e6' : '#2a3650',
    tooltipLabel: light ? '#5a6578' : '#93a0bd',
    bar: light ? '#3b6fd9' : '#4f8cff',
    line: light ? '#5b4fcf' : '#7c5cff',
  }
}

/** Min/max envelope downsample so peaks/troughs are not lost when thinning. */
function downsamplePreservingExtremes(
  values: number[],
  maxPoints: number,
): { i: number; v: number }[] {
  if (values.length <= maxPoints) {
    return values.map((v, i) => ({ i, v }))
  }

  const bucketSize = values.length / maxPoints
  const out: { i: number; v: number }[] = []

  for (let b = 0; b < maxPoints; b += 1) {
    const start = Math.floor(b * bucketSize)
    const end = Math.min(values.length, Math.floor((b + 1) * bucketSize))
    if (start >= end) continue

    let min = Infinity
    let max = -Infinity
    let minI = start
    let maxI = start
    let saw = false

    for (let i = start; i < end; i += 1) {
      const v = values[i]
      if (!Number.isFinite(v)) continue
      saw = true
      if (v < min) {
        min = v
        minI = i
      }
      if (v > max) {
        max = v
        maxI = i
      }
    }

    if (!saw) continue

    if (minI === maxI) {
      out.push({ i: minI, v: min })
    } else if (minI < maxI) {
      out.push({ i: minI, v: min }, { i: maxI, v: max })
    } else {
      out.push({ i: maxI, v: max }, { i: minI, v: min })
    }
  }

  return out
}

function yDomainFromValues(values: number[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1]
  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.05 : 1
    return [min - pad, max + pad]
  }
  const pad = (max - min) * 0.05
  return [min - pad, max + pad]
}

export function HistogramChart({
  bins,
  counts,
}: {
  bins: number[]
  counts: number[]
}) {
  const t = useChartTheme()
  const data = counts.map((count, i) => ({
    bin: formatNumber(bins[i] ?? 0, 3),
    count,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {t.showGrid ? <CartesianGrid strokeDasharray="3 3" stroke={t.grid} /> : null}
        <XAxis dataKey="bin" tick={{ fill: t.tick, fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: t.tick, fontSize: 10 }} width={36} />
        <Tooltip
          contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}` }}
          labelStyle={{ color: t.tooltipLabel }}
        />
        <Bar dataKey="count" fill={t.bar} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LineSeriesChart({ values, label }: { values: number[]; label: string }) {
  const t = useChartTheme()
  const data = downsamplePreservingExtremes(values, 2000)
  const domain = yDomainFromValues(values)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {t.showGrid ? <CartesianGrid strokeDasharray="3 3" stroke={t.grid} /> : null}
        <XAxis dataKey="i" tick={{ fill: t.tick, fontSize: 10 }} />
        <YAxis
          tick={{ fill: t.tick, fontSize: 10 }}
          width={48}
          domain={domain}
          allowDataOverflow={false}
        />
        <Tooltip
          contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}` }}
          labelStyle={{ color: t.tooltipLabel }}
        />
        <Line
          type="linear"
          dataKey="v"
          name={label}
          stroke={t.line}
          dot={false}
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
