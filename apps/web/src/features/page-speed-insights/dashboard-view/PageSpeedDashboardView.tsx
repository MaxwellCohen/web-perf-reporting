"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { DashboardPanelFallback } from "@/features/page-speed-insights/dashboard-view/DashboardPanelFallback";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience";
import { ReportScoreOverview } from "@/features/page-speed-insights/dashboard-view/ReportScoreOverview";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";

const OVERVIEW_OPEN = ["cwv", "loadingExperience", "originLoadingExperience"];

const tabTriggerClassName = "px-3 sm:px-4";

const LoadingTabPanel = dynamic(
  () => import("./LoadingTabPanel").then((mod) => mod.LoadingTabPanel),
  { loading: () => <DashboardPanelFallback label="loading" /> },
);
const NetworkTabPanel = dynamic(
  () => import("./NetworkTabPanel").then((mod) => mod.NetworkTabPanel),
  { loading: () => <DashboardPanelFallback label="network" /> },
);
const JavaScriptTabPanel = dynamic(
  () => import("./JavaScriptTabPanel").then((mod) => mod.JavaScriptTabPanel),
  { loading: () => <DashboardPanelFallback label="JavaScript" /> },
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
  return (
    <div className="flex flex-col gap-6 px-3">
      <ReportScoreOverview />
      <Tabs defaultValue="overview">
        <div className="-mx-3 overflow-x-auto px-3">
          <TabsList>
            <TabsTrigger className={tabTriggerClassName} value="overview">
              Overview
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="loading">
              Loading
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="network">
              Network
            </TabsTrigger>
            <TabsTrigger className={tabTriggerClassName} value="javascript">
              JavaScript
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
          <SectionStack defaultOpen={OVERVIEW_OPEN}>
            <CWVMetricsComponent />
            <LoadingExperiencesSection />
          </SectionStack>
        </TabPanel>
        <TabPanel value="loading">
          <LoadingTabPanel />
        </TabPanel>
        <TabPanel value="network">
          <NetworkTabPanel />
        </TabPanel>
        <TabPanel value="javascript">
          <JavaScriptTabPanel />
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
