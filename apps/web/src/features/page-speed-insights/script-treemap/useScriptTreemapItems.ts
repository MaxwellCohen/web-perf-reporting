"use client";

import { useMemo } from "react";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import type { TreeMapData } from "@/lib/schema";

export type ScriptTreemapItem = {
  label: string;
  treeData: TreeMapData;
};

export function useScriptTreemapItems(): ScriptTreemapItem[] {
  const items = usePageSpeedItems();

  return useMemo(
    () =>
      items
        .map(({ item, label }) => ({
          treeData: item.lighthouseResult?.audits?.["script-treemap-data"]?.details as TreeMapData,
          label,
        }))
        .filter((entry): entry is ScriptTreemapItem => entry.treeData?.type === "treemap-data"),
    [items],
  );
}
