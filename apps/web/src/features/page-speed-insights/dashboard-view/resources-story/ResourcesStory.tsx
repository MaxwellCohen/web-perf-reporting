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
  extractActiveMetric,
  resourcesInvestigationsFromItems,
  type LeadKind,
  type ResourceSuspect,
  type ResourcesInvestigation,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import {
  ACTION_LABEL,
  SuspectList,
} from "@/features/page-speed-insights/dashboard-view/resources-story/SuspectList";
import { TransferWeightMap } from "@/features/page-speed-insights/dashboard-view/resources-story/TransferWeightMap";
import { ResourcesTable } from "@/features/page-speed-insights/dashboard-view/resources-story/ResourcesTable";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { CompareReportPicker } from "@/features/page-speed-insights/shared/CompareReportPicker";
import { resolveCompareSelection } from "@/features/page-speed-insights/shared/compareSelection";
import { BootupTimeChartCard } from "@/features/page-speed-insights/javascript-metrics/BootupTimeChartCard";
import { MainThreadWorkChartCard } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkChartCard";
import {
  EntitiesTableCard,
  useEntitiesTableData,
} from "@/features/page-speed-insights/lh-categories/table/EntitiesTable";
import {
  buildPageLoadTimelineBundle,
  type PageLoadTimelineBundle,
} from "@/features/page-speed-insights/page-load-timeline/buildPageLoadTimeline";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { ScriptTreemapChartCard } from "@/features/page-speed-insights/script-treemap/ScriptTreemapChartCard";
import { useScriptTreemapItems } from "@/features/page-speed-insights/script-treemap/useScriptTreemapItems";
import { UnifiedWaterfall } from "@/features/page-speed-insights/waterfall/UnifiedWaterfall";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { TableItem } from "@/lib/schema";
import { getUrlString } from "@/lib/utils";

function focusEvidence() {
  const node = document.getElementById("resources-evidence");
  if (node && typeof node.scrollIntoView === "function") {
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function matchingRows(items: TableItem[], url: string | null): TableItem[] {
  if (!url) return items;
  return items.filter((item) => getUrlString(item.url) === url);
}

function SuspectExhibit({ suspect }: { suspect: ResourceSuspect }) {
  return (
    <article className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Suspect
      </p>
      <h3 className="mt-1 break-all text-base font-medium">{suspect.label}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{suspect.why}</p>
      <p className="mt-2 text-sm font-medium">{ACTION_LABEL[suspect.actionHint]}</p>
    </article>
  );
}

function InvestigationEvidence({
  stage,
  leadKind,
  suspect,
  entry,
  bundle,
}: {
  stage: ResourceStageId;
  leadKind: LeadKind;
  suspect: ResourceSuspect | null;
  entry: InsightsContextItem | undefined;
  bundle: PageLoadTimelineBundle | null;
}) {
  const metric = extractActiveMetric(entry);
  const treemapItems = useScriptTreemapItems();
  const entities = useEntitiesTableData();
  const suspectUrl = suspect?.url ?? null;
  const treemap = treemapItems.find((item) => item.label === entry?.label) ?? treemapItems[0];
  const treemapNodes = treemap?.treeData.nodes ?? [];
  const label = entry?.label ?? "";
  const bootupItems = suspectUrl
    ? matchingRows(metric?.bootupTime ?? [], suspectUrl)
    : (metric?.bootupTime ?? []);
  const showEntities =
    leadKind === "third-party" && stage === "arrived" && !suspect && entities.hasEntities;

  return (
    <div id="resources-evidence" className="space-y-4 scroll-mt-4">
      {suspect ? <SuspectExhibit suspect={suspect} /> : null}
      {showEntities ? <EntitiesTableCard data={entities.data} columns={entities.columns} /> : null}
      {stage === "scripts" && treemap && treemapNodes.length > 0 ? (
        <ScriptTreemapChartCard treeData={treemap.treeData} label={treemap.label} />
      ) : null}
      {stage === "scripts" && treemapNodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Script bytes are in the weight map. This report has no script-treemap audit.
        </p>
      ) : null}
      {stage === "main-thread" && bootupItems.length > 0 ? (
        <BootupTimeChartCard metrics={[{ label, bootupTime: bootupItems }]} />
      ) : null}
      {stage === "main-thread" && (metric?.mainThreadWork.length ?? 0) > 0 ? (
        <MainThreadWorkChartCard
          metrics={[{ label, mainThreadWork: metric?.mainThreadWork ?? [] }]}
        />
      ) : null}
      {stage === "main-thread" &&
      bootupItems.length === 0 &&
      (metric?.mainThreadWork.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">This report has no main-thread breakdown.</p>
      ) : null}
      {stage === "arrived" && !showEntities && bundle ? (
        <UnifiedWaterfall
          load={bundle.load}
          events={bundle.timeline.events}
          axisEndMs={bundle.timeline.axisEndMs}
          collapsible={false}
        />
      ) : null}
      {stage === "arrived" && !showEntities && !bundle ? (
        <p className="text-sm text-muted-foreground">This report has no request waterfall.</p>
      ) : null}
    </div>
  );
}

export function ResourcesInvestigationBrief({
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
  const suspect = active.suspects.find((item) => item.url === suspectUrl) ?? null;
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
