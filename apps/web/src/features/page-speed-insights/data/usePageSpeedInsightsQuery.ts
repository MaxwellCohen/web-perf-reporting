"use client";
import { use } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  getPageSpeedInsightsByPublicId,
  type PageSpeedLoadResult,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";
import { browser } from "react-dom";

export function usePageSpeedInsightsQueryByPublicId(publicId: string): PageSpeedLoadResult {
  use(browser());
  const { data } = useSuspenseQuery({
    queryKey: ["pageSpeed", "publicId", publicId] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      return getPageSpeedInsightsByPublicId(publicId, signal);
    },
  });
  return data;
}
