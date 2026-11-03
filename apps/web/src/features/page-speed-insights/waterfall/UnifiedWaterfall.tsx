"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import type { TimelineEvent } from "@/features/page-speed-insights/page-load-timeline/types";
import { ResourceTypeLegend } from "@/features/page-speed-insights/waterfall/WaterfallLegend";
import {
  TypeAndSignalFilterDropdown,
  WaterfallFilterField,
  WaterfallRowCount,
  WaterfallRowsField,
  WaterfallSearchField,
  WaterfallSortField,
  WaterfallToolbar,
} from "@/features/page-speed-insights/waterfall/WaterfallToolbarParts";
import { InteractiveWaterfall } from "@/features/page-speed-insights/waterfall/InteractiveWaterfall";
import {
  buildGuidesFromEvents,
  filterGuidesByTimeRange,
} from "@/features/page-speed-insights/waterfall/guides";
import { TimeRangeFilter } from "@/features/page-speed-insights/waterfall/TimeRangeFilter";
import {
  resolveTaskFilterSelection,
  type TaskFilterSelection,
} from "@/features/page-speed-insights/page-load-timeline/filterTimelineMoments";
import { filterWaterfallRowsByTasks } from "@/features/page-speed-insights/waterfall/filterWaterfallByTasks";
import {
  availableWaterfallSignals,
  filterWaterfallRowsBySignals,
  normalizeWaterfallSignals,
  type WaterfallSignalContext,
  type WaterfallSignalId,
} from "@/features/page-speed-insights/waterfall/waterfallSignals";
import {
  buildWaterfallRowsFromSources,
  countRequestRows,
  filterWaterfallRows,
  filterWaterfallRowsByTimeRange,
  getWaterfallResourceTypes,
  sortWaterfallRows,
  type WaterfallDensity,
} from "@/features/page-speed-insights/waterfall/waterfallData";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/utils";

