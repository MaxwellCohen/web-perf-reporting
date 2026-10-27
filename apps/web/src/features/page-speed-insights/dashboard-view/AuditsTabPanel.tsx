"use client";

import { LighthouseAuditsPanel } from "@/features/page-speed-insights/LighthouseAuditsPanel";
import { FullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";

export function AuditsTabPanel() {
  return (
    <FullWidthTables>
      <LighthouseAuditsPanel />
    </FullWidthTables>
  );
}
