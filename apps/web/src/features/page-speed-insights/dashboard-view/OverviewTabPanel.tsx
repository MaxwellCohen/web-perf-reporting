"use client";

import { useMemo } from "react";
import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { FixFirst } from "@/features/page-speed-insights/dashboard-view/overview/FixFirst";
import { defaultOpenKeys } from "@/features/page-speed-insights/dashboard-view/overview/overviewModel";
import {
  OverviewOpenProvider,
  useFocusReport,
  useIsNarrow,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewOpen";
import { OverviewSummaryBar } from "@/features/page-speed-insights/dashboard-view/overview/OverviewSummaryBar";
import { OverviewTimeline } from "@/features/page-speed-insights/dashboard-view/overview/OverviewTimeline";
import { useOverviewModel } from "@/features/page-speed-insights/dashboard-view/overview/useOverviewModel";
import { PlatformNotesOverview } from "@/features/page-speed-insights/dashboard-view/PlatformNotes";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";
import { SpeedUpPromptSection } from "@/features/page-speed-insights/dashboard-view/SpeedUpPromptSection";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience/LoadingExperiencesSection";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { FullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";

/**
 * The load timeline first, then the causes behind each metric, opened where there are
 * savings to act on. Reference sections sit below, closed until asked for.
 */
export function OverviewTabPanel() {
  const { items, model } = useOverviewModel();
  const { focus } = useFocusReport(items);
  const narrow = useIsNarrow();
  const defaultOpen = useMemo(() => defaultOpenKeys(model, narrow), [model, narrow]);

  return (
    <FullWidthTables>
      <OverviewOpenProvider defaultOpen={defaultOpen}>
        <div className="flex flex-col gap-6">
          <OverviewSummaryBar items={items} model={model} />
          {focus ? <FixFirst model={model} label={focus.label} /> : null}
          <SectionStack defaultOpen={defaultOpen}>
            {focus ? <OverviewTimeline focus={focus} model={model} /> : null}
            <CWVMetricsComponent />
            <RenderFilmStrip />
            <LoadingExperiencesSection />
            <SpeedUpPromptSection />
          </SectionStack>
          <PlatformNotesOverview />
        </div>
      </OverviewOpenProvider>
    </FullWidthTables>
  );
}
