"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { CollapsibleUnifiedWaterfall } from "@/features/page-speed-insights/waterfall/UnifiedWaterfall";
import { AlignedCompareMoments } from "./AlignedCompareMoments";
import { buildPageLoadTimelineBundles } from "./buildPageLoadTimeline";
import {
  TASK_FILTERS,
  availableTaskFilters,
  resolveTaskFilterSelection,
  type TaskFilterId,
} from "./filterTimelineMoments";
import { momentIdPrefixFromLabel } from "./MomentRow";
import { TaskFilters } from "./TaskFilters";
import { TimelineLegend } from "./TimelineLegend";
import { TimelinePane, TimelinePaneLabel, timelineDisplayName } from "./TimelinePane";
import {
  TIMELINE_COMPARE_MAX,
  filterBundleTimeline,
  resolveSelectedLabels,
  toggleSelectedLabel,
} from "./timelineSelection";
import { timelineToMarkdown } from "./timelineToMarkdown";
import { useElementHeight } from "./useElementHeight";
import { TimelineMoments, VerticalTimeline } from "./VerticalTimeline";

export function PageLoadTimeline() {
  const items = usePageSpeedItems();
  const bundles = useMemo(() => buildPageLoadTimelineBundles(items), [items]);
  const { report, tasks } = useDashboardSearchState();
  const { ref: stickyHeaderRef, height: stickyTopPx } = useElementHeight<HTMLDivElement>();
  const enabledTasks = resolveTaskFilterSelection(tasks);

  const labeledBundles = bundles.map((bundle) => ({ label: bundle.timeline.label, bundle }));

  const selectedLabels = resolveSelectedLabels(report, bundles, labeledBundles);

  const selectedEntries = selectedLabels
    .map((label) => labeledBundles.find((entry) => entry.label === label))
    .filter((entry): entry is (typeof labeledBundles)[number] => entry != null);

  const comparing = selectedEntries.length === TIMELINE_COMPARE_MAX;
  const primary = selectedEntries[0] ?? null;

  const taskSourceEvents = comparing
    ? selectedEntries.flatMap((entry) => entry.bundle.timeline.events)
    : (primary?.bundle.timeline.events ?? []);
  const taskOptions = availableTaskFilters(taskSourceEvents);

  if (!bundles.length || !primary) {
    return (
      <p className="px-1 py-6 text-sm text-muted-foreground" role="status">
        No lab metrics available to build a page load timeline.
      </p>
    );
  }

  function toggleTask(id: TaskFilterId) {
    const next = new Set(enabledTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const ordered = TASK_FILTERS.filter((filter) => next.has(filter));
    patchDashboardSearch({
      tasks: ordered.length === TASK_FILTERS.length ? null : ordered,
    });
  }

  function selectReport(label: string) {
    patchDashboardSearch({ report: toggleSelectedLabel(selectedLabels, label) });
  }

  const filteredEntries = selectedEntries.map((entry) => ({
    ...entry,
    timeline: filterBundleTimeline(entry.bundle, enabledTasks),
  }));

  const sharedAxisEndMs = Math.max(
    ...filteredEntries.map((entry) => entry.bundle.timeline.axisEndMs),
    0,
  );
  const panes = filteredEntries.map((entry) => ({
    ...entry,
    timeline: comparing ? { ...entry.timeline, axisEndMs: sharedAxisEndMs } : entry.timeline,
  }));

  const shownCount = panes.reduce((sum, p) => sum + p.timeline.events.length, 0);
  const totalCount = selectedEntries.reduce((sum, p) => sum + p.bundle.timeline.events.length, 0);
  const markdown = panes.map((entry) => timelineToMarkdown(entry.timeline)).join("\n\n");
  const headerTitle = comparing
    ? panes.map((entry) => entry.label).join(" vs ")
    : panes[0]?.label?.trim() || "Report";

  return (
    <div className="flex flex-col gap-4" data-testid="page-load-timeline">
      <div
        ref={stickyHeaderRef}
        className="sticky top-0 z-30 -mx-1 flex flex-col gap-2 border-b border-border/80 bg-background/95 px-1 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {comparing ? "Comparing" : "Viewing report"}
            </p>
            <p className="truncate text-base font-semibold" data-testid="timeline-report-label">
              {headerTitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {bundles.length > 1 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Reports to compare">
                {bundles.map((bundle) => {
                  const name = bundle.timeline.label?.trim() || "Report";
                  const selected = selectedLabels.includes(bundle.timeline.label);
                  return (
                    <Button
                      key={bundle.timeline.label}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      onClick={() => selectReport(bundle.timeline.label)}
                    >
                      {name}
                    </Button>
                  );
                })}
              </div>
            ) : null}
            <CopyButton
              text={markdown}
              size="sm"
              title="Copy timeline as Markdown"
              aria-label="Copy timeline as Markdown"
              data-testid="copy-timeline-markdown"
            >
              <span className="ml-1.5 hidden sm:inline">Copy Markdown</span>
            </CopyButton>
          </div>
        </div>
        <TaskFilters
          options={taskOptions}
          enabled={enabledTasks}
          shown={shownCount}
          total={totalCount}
          onToggle={toggleTask}
        />
      </div>
      {comparing ? (
        <div
          className="flex flex-col gap-4"
          data-testid="timeline-compare"
          data-shared-axis-end-ms={sharedAxisEndMs}
        >
          <TimelineLegend
            simulationLabel={
              panes.find((entry) => entry.timeline.simulationLabel)?.timeline.simulationLabel
            }
            timesNote={panes.find((entry) => entry.timeline.timesNote)?.timeline.timesNote}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {panes.map((entry) => {
              const name = timelineDisplayName(entry.timeline);
              return (
                <TimelinePane key={entry.label} name={name}>
                  <TimelinePaneLabel>{name}</TimelinePaneLabel>
                  <VerticalTimeline key={name} axisEndMs={entry.timeline.axisEndMs}>
                    <CollapsibleUnifiedWaterfall
                      load={entry.bundle.load}
                      events={entry.timeline.events}
                      axisEndMs={entry.timeline.axisEndMs}
                      stickyTopPx={stickyTopPx}
                      momentIdPrefix={momentIdPrefixFromLabel(entry.label)}
                    />
                  </VerticalTimeline>
                </TimelinePane>
              );
            })}
          </div>
          <AlignedCompareMoments
            left={{
              label: panes[0].label,
              events: panes[0].timeline.events,
              idPrefix: momentIdPrefixFromLabel(panes[0].label),
            }}
            right={{
              label: panes[1].label,
              events: panes[1].timeline.events,
              idPrefix: momentIdPrefixFromLabel(panes[1].label),
            }}
            axisEndMs={sharedAxisEndMs}
          />
        </div>
      ) : (
        <TimelinePane name={timelineDisplayName(panes[0].timeline)}>
          <VerticalTimeline
            key={timelineDisplayName(panes[0].timeline)}
            axisEndMs={panes[0].timeline.axisEndMs}
          >
            <TimelineLegend
              simulationLabel={panes[0].timeline.simulationLabel}
              timesNote={panes[0].timeline.timesNote}
            />
            <CollapsibleUnifiedWaterfall
              load={panes[0].bundle.load}
              events={panes[0].timeline.events}
              axisEndMs={panes[0].timeline.axisEndMs}
              stickyTopPx={stickyTopPx}
            />
            <TimelineMoments
              timeline={panes[0].timeline}
              deviceLabel={panes[0].bundle.load.label}
            />
          </VerticalTimeline>
        </TimelinePane>
      )}
    </div>
  );
}
