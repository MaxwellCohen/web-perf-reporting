export function TimelineLegend({ simulationLabel }: { simulationLabel?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-rose-500" /> Blocking
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-amber-500" /> Core Web Vital
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-2 rounded-full bg-sky-500" /> Marker
      </span>
      <span className="text-muted-foreground/80">Scroll down from 0 ms</span>
      {simulationLabel ? (
        <span className="text-muted-foreground/80">Times include simulated {simulationLabel}</span>
      ) : null}
    </div>
  );
}
