import type { StreamAnalysis, StreamMeasurement } from "@/lib/stream-timing/types";

const W = 1000;
const H = 120;
const PAD = 8;

/** Chunk arrivals on a time axis; amber spans are idle gaps, orange ticks are late stream-in chunks. */
export function StreamTimeline({
  measurement,
  analysis,
  axisEnd,
}: {
  measurement: StreamMeasurement;
  analysis: StreamAnalysis;
  /** Shared axis length (ms) so two timelines can be compared at the same scale. */
  axisEnd?: number;
}) {
  const end = Math.max(measurement.totalMs, analysis.lastByteMs, axisEnd ?? 0, 1);
  const x = (t: number) => PAD + (t / end) * (W - PAD * 2);
  const maxBytes = measurement.chunks.reduce((mx, c) => Math.max(mx, c.bytes), 1);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full rounded-md border" role="img" aria-label="Chunk arrival timeline">
      <rect x={x(0)} y={H - 10} width={x(measurement.headersMs) - x(0)} height={10} fill="currentColor" opacity={0.25} />
      {analysis.gaps.map((g) => (
        <g key={g.beforeIndex}>
          <rect x={x(g.fromMs)} y={0} width={x(g.toMs) - x(g.fromMs)} height={H} fill="#f59e0b" opacity={0.2} stroke="#f59e0b" strokeOpacity={0.6} />
          <text x={(x(g.fromMs) + x(g.toMs)) / 2} y={H / 2} fontSize={14} textAnchor="middle" fill="#f59e0b">
            waiting {Math.round(g.durationMs)}ms
          </text>
        </g>
      ))}
      {measurement.chunks.map((c, i) => {
        const h = 6 + (c.bytes / maxBytes) * (H - 30);
        return (
          <rect key={i} x={Math.max(0, x(c.t) - 1.5)} y={c.late ? 0 : H - h} width={Math.max(3, x(c.end ?? c.t) - x(c.t) + 3)} height={c.late ? H : h} fill={c.late ? "#ea580c" : "currentColor"} />
        );
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <text key={f} x={x(end * f)} y={H + 16} fontSize={11} textAnchor={f === 1 ? "end" : f === 0 ? "start" : "middle"} fill="currentColor" opacity={0.7}>
          {Math.round(end * f)}ms
        </text>
      ))}
    </svg>
  );
}
