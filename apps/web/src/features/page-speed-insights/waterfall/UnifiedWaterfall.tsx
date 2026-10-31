"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  patchDashboardSearch,
  type DashboardRowDensity,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import type { TimelineEvent } from "@/features/page-speed-insights/page-load-timeline/types";
import { InteractiveWaterfall } from "@/features/page-speed-insights/waterfall/InteractiveWaterfall";
import {
  buildGuidesFromEvents,
  filterGuidesByTimeRange,
} from "@/features/page-speed-insights/waterfall/guides";
import { TimeRangeFilter } from "@/features/page-speed-insights/waterfall/TimeRangeFilter";
import { WATERFALL_SPECIAL_LEGEND } from "@/features/page-speed-insights/waterfall/WaterfallBarTrack";
import {
  resolveTaskFilterSelection,
  type TaskFilterSelection,
} from "@/features/page-speed-insights/page-load-timeline/filterTimelineMoments";
import { filterWaterfallRowsByTasks } from "@/features/page-speed-insights/waterfall/filterWaterfallByTasks";
import {
  WATERFALL_DEBUG_PRESETS,
  WATERFALL_SIGNAL_GROUPS,
} from "@/features/page-speed-insights/waterfall/waterfallDebugPresets";
import {
  availableWaterfallSignals,
  filterWaterfallRowsBySignals,
  isWaterfallSignalId,
  normalizeWaterfallSignals,
  WATERFALL_SIGNAL_LABEL,
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
  type WaterfallSortBy,
} from "@/features/page-speed-insights/waterfall/waterfallData";
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { toggleMultiSelect } from "@/features/page-speed-insights/shared/MultiSelectFilterDropdown";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { cn } from "@/lib/utils";

function scrollToMoment(eventId: string, idPrefix?: string) {
  const id = idPrefix
    ? `timeline-moment-${idPrefix}-${eventId}`
    : `timeline-moment-${eventId}`;
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type OverviewFocus = "all" | "blocking";

const QUEUE_SWATCH =
  "bg-slate-400/60 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,0,0,0.06)_2px,rgba(0,0,0,0.06)_4px)] dark:bg-slate-500/50";
const CHAIN_SWATCH =
  "bg-sky-600/80 shadow-[inset_0_-2px_0_0] shadow-sky-950 ring-1 ring-sky-700 dark:bg-sky-300/70 dark:shadow-sky-100 dark:ring-sky-200";

function LegendSwatch({
  label,
  swatchClassName,
  wide = false,
}: {
  label: string;
  swatchClassName: string;
  wide?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className={cn("h-1.5 shrink-0 rounded-sm", wide ? "w-2.5" : "w-1.5", swatchClassName)} />
      {label}
    </span>
  );
}

function LegendSignalButton({
  id,
  label,
  swatchClassName,
  pressed,
  wide = false,
  onToggle,
}: {
  id: WaterfallSignalId;
  label: string;
  swatchClassName: string;
  pressed: boolean;
  wide?: boolean;
  onToggle: (id: WaterfallSignalId) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-testid={`legend-signal-${id}`}
      onClick={() => onToggle(id)}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1 text-[10px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        pressed ? "bg-muted text-foreground ring-1 ring-foreground" : "text-muted-foreground",
      )}
    >
      <span className={cn("h-1.5 shrink-0 rounded-sm", wide ? "w-2.5" : "w-1.5", swatchClassName)} />
      {label}
    </button>
  );
}

