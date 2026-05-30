"use client";

import { usePageSpeedSelector } from "@/features/page-speed-insights/PageSpeedContext";
import { selectLcpBreakdownComputed } from "./lcpBreakdownSelectors";

export function useLcpBreakdownComputed() {
  return usePageSpeedSelector(selectLcpBreakdownComputed);
}

