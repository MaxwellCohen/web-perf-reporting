"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPanelFallback } from "@/features/page-speed-insights/dashboard-view/DashboardPanelFallback";
import {
  type DashboardTab,
  isDashboardTab,
  patchDashboardSearch,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { ReportScoreOverview } from "@/features/page-speed-insights/dashboard-view/ReportScoreOverview";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";

const tabTriggerClassName = "px-3 sm:px-4";

const TABS = [
  {
    value: "overview",
    label: "Overview",
    Panel: dynamic(() => import("./OverviewTabPanel").then((m) => m.OverviewTabPanel), {
      loading: () => <DashboardPanelFallback label="overview" />,
    }),
  },
  {
    value: "timeline",
    label: "Timeline",
    Panel: dynamic(
      () =>
        import("@/features/page-speed-insights/page-load-timeline/PageLoadTimeline").then(
          (m) => m.PageLoadTimeline,
        ),
      {
        loading: () => <DashboardPanelFallback label="timeline" />,
      },
    ),
  },
  {
    value: "loading",
    label: "Loading",
    Panel: dynamic(
      () =>
        import("@/features/page-speed-insights/dashboard-view/loading-story/LoadingStory").then(
          (m) => m.LoadingStory,
        ),
      {
        loading: () => <DashboardPanelFallback label="loading" />,
      },
    ),
  },
  {
    value: "resources",
    label: "Resources",
    Panel: dynamic(
      () =>
        import("@/features/page-speed-insights/dashboard-view/resources-story/ResourcesStory").then(
          (m) => m.ResourcesStory,
        ),
      {
        loading: () => <DashboardPanelFallback label="resources" />,
      },
    ),
  },
  {
    value: "weight",
    label: "Page Weight",
    Panel: dynamic(
      () =>
        import("@/features/page-speed-insights/dashboard-view/page-weight/PageWeightStory").then(
          (m) => m.PageWeightStory,
        ),
      {
        loading: () => <DashboardPanelFallback label="page weight" />,
      },
    ),
  },
  {
    value: "recommendations",
    label: "Recommendations",
    Panel: dynamic(
      () =>
        import("@/features/page-speed-insights/dashboard-view/recommendations-story/RecommendationsStory").then(
          (m) => m.RecommendationsStory,
        ),
      {
        loading: () => <DashboardPanelFallback label="recommendations" />,
      },
    ),
  },
  {
    value: "audits",
    label: "Audits",
    Panel: dynamic(() => import("./AuditsTabPanel").then((m) => m.AuditsTabPanel), {
      loading: () => <DashboardPanelFallback label="audits" />,
    }),
  },
] as const satisfies readonly {
  value: DashboardTab;
  label: string;
  Panel: ComponentType;
}[];

export function PageSpeedDashboardView() {
  const tab = useDashboardSearchState().tab;

  return (
    <div className="flex flex-col gap-6 px-3">
      <ReportScoreOverview />
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (!isDashboardTab(value)) return;
          patchDashboardSearch({ tab: value, open: null }, "push");
        }}
      >
        <div className="-mx-3 overflow-x-auto px-3">
          <TabsList>
            {TABS.map(({ value, label }) => (
              <TabsTrigger key={value} className={tabTriggerClassName} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map(({ value, Panel }) => (
          <TabsContent key={value} value={value} className="mt-4">
            <Panel />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
