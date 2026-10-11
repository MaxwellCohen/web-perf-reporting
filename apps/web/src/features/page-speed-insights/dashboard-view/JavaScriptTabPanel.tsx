"use client";

import { JavaScriptPerformanceComponent } from "@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent";
import { ScriptTreemapSection } from "@/features/page-speed-insights/script-treemap";
import { SectionStack } from "@/features/page-speed-insights/dashboard-view/SectionStack";

const JAVASCRIPT_OPEN = ["scriptTreemap", "javascriptPerformance"];

export function JavaScriptTabPanel() {
  return (
    <SectionStack defaultOpen={JAVASCRIPT_OPEN}>
      <ScriptTreemapSection />
      <JavaScriptPerformanceComponent />
    </SectionStack>
  );
}
