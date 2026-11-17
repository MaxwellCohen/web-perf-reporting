import { Alert } from "@/components/ui/alert";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { TraceSnapshot } from "./findings";
import { FindingsPanel } from "./FindingsPanel";

const ms = (v?: number) => (v == null ? "—" : formatMs(v));

/** Read-only view of a `#r=` share link. */
export function SharedSummary({ snapshot }: { snapshot: TraceSnapshot }) {
  const m = snapshot.metrics;
  const stats: [string, string][] = [
    ["TTFB", ms(m.ttfb)],
    ["FCP", ms(m.fcp)],
    ["LCP", ms(m.lcp)],
    ["CLS", m.cls.toFixed(3)],
    ["TBT", ms(m.tbt)],
    ["Long tasks", `${m.longTaskCount} (${ms(m.longTaskMs)})`],
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Alert>Shared summary — load the trace file for the full timeline</Alert>
      {snapshot.url && <p className="truncate text-xs text-muted-foreground">{snapshot.url}</p>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <FindingsPanel snapshot={snapshot} shared />
    </div>
  );
}
