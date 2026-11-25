"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { buildFixPrompt } from "@/features/page-speed-insights/dashboard-view/investigate/fixPrompt";
import { formFactorOf } from "@/features/page-speed-insights/dashboard-view/investigate/metricScoring";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { LCP_PHASE_COLORS } from "@/features/page-speed-insights/shared/lcpPhaseColors";
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { LONG_TASK_BAR_COLOR } from "@/features/page-speed-insights/waterfall/WaterfallBarTrack";
import { getSegmentStyle } from "@/features/page-speed-insights/waterfall/waterfallData";
import { cn } from "@/lib/utils";
import {
  EXPLAIN_MODES,
  buildExplainView,
  type ExplainMode,
  type ExplainView,
} from "./explainMetricModel";
import type { CombinedLoad } from "./timelineSourceTypes";

export type ExplainEntry = { label: string; load: CombinedLoad };

const NAME_COL = "w-32 shrink-0 sm:w-48";
const MIN_FRAME_GAP_PCT = 9;

function Track({ view, children }: { view: ExplainView; children?: React.ReactNode }) {
  return (
    <div className="relative h-5 min-w-0 flex-1 rounded-sm bg-muted/40">
      {view.markers.map((m) => (
        <span
          key={m.id}
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/40"
          style={{ left: `${(m.timeMs / view.axisEndMs) * 100}%` }}
        />
      ))}
      {children}
    </div>
  );
}

function ExplainRows({
  view,
  selectedId,
  onSelect,
}: {
  view: ExplainView;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {view.rows.map((row) => {
        const style = getSegmentStyle(row.startMs, row.endMs, 0, view.axisEndMs);
        const startPct = (row.startMs / view.axisEndMs) * 100;
        return (
          <button
            key={row.id}
            type="button"
            data-testid="explain-row"
            data-relevant={row.relevant}
            aria-pressed={selectedId === row.id}
            onClick={() => onSelect(row.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm py-0.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedId === row.id && "bg-muted",
              !row.relevant && "opacity-30",
            )}
          >
            <span className={cn(NAME_COL, "truncate text-xs")} title={row.name}>
              {row.name}
            </span>
            <Track view={view}>
              <span
                className={cn(
                  "absolute top-1 h-3 rounded-sm",
                  row.kind === "task" ? LONG_TASK_BAR_COLOR : getNetworkBarColor(row.type),
                )}
                style={style}
              />
              {row.note ? (
                <span
                  className={cn(
                    "absolute top-0 whitespace-nowrap text-[10px] leading-5 text-foreground",
                    startPct > 60 ? "-translate-x-full pr-1" : "pl-1",
                  )}
                  style={{
                    left: `${startPct > 60 ? startPct : Math.min(100, parseFloat(style.left) + parseFloat(style.width))}%`,
                  }}
                >
                  {row.note}
                </span>
              ) : null}
            </Track>
          </button>
        );
      })}
    </>
  );
}

