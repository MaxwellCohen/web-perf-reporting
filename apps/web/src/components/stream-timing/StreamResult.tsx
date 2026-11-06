import type { StreamAnalysis, StreamMeasurement } from "@/lib/stream-timing/types";
import { StreamTimeline } from "./StreamTimeline";

const ms = (n: number) => `${Math.round(n)}ms`;

/** Stat tiles, timeline, chunk table and gap list for one measurement. */
export function StreamResult({
  label,
  measurement,
  analysis: a,
  axisEnd,
}: {
  label?: string;
  measurement: StreamMeasurement;
  analysis: StreamAnalysis;
  axisEnd?: number;
}) {
  return (
    <section className="flex flex-col gap-4">
      {label && (
        <h2 className="truncate text-sm font-semibold">
          {label}: <span className="font-normal text-muted-foreground">{measurement.finalUrl ?? measurement.url}</span>
        </h2>
      )}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["TTFB", ms(a.ttfbMs)],
          ["Last byte", ms(a.lastByteMs)],
          ["Idle waiting", `${ms(a.idleMs)} (${a.idlePct}%)`],
          ["Chunks", `${a.chunkCount} · ${(a.totalBytes / 1024).toFixed(1)} KB`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <StreamTimeline measurement={measurement} analysis={a} axisEnd={axisEnd} />
      {!a.streamed && (
        <p className="text-sm text-muted-foreground">
          Not streamed: the body arrived in one burst (or a proxy/compression buffered it).
        </p>
      )}
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-1 pr-3">#</th>
            <th className="pr-3">Arrived</th>
            <th className="pr-3">Since previous</th>
            <th className="pr-3">Size</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          {measurement.chunks.map((c, i) => {
            const prev = measurement.chunks[i - 1];
            const delta = i === 0 ? c.t : c.t - (prev.end ?? prev.t);
            const slow = delta >= a.gapThresholdMs;
            return (
              <tr key={i} className="border-t align-top">
                <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                <td className="pr-3 font-medium tabular-nums">{c.end ? `${ms(c.t)}–${ms(c.end)}` : ms(c.t)}</td>
                <td className={`pr-3 tabular-nums ${slow ? "font-semibold text-amber-500" : "text-muted-foreground"}`}>
                  +{ms(delta)}
                </td>
                <td className="pr-3 tabular-nums">{(c.bytes / 1024).toFixed(1)} KB</td>
                <td className="break-all">
                  {c.late && <span className="mr-2 rounded bg-orange-600/20 px-1.5 py-0.5 text-xs text-orange-500">Suspense</span>}
                  {c.preview && <code className="text-xs">{c.preview}</code>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {a.gaps.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {a.gaps.map((g) => (
            <li key={g.beforeIndex} className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
              <strong>Waited {ms(g.durationMs)}</strong> ({ms(g.fromMs)} → {ms(g.toMs)})
              {g.next && (
                <>
                  , then received <code className="break-all">{g.next}</code>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
