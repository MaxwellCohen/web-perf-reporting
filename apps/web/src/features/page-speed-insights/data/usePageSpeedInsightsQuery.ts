"use client";
import { useQuery } from "@tanstack/react-query";
import {
  getPageSpeedInsightsByPublicId,
  type PageSpeedLoadResult,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";

export type PageSpeedInsightsQueryState =
  | { isLoading: true }
  | { isLoading: false; result: PageSpeedLoadResult };

export function usePageSpeedInsightsQueryByPublicId(
  publicId: string,
): PageSpeedInsightsQueryState {
  const { data, isLoading } = useQuery({
    queryKey: ["pagespeed", "publicId", publicId] as const,
    queryFn: ({ signal }) => getPageSpeedInsightsByPublicId(publicId, signal),
    throwOnError: true,
  });

  if (isLoading) {
    return { isLoading: true };
  }

  return { isLoading: false, result: data! };
}
