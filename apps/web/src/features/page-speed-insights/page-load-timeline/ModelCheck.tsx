import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/utils";
import type { ModelCheckMetric } from "./types";

function errorTone(error: number): string {
  const size = Math.abs(error);
  if (size < 0.15) return "text-emerald-600 dark:text-emerald-400";
  if (size < 0.35) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function formatError(error: number): string {
  const percent = Math.round(error * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

/** How close our replay of the load gets to Lighthouse's own simulated FCP and LCP. */
export function ModelCheck({ metrics }: { metrics: ModelCheckMetric[] }) {
  return (
    <details
      className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs text-muted-foreground"
      data-testid="model-check"
    >
      <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-foreground/80">Model check</span>
        {metrics.map((metric) => (
          <span key={metric.label} className="ml-3 tabular-nums">
            {metric.label}{" "}
            <span className={cn("font-medium", errorTone(metric.error))}>
              {formatError(metric.error)}
            </span>
          </span>
        ))}
        <span className="ml-3 opacity-70">vs Lighthouse</span>
      </summary>
      <div className="mt-1.5 space-y-1">
        <p>
          We replay this page load the way Lighthouse does (connections, TCP slow start, shared
          bandwidth, CPU slowdown) and compare to its simulated metrics. Positive means our replay
          is slower. A large gap means request and CPU timings on this timeline are less reliable.
        </p>
        <ul className="grid gap-0.5 tabular-nums sm:grid-cols-2">
          {metrics.map((metric) => (
            <li key={metric.label}>
              {metric.label}: Lighthouse {formatMs(metric.lighthouseMs)}, replay{" "}
              {formatMs(metric.modelMs)}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
