"use client";

import { useMemo, type ReactNode } from "react";
import {
  patchDashboardSearch,
  type ResourceStageId,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { PayloadFlow } from "@/features/page-speed-insights/dashboard-view/resources-story/PayloadFlow";
import { ResourcesComparisonBrief } from "@/features/page-speed-insights/dashboard-view/resources-story/ResourcesComparison";
import { compareResourcesInvestigations } from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesComparisonModel";
import {
  resourcesInvestigationsFromItems,
  type ResourcesInvestigation,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import {
  SuspectList,
} from "@/features/page-speed-insights/dashboard-view/resources-story/SuspectList";
import { TransferWeightMap } from "@/features/page-speed-insights/dashboard-view/resources-story/TransferWeightMap";
import { ResourcesTable } from "@/features/page-speed-insights/dashboard-view/resources-story/ResourcesTable";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { CompareReportPicker } from "@/features/page-speed-insights/shared/CompareReportPicker";
import { resolveCompareSelection } from "@/features/page-speed-insights/shared/compareSelection";
import { buildPageLoadTimelineBundle } from "@/features/page-speed-insights/page-load-timeline/buildPageLoadTimeline";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

function focusEvidence() {
  const node = document.getElementById("resources-evidence");
  if (node && typeof node.scrollIntoView === "function") {
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function ResourcesInvestigationBrief({
  picker,
  active,
  stage,
  suspectUrl,
  entry,
  onSelectStage,
  onSelectSuspect,
}: {
  picker: ReactNode;
  active: ResourcesInvestigation;
  stage: ResourceStageId;
  suspectUrl: string | null;
  entry: InsightsContextItem | undefined;
  onSelectStage: (id: ResourceStageId) => void;
  onSelectSuspect: (url: string) => void;
}) {
  const emphasizeUnused = active.lead.kind === "wasted-download" || stage === "unused";
  const bundle = useMemo(() => (entry ? buildPageLoadTimelineBundle(entry) : null), [entry]);

  return (
    <section
      aria-label="Resources investigation"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="space-y-6 p-4 sm:p-6">
        {picker}
        <header className="max-w-3xl animate-in fade-in slide-in-from-bottom-1 duration-500">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Where to look
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight">
            {active.lead.magnitude}
          </p>
          <p className="mt-2 text-lg leading-snug">{active.lead.sentence}</p>
        </header>
        <PayloadFlow stages={active.stages} selectedId={stage} onSelect={onSelectStage} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <TransferWeightMap
            nodes={active.nodes}
            emphasizeUnused={emphasizeUnused}
            selectedUrl={suspectUrl}
            onSelect={onSelectSuspect}
          />
          <SuspectList
            suspects={active.suspects}
            selectedUrl={suspectUrl}
            onSelect={onSelectSuspect}
          />
        </div>
        {bundle ? (
          <ResourcesTable
            load={bundle.load}
            selectedUrl={suspectUrl}
            onSelectSuspect={onSelectSuspect}
          />
        ) : null}
      </div>
    </section>
  );
}

export function ResourcesStory() {
  const items = usePageSpeedItems();
  const search = useDashboardSearchState();
  const reports = useMemo(() => resourcesInvestigationsFromItems(items), [items]);
  const labels = reports.map((report) => report.label);
  const selectedLabels = resolveCompareSelection(search.report, labels);
  const selected = selectedLabels
    .map((label) => reports.find((item) => item.label === label))
    .filter((item): item is ResourcesInvestigation => item != null);
  const active = selected[0];
  const other = selected[1];

  if (!active) {
    return (
      <p className="text-sm text-muted-foreground">
        This report has no downloaded resources to investigate.
      </p>
    );
  }

  const shown = other ? [active, other] : [active];
  const stage: ResourceStageId = shown.some((report) =>
    report.stages.some((item) => item.id === search.stage),
  )
    ? (search.stage as ResourceStageId)
    : active.lead.stage;
  const entry = items.find((item) => item.label === active.label) ?? items[0];
  const picker = (
    <CompareReportPicker
      labels={labels}
      selected={selectedLabels}
      resetPatch={{ stage: null, suspect: null }}
    />
  );

  function selectStage(id: ResourceStageId) {
    patchDashboardSearch({ stage: search.stage === id ? null : id, suspect: null });
    focusEvidence();
  }

  function selectSuspect(url: string) {
    const turningOff = search.suspect === url;
    const suspect = shown
      .map((report) => report.suspects.find((item) => item.url === url))
      .find((item) => item != null);
    const hintedStage: ResourceStageId | null = !suspect
      ? null
      : suspect.actionHint === "remove-unused"
        ? "unused"
        : suspect.actionHint === "split" || suspect.actionHint === "defer"
          ? "main-thread"
          : "arrived";
    const stage =
      !turningOff &&
      hintedStage &&
      shown.some((report) => report.stages.some((item) => item.id === hintedStage))
        ? hintedStage
        : undefined;
    patchDashboardSearch({
      suspect: turningOff ? null : url,
      ...(stage ? { stage } : {}),
    });
    focusEvidence();
  }

  if (other) {
    return (
      <ResourcesComparisonBrief
        comparison={compareResourcesInvestigations(active, other)}
        picker={picker}
        stage={stage}
        suspectUrl={search.suspect || null}
        onSelectStage={selectStage}
        onSelectSuspect={selectSuspect}
      />
    );
  }

  return (
    <ResourcesInvestigationBrief
      picker={picker}
      active={active}
      stage={stage}
      suspectUrl={search.suspect || null}
      entry={entry}
      onSelectStage={selectStage}
      onSelectSuspect={selectSuspect}
    />
  );
}