function Filmstrip({ view }: { view: ExplainView }) {
  const frames = view.frames.reduce<typeof view.frames>((kept, frame) => {
    const pct = (frame.timeMs / view.axisEndMs) * 100;
    const last = kept[kept.length - 1];
    const lastPct = last ? (last.timeMs / view.axisEndMs) * 100 : -Infinity;
    return pct > 100 || pct - lastPct < MIN_FRAME_GAP_PCT ? kept : [...kept, frame];
  }, []);
  if (!frames.length) return null;
  return (
    <div className="flex items-start gap-2" data-testid="explain-filmstrip">
      <span className={cn(NAME_COL, "pt-1 text-xs text-muted-foreground")}>Filmstrip</span>
      <div className="relative h-16 min-w-0 flex-1">
        {frames.map((frame) => (
          <img
            key={frame.timeMs}
            src={frame.data}
            alt={`Page at ${formatMs(frame.timeMs)}`}
            className="absolute top-0 h-14 w-auto rounded-sm border"
            style={{ left: `${(frame.timeMs / view.axisEndMs) * 100}%` }}
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}

function DetailPanel({
  view,
  rowId,
  prompt,
}: {
  view: ExplainView;
  rowId: string;
  prompt: (
    title: string,
    fix: string,
    auditId: string,
    evidence: { k: string; v: string }[],
  ) => string;
}) {
  const details = view.details(rowId);
  if (!details) return null;
  return (
    <aside
      className="flex min-w-0 flex-col gap-3 rounded-md border bg-card p-3 text-sm"
      data-testid="explain-detail"
    >
      <h4 className="break-words font-semibold">{details.name}</h4>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {details.facts.map((fact) => (
          <div key={fact.k} className="contents">
            <dt className="text-muted-foreground">{fact.k}</dt>
            <dd className="min-w-0 break-all">{fact.v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Why it matters
        </p>
        <p>{details.why}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Change</p>
        <p>{details.fix}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton
          text={prompt(details.name, details.fix, details.auditId, details.facts)}
          size="sm"
          title="Copy fix prompt"
        >
          <span className="ml-1.5">Copy fix prompt</span>
        </CopyButton>
        {details.auditId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patchDashboardSearch({ tab: "audits", audit: details.auditId }, "push")}
          >
            Raw audit
          </Button>
        ) : null}
      </div>
    </aside>
  );
}

export function ExplainMetric({ entries }: { entries: ExplainEntry[] }) {
  const items = usePageSpeedItems();
  const [mode, setMode] = useState<ExplainMode>("LCP");
  const [labelPick, setLabelPick] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entry = entries.find((e) => e.label === labelPick) ?? entries[0];
  const item = items.find((i) => i.label === entry?.label)?.item;
  const audits = item?.lighthouseResult?.audits;
  const view = useMemo(
    () => (entry ? buildExplainView(entry.load, mode, audits) : null),
    [entry, mode, audits],
  );
  if (!entry || !view) return null;

  const url = item?.lighthouseResult?.finalUrl ?? item?.lighthouseResult?.requestedUrl ?? "";
  const buildPrompt = (
    title: string,
    fix: string,
    auditId: string,
    evidence: { k: string; v: string }[],
  ) =>
    buildFixPrompt({
      url,
      formFactor: item ? formFactorOf(item) : "mobile",
      metric: mode,
      title,
      evidence,
      fix,
      auditId: auditId || undefined,
    });
  const selected = selectedId && view.rows.some((r) => r.id === selectedId) ? selectedId : null;

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border bg-card p-3"
      data-testid="explain-metric"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Explain a metric on the load timeline</h3>
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 1 ? (
            <div className="flex gap-1" role="group" aria-label="Report to explain">
              {entries.map((e) => (
                <Button
                  key={e.label}
                  type="button"
                  size="sm"
                  variant={e === entry ? "default" : "outline"}
                  aria-pressed={e === entry}
                  aria-label={`Explain ${e.label?.trim() || "Report"}`}
                  onClick={() => {
                    setLabelPick(e.label);
                    setSelectedId(null);
                  }}
                >
                  {e.label?.trim() || "Report"}
                </Button>
              ))}
            </div>
          ) : null}
          <div role="tablist" aria-label="Metric" className="flex gap-1">
            {EXPLAIN_MODES.map((m) => (
              <Button
                key={m}
                type="button"
                role="tab"
                size="sm"
                variant={m === mode ? "default" : "outline"}
                aria-selected={m === mode}
                onClick={() => {
                  setMode(m);
                  setSelectedId(null);
                }}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-md border bg-muted/40 p-3">
        <p className="font-medium" data-testid="explain-headline">
          {view.headline}
        </p>
        <p className="text-sm text-muted-foreground">{view.sub}</p>
      </div>
      <div className={cn("grid gap-3", selected && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <div className="min-w-0 overflow-x-auto">
          <div className="flex min-w-[36rem] flex-col gap-1">
            <Filmstrip view={view} />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className={NAME_COL} />
              <div className="relative h-4 min-w-0 flex-1">
                {view.ticks.map((tick) => (
                  <span
                    key={tick}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${(tick / view.axisEndMs) * 100}%` }}
                  >
                    {formatMs(tick)}
                  </span>
                ))}
              </div>
            </div>
            {view.markers.length ? (
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <span className={NAME_COL} />
                <div className="relative h-4 min-w-0 flex-1">
                  {view.markers.map((m) => (
                    <span
                      key={m.id}
                      className="absolute -translate-x-1/2 whitespace-nowrap"
                      style={{ left: `${(m.timeMs / view.axisEndMs) * 100}%` }}
                    >
                      {m.label} {formatMs(m.timeMs)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {view.phases.length ? (
              <div className="flex items-center gap-2" data-testid="explain-phases">
                <span className={cn(NAME_COL, "text-xs text-muted-foreground")}>LCP phases</span>
                <Track view={view}>
                  {view.phases.map((p) => (
                    <span
                      key={p.id}
                      title={`${p.label} ${formatMs(p.endMs - p.startMs)}`}
                      className={cn(
                        "absolute top-1 h-3",
                        LCP_PHASE_COLORS[p.id] ?? "bg-muted-foreground/60",
                      )}
                      style={getSegmentStyle(p.startMs, p.endMs, 0, view.axisEndMs)}
                    />
                  ))}
                </Track>
              </div>
            ) : null}
            <ExplainRows view={view} selectedId={selected} onSelect={setSelectedId} />
          </div>
        </div>
        {selected ? <DetailPanel view={view} rowId={selected} prompt={buildPrompt} /> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Bars use network resource colors; red bars are long tasks; vertical lines mark TTFB, FCP and
        LCP. Faded rows don&apos;t affect the selected metric.
      </p>
    </section>
  );
}