function scrollToMoment(eventId: string, idPrefix?: string) {
  const id = idPrefix ? `timeline-moment-${idPrefix}-${eventId}` : `timeline-moment-${eventId}`;
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type OverviewFocus = "all" | "blocking";

function isBlockingRow(row: { renderBlocking?: string; kind: string }): boolean {
  if (row.kind === "task") return true;
  return row.renderBlocking === "blocking" || row.renderBlocking === "potentially-blocking";
}

export type UnifiedWaterfallProps = {
  load: CombinedLoad;
  /** Timeline events used for CWV/lifecycle guide markers. */
  events?: TimelineEvent[];
  axisEndMs: number;
  stickyTopPx?: number;
  /** Prefix for moment anchor ids when multiple timelines are mounted. */
  momentIdPrefix?: string;
};

function useUnifiedWaterfallModel({
  load,
  events = [],
  axisEndMs,
  stickyTopPx = 0,
  momentIdPrefix,
}: UnifiedWaterfallProps) {
  const {
    types: resourceTypes,
    sort: sortBy,
    rows: density,
    blockingOnly,
    query: search,
    tasks,
    signals: signalParams,
  } = useDashboardSearchState();
  const [rangeStartMs, setRangeStartMs] = useState(0);
  const [rangeEndMs, setRangeEndMs] = useState(axisEndMs);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const focus: OverviewFocus = blockingOnly ? "blocking" : "all";
  const rangeScope = `${load.label}:${axisEndMs}`;
  const [appliedRangeScope, setAppliedRangeScope] = useState(rangeScope);
  if (appliedRangeScope !== rangeScope) {
    setAppliedRangeScope(rangeScope);
    setRangeStartMs(0);
    setRangeEndMs(axisEndMs);
    setSelectedRowId(null);
  }

  const signals = useMemo(() => normalizeWaterfallSignals(signalParams), [signalParams]);

  const signalContext = useMemo<WaterfallSignalContext>(
    () => ({
      ...(load.fcp != null ? { fcpMs: load.fcp } : {}),
      ...(load.lcp != null ? { lcpMs: load.lcp } : {}),
    }),
    [load.fcp, load.lcp],
  );

  const enabledTasks = useMemo<TaskFilterSelection>(
    () => resolveTaskFilterSelection(tasks),
    [tasks],
  );

  const builtRows = useMemo(
    () =>
      buildWaterfallRowsFromSources(load, {
        density: density as WaterfallDensity,
      }),
    [load, density],
  );

  const allRows = useMemo(
    () => filterWaterfallRowsByTasks(builtRows, enabledTasks),
    [builtRows, enabledTasks],
  );

  const resourceTypeOptions = getWaterfallResourceTypes(builtRows);
  const signalOptions = useMemo(
    () => availableWaterfallSignals(allRows, signalContext),
    [allRows, signalContext],
  );
  const guides = useMemo(() => buildGuidesFromEvents(events), [events]);

  const rangeActive = rangeStartMs > 0 || rangeEndMs < axisEndMs;
  const rangedRows = rangeActive
    ? filterWaterfallRowsByTimeRange(allRows, rangeStartMs, rangeEndMs)
    : allRows;
  const rangedGuides = rangeActive
    ? filterGuidesByTimeRange(guides, rangeStartMs, rangeEndMs)
    : guides;

  const blockingRows = rangedRows.filter(isBlockingRow);
  const focusRows = focus === "blocking" ? blockingRows : rangedRows;

  const filtered = filterWaterfallRows(focusRows, {
    resourceTypes,
    search,
    blockingOnly: false,
  });
  const displayRows = sortWaterfallRows(
    filterWaterfallRowsBySignals(filtered, signals, signalContext),
    sortBy,
  );

  const timeRange = {
    minStart: rangeStartMs,
    maxEnd: Math.max(rangeEndMs, rangeStartMs + 1),
  };

  const cwvCount = rangedGuides.filter((g) => g.kind === "cwv").length;
  const rowCountLabel =
    density === "collapsed"
      ? `${displayRows.length} rows · ${countRequestRows(displayRows)} requests`
      : `${displayRows.length} of ${allRows.length} rows`;

  const eventCount = rangeActive
    ? `${rangedRows.length} of ${allRows.length} rows`
    : `${allRows.length} rows`;

  function setFocusMode(next: OverviewFocus) {
    setSelectedRowId(null);
    patchDashboardSearch({ blockingOnly: next === "blocking" });
  }

  function setSignals(next: readonly WaterfallSignalId[]) {
    setSelectedRowId(null);
    const normalized = normalizeWaterfallSignals(next);
    patchDashboardSearch({ signals: normalized.length ? normalized : null });
  }

  return {
    axisEndMs,
    stickyTopPx,
    momentIdPrefix,
    density,
    sortBy,
    search,
    resourceTypes,
    resourceTypeOptions,
    signalOptions,
    signals,
    setSignals,
    focus,
    setFocusMode,
    rowCountLabel,
    displayRows,
    timeRange,
    rangedGuides,
    rangedRows,
    blockingRows,
    selectedRowId,
    setSelectedRowId,
    rangeStartMs,
    rangeEndMs,
    setRangeStartMs,
    setRangeEndMs,
    eventCount,
    cwvCount,
  };
}

type UnifiedWaterfallModel = ReturnType<typeof useUnifiedWaterfallModel>;

const SUMMARY_ID = "timeline-overview-summary";

function WaterfallPanel({ model }: { model: UnifiedWaterfallModel }) {
  const {
    stickyTopPx,
    momentIdPrefix,
    density,
    sortBy,
    search,
    resourceTypes,
    resourceTypeOptions,
    signalOptions,
    signals,
    setSignals,
    focus,
    rowCountLabel,
    displayRows,
    timeRange,
    rangedGuides,
    selectedRowId,
    setSelectedRowId,
  } = model;

  return (
    <div
      id={momentIdPrefix ? `timeline-overview-panel-${momentIdPrefix}` : "timeline-overview-panel"}
      role="region"
      aria-labelledby={SUMMARY_ID}
      className="space-y-2"
    >
      <>
        <WaterfallToolbar>
          <WaterfallFilterField>
            <TypeAndSignalFilterDropdown
              typeOptions={resourceTypeOptions}
              resourceTypes={resourceTypes}
              onResourceTypesChange={(next) =>
                patchDashboardSearch({ types: next.length ? next : null })
              }
              availableSignals={signalOptions}
              signals={signals}
              onSignalsChange={setSignals}
              onApplyPreset={setSignals}
            />
          </WaterfallFilterField>
          <WaterfallRowsField
            value={density}
            onChange={(value) => {
              setSelectedRowId(null);
              patchDashboardSearch({ rows: value });
            }}
          />
          <WaterfallSortField value={sortBy} onChange={(sort) => patchDashboardSearch({ sort })} />
          <WaterfallSearchField
            value={search}
            onChange={(next) => {
              if (next === search) return;
              patchDashboardSearch({ query: next });
            }}
          />
          <WaterfallRowCount>{rowCountLabel}</WaterfallRowCount>
        </WaterfallToolbar>

        <ResourceTypeLegend
          types={resourceTypeOptions}
          availableSignals={signalOptions}
          selectedSignals={signals}
          onToggleSignal={(id) =>
            setSignals(
              signals.includes(id) ? signals.filter((item) => item !== id) : [...signals, id],
            )
          }
        />

        <div
          className="min-w-0"
          style={stickyTopPx > 0 ? { scrollMarginTop: stickyTopPx } : undefined}
        >
          <InteractiveWaterfall
            rows={displayRows}
            timeRange={timeRange}
            guides={rangedGuides}
            selectedId={selectedRowId}
            onSelectRow={setSelectedRowId}
            onActivateMoment={(eventId) => scrollToMoment(eventId, momentIdPrefix)}
            heightSize="full"
            overview
            emptyMessage={
              signals.length
                ? "No rows match these signals."
                : focus === "blocking"
                  ? "No blocking work in this view."
                  : "No events in this time range."
            }
          />
        </div>
      </>
    </div>
  );
}

function WaterfallControls({
  model,
  className,
}: {
  model: UnifiedWaterfallModel;
  className?: string;
}) {
  const {
    axisEndMs,
    focus,
    setFocusMode,
    rangedRows,
    blockingRows,
    rangeStartMs,
    rangeEndMs,
    setRangeStartMs,
    setRangeEndMs,
    setSelectedRowId,
  } = model;

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <div
        role="group"
        aria-label="Overview focus"
        data-testid="overview-focus"
        className="flex flex-wrap items-center gap-1"
      >
        <button
          type="button"
          aria-pressed={focus === "all"}
          onClick={() => setFocusMode("all")}
          className={cn(
            "rounded border px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            focus === "all"
              ? "border-transparent bg-foreground text-background"
              : "border-border bg-background text-foreground",
          )}
        >
          All ({rangedRows.length})
        </button>
        <button
          type="button"
          aria-pressed={focus === "blocking"}
          disabled={blockingRows.length === 0}
          onClick={() => setFocusMode("blocking")}
          className={cn(
            "rounded border px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            focus === "blocking"
              ? "border-transparent bg-rose-600 text-white"
              : "border-border bg-background text-foreground",
            blockingRows.length === 0 && "opacity-50",
          )}
        >
          Blocking ({blockingRows.length})
        </button>
      </div>
      {axisEndMs > 0 ? (
        <TimeRangeFilter
          axisEndMs={axisEndMs}
          startMs={rangeStartMs}
          endMs={rangeEndMs}
          onChange={(startMs, endMs) => {
            setRangeStartMs(startMs);
            setRangeEndMs(endMs);
            setSelectedRowId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Always-expanded waterfall with its filters (hosts like ClassicView already collapse it). */
export function UnifiedWaterfall(props: UnifiedWaterfallProps) {
  const model = useUnifiedWaterfallModel(props);

  return (
    <div className="space-y-1.5" data-testid="timeline-overview">
      <div className="flex flex-col gap-1.5">
        <p id={SUMMARY_ID} className="text-xs font-semibold tracking-tight">
          Waterfall view
        </p>
        <WaterfallControls model={model} />
      </div>
      <WaterfallPanel model={model} />
    </div>
  );
}

/** Waterfall that starts collapsed behind a summary toggle. */
export function CollapsibleUnifiedWaterfall(props: UnifiedWaterfallProps) {
  const model = useUnifiedWaterfallModel(props);
  const [open, setOpen] = useState(false);
  const { momentIdPrefix, eventCount, cwvCount, blockingRows, rangeStartMs, rangeEndMs } = model;

  return (
    <div className="space-y-1.5" data-testid="timeline-overview">
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={
            momentIdPrefix ? `timeline-overview-panel-${momentIdPrefix}` : "timeline-overview-panel"
          }
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 items-start gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:items-center"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 sm:mt-0",
              !open && "-rotate-90",
            )}
          />
          <span className="min-w-0 flex-1">
            <p id={SUMMARY_ID} className="text-xs font-semibold tracking-tight">
              Waterfall view
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {eventCount}
              {cwvCount > 0 ? ` · ${cwvCount} CWV` : ""}
              {blockingRows.length > 0 ? ` · ${blockingRows.length} blocking` : ""}
              {" · "}
              {formatMs(rangeStartMs)}–{formatMs(rangeEndMs)}
            </p>
          </span>
        </button>
        {open ? <WaterfallControls model={model} className="pl-5" /> : null}
      </div>
      {open ? <WaterfallPanel model={model} /> : null}
    </div>
  );
}
