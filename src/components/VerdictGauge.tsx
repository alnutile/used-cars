import type { VerdictSignal } from '../types/report'

// Dashboard-style verdict readout: a three-zone gauge with the needle parked
// on the verdict. Mirrors the signal system from the used-car-research skill:
// go (green), caution (amber), flag (red).

const ZONES: { signal: VerdictSignal; from: number; to: number; color: string }[] = [
  { signal: 'go', from: 180, to: 122, color: 'var(--go-bright)' },
  { signal: 'caution', from: 118, to: 62, color: 'var(--caution-bright)' },
  { signal: 'flag', from: 58, to: 0, color: 'var(--flag-bright)' },
]

const NEEDLE_ANGLE: Record<VerdictSignal, number> = { go: 151, caution: 90, flag: 29 }

const CX = 100
const CY = 92
const R = 74

function point(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [CX + radius * -Math.cos(rad), CY + radius * -Math.sin(rad)]
}

function arcPath(from: number, to: number): string {
  const [x1, y1] = point(from, R)
  const [x2, y2] = point(to, R)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export default function VerdictGauge({ signal }: { signal: VerdictSignal }) {
  const [nx, ny] = point(NEEDLE_ANGLE[signal], R - 22)
  return (
    <svg className="verdict-gauge" viewBox="0 0 200 104" role="img" aria-label={`Verdict gauge pointing to ${signal}`}>
      {ZONES.map((zone) => (
        <path
          key={zone.signal}
          d={arcPath(zone.from, zone.to)}
          stroke={zone.color}
          strokeWidth={13}
          strokeLinecap="round"
          fill="none"
          opacity={zone.signal === signal ? 1 : 0.22}
        />
      ))}
      <line
        x1={CX}
        y1={CY}
        x2={nx.toFixed(2)}
        y2={ny.toFixed(2)}
        stroke="var(--gauge-needle)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={8} fill="var(--gauge-needle)" />
      <circle cx={CX} cy={CY} r={3.2} fill="var(--gauge-hub)" />
    </svg>
  )
}
