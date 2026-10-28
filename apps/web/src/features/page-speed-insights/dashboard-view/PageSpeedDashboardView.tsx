"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPanelFallback } from "@/features/page-speed-insights/dashboard-view/DashboardPanelFallback";
import {
  isDashboardTab,
  patchDashboardSearch,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { ReportScoreOverview } from "@/features/page-speed-insights/dashboard-view/ReportScoreOverview";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";

const tabTriggerClassName = "px-3 sm:px-4";

const OverviewTabPanel = dynamic(
  () => import("./OverviewTabPanel").then((mod) => mod.OverviewTabPanel),
  { loading: () => <DashboardPanelFallback label="overview" /> },
);
const TimelineTabPanel = dynamic(
  () => import("./TimelineTabPanel").then((mod) => mod.TimelineTabPanel),
  { loading: () => <DashboardPanelFallback label="timeline" /> },
);
const LoadingTabPanel = dynamic(
  () => import("./LoadingTabPanel").then((mod) => mod.LoadingTabPanel),
  { loading: () => <DashboardPanelFallback label="loading" /> },
);
const ResourcesTabPanel = dynamic(
  () => import("./ResourcesTabPanel").then((mod) => mod.ResourcesTabPanel),
  { loading: () => <DashboardPanelFallback label="resources" /> },
);
const PageWeightTabPanel = dynamic(
  () => import("./PageWeightTabPanel").then((mod) => mod.PageWeightTabPanel),
  { loading: () => <DashboardPanelFallback label="page weight" /> },
);
const RecommendationsTabPanel = dynamic(
  () => import("./RecommendationsTabPanel").then((mod) => mod.RecommendationsTabPanel),
  { loading: () => <DashboardPanelFallback label="recommendations" /> },
);
const AuditsTabPanel = dynamic(() => import("./AuditsTabPanel").then((mod) => mod.AuditsTabPanel), {
  loading: () => <DashboardPanelFallback label="audits" />,
});

function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsContent value={value} className="mt-4">
      {children}
    </TabsContent>
  );
}

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
            <TabsTrigger className={tabTriggerClassName} value="overview">
              Overview
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="timeline">
              Timeline
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="loading">
              Loading
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="resources">
              Resources
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="weight">
              Page Weight
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="recommendations">
              Recommendations
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="audits">
              Audits
            </TabsTrigger>
          </TabsList>
        </div>
        <TabPanel value="overview">
          <OverviewTabPanel />
        </TabPanel>
        <TabPanel value="timeline">
          <TimelineTabPanel />
        </TabPanel>
        <TabPanel value="loading">
          <LoadingTabPanel />
        </TabPanel>
        <TabPanel value="resources">
          <ResourcesTabPanel />
        </TabPanel>
        <TabPanel value="weight">
          <PageWeightTabPanel />
        </TabPanel>
        <TabPanel value="recommendations">
          <RecommendationsTabPanel />
        </TabPanel>
        <TabPanel value="audits">
          <AuditsTabPanel />
        </TabPanel>
      </Tabs>
    </div>
  );
}