function ResourceTypeLegend({
  types,
  availableSignals,
  selectedSignals,
  onToggleSignal,
}: {
  types: string[];
  availableSignals: readonly WaterfallSignalId[];
  selectedSignals: readonly WaterfallSignalId[];
  onToggleSignal: (id: WaterfallSignalId) => void;
}) {
  const available = new Set(availableSignals);

  function signalItem(
    id: WaterfallSignalId,
    label: string,
    swatchClassName: string,
    wide = false,
  ) {
    if (!available.has(id) && !selectedSignals.includes(id)) {
      return <LegendSwatch key={id} label={label} swatchClassName={swatchClassName} wide={wide} />;
    }
    return (
      <LegendSignalButton
        key={id}
        id={id}
        label={label}
        swatchClassName={swatchClassName}
        wide={wide}
        pressed={selectedSignals.includes(id)}
        onToggle={onToggleSignal}
      />
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
      data-testid="waterfall-resource-type-legend"
    >
      {types.map((type) => (
        <LegendSwatch key={type} label={toTitleCase(type)} swatchClassName={getNetworkBarColor(type)} />
      ))}
      {WATERFALL_SPECIAL_LEGEND.map((entry) =>
        isWaterfallSignalId(entry.key)
          ? signalItem(entry.key, entry.label, entry.className)
          : null,
      )}
      {signalItem("queue", "Queue", QUEUE_SWATCH, true)}
      {signalItem("chain", "Critical chain", CHAIN_SWATCH, true)}
    </div>
  );
}

function typeAndSignalFilterLabel(
  resourceTypes: string[],
  signals: readonly WaterfallSignalId[],
): string {
  const typeActive = resourceTypes.length > 0;
  const signalActive = signals.length > 0;
  if (!typeActive && !signalActive) return "All filters";
  if (typeActive && !signalActive) {
    return resourceTypes.length === 1
      ? toTitleCase(resourceTypes[0] ?? "")
      : `${resourceTypes.length} types`;
  }
  if (!typeActive && signalActive) {
    return signals.length === 1
      ? WATERFALL_SIGNAL_LABEL[signals[0]!]
      : `${signals.length} signals`;
  }
  const count = resourceTypes.length + signals.length;
  return count === 2
    ? `${toTitleCase(resourceTypes[0] ?? "")}, ${WATERFALL_SIGNAL_LABEL[signals[0]!]}`
    : `${count} filters`;
}

function listedSignalsInGroup(
  groupIds: readonly WaterfallSignalId[],
  available: ReadonlySet<WaterfallSignalId>,
  selected: readonly WaterfallSignalId[],
): WaterfallSignalId[] {
  return groupIds.filter((id) => available.has(id) || selected.includes(id));
}

function TypeAndSignalFilterDropdown({
  typeOptions,
  resourceTypes,
  onResourceTypesChange,
  availableSignals,
  signals,
  onSignalsChange,
  onApplyPreset,
}: {
  typeOptions: string[];
  resourceTypes: string[];
  onResourceTypesChange: (next: string[]) => void;
  availableSignals: readonly WaterfallSignalId[];
  signals: readonly WaterfallSignalId[];
  onSignalsChange: (next: WaterfallSignalId[]) => void;
  onApplyPreset: (presetSignals: WaterfallSignalId[]) => void;
}) {
  const available = useMemo(() => new Set(availableSignals), [availableSignals]);
  const hasActiveFilter = resourceTypes.length > 0 || signals.length > 0;
  const label = typeAndSignalFilterLabel(resourceTypes, signals);
  const signalGroups = WATERFALL_SIGNAL_GROUPS.map((group) => ({
    ...group,
    options: listedSignalsInGroup(group.ids, available, signals),
  })).filter((group) => group.options.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full lg:w-auto"
          data-testid="waterfall-signal-filter"
          aria-label="Filter waterfall by loading metrics, resource types, and signals"
        >
          {label} <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-0">
        <div className="max-h-72 overflow-y-auto overscroll-y-contain p-1">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Quick presets
          </DropdownMenuLabel>
          {WATERFALL_DEBUG_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              className="flex flex-col items-start gap-0.5 py-2"
              onSelect={() => {
                onResourceTypesChange([]);
                onApplyPreset(preset.signals);
              }}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="text-xs text-muted-foreground">{preset.description}</span>
            </DropdownMenuItem>
          ))}
          {signalGroups.length > 0 ? <div className="my-1 border-t" /> : null}
          {signalGroups.map((group) => (
            <div key={group.label}>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {group.label}
              </DropdownMenuLabel>
              {group.options.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={signals.includes(option)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? normalizeWaterfallSignals([...signals, option])
                      : signals.filter((item) => item !== option);
                    onSignalsChange(next);
                  }}
                >
                  {WATERFALL_SIGNAL_LABEL[option]}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          ))}
          {typeOptions.length > 0 ? (
            <>
              <div className="my-1 border-t" />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Resource types
              </DropdownMenuLabel>
              {typeOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={resourceTypes.length === 0 || resourceTypes.includes(option)}
                  onCheckedChange={(checked) => {
                    onResourceTypesChange(
                      toggleMultiSelect(typeOptions, resourceTypes, option, checked),
                    );
                  }}
                >
                  {toTitleCase(option)}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          ) : null}
        </div>
        {hasActiveFilter ? (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onResourceTypesChange([]);
                onSignalsChange([]);
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-0.5 sm:w-[calc(50%-0.25rem)] lg:w-auto", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

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
  /** When false, omit collapse chrome (ClassicView accordion already collapses). */
  collapsible?: boolean;
  showToolbar?: boolean;
  /** Prefix for moment anchor ids when multiple timelines are mounted. */
  momentIdPrefix?: string;
};

export function UnifiedWaterfall({
  load,
  events = [],
  axisEndMs,
  stickyTopPx = 0,
  collapsible = true,
  showToolbar = true,
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
  const [open, setOpen] = useState(false);
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

  const summaryId = "timeline-overview-summary";
  const panelOpen = collapsible ? open : true;

  function setFocusMode(next: OverviewFocus) {
    setSelectedRowId(null);
    patchDashboardSearch({ blockingOnly: next === "blocking" });
  }

  function setSignals(next: readonly WaterfallSignalId[]) {
    setSelectedRowId(null);
    const normalized = normalizeWaterfallSignals(next);
    patchDashboardSearch({ signals: normalized.length ? normalized : null });
  }

  const body = (
    <>
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarField label="Filter">
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
          </ToolbarField>

          <ToolbarField label="Rows">
            <Select
              value={density}
              onValueChange={(value) => {
                setSelectedRowId(null);
                patchDashboardSearch({ rows: value as DashboardRowDensity });
              }}
            >
              <SelectTrigger className="h-8 w-full lg:w-35" aria-label="Waterfall rows">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expanded">Expanded</SelectItem>
                <SelectItem value="collapsed">Collapsed</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField label="Sort">
            <Select
              value={sortBy}
              onValueChange={(value) => patchDashboardSearch({ sort: value as WaterfallSortBy })}
            >
              <SelectTrigger className="h-8 w-full lg:w-35" aria-label="Sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start time</SelectItem>
                <SelectItem value="end">End time</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="size">Transfer size</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>

          <ToolbarField label="Search" className="sm:w-full lg:min-w-40 lg:flex-1">
            <DebouncedInput
              value={search}
              onChange={(value) => {
                const next = String(value);
                if (next === search) return;
                patchDashboardSearch({ query: next });
              }}
              placeholder="Search URL…"
              aria-label="Search URL"
              className="h-8 w-full"
            />
          </ToolbarField>

          <p className="w-full text-xs text-muted-foreground lg:ml-auto lg:w-auto">
            {rowCountLabel}
          </p>
        </div>
      ) : null}

      {showToolbar ? (
        <ResourceTypeLegend
          types={resourceTypeOptions}
          availableSignals={signalOptions}
          selectedSignals={signals}
          onToggleSignal={(id) =>
            setSignals(signals.includes(id) ? signals.filter((item) => item !== id) : [...signals, id])
          }
        />
      ) : null}

      <div className="min-w-0" style={stickyTopPx > 0 ? { scrollMarginTop: stickyTopPx } : undefined}>
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
  );

  return (
    <div className="space-y-1.5" data-testid="timeline-overview">
      <div className="flex flex-col gap-1.5">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={
              momentIdPrefix
                ? `timeline-overview-panel-${momentIdPrefix}`
                : "timeline-overview-panel"
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
              <p id={summaryId} className="text-xs font-semibold tracking-tight">
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
        ) : (
          <p id={summaryId} className="text-xs font-semibold tracking-tight">
            Waterfall view
          </p>
        )}

        {panelOpen ? (
          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
              collapsible && "pl-5",
            )}
          >
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
        ) : null}
      </div>

      {panelOpen ? (
        <div
          id={
            momentIdPrefix
              ? `timeline-overview-panel-${momentIdPrefix}`
              : "timeline-overview-panel"
          }
          role="region"
          aria-labelledby={summaryId}
          className="space-y-2"
        >
          {body}
        </div>
      ) : null}
    </div>
  );
}
