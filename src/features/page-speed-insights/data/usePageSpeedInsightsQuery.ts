"use client";
import { useQuery } from "@tanstack/react-query";
import type { PageSpeedInsights } from "@/lib/schema";
import {
  getPageSpeedInsightsByPublicId,
  postPageSpeedInsightsByUrl,
  type PageSpeedInsightsQueryData,
} from "@/lib/page-speed-insights/pageSpeedInsightsApiClient";

export type { PageSpeedInsightsQueryData };

type PageSpeedInsightsDefaultData = (PageSpeedInsights | null | undefined)[];

function usePageSpeedInsightsQueryBase(
  queryKey: readonly [string, "url" | "publicId", string],
  queryFn: ({ signal }: { signal: AbortSignal }) => Promise<PageSpeedInsightsQueryData>,
  defaultData?: PageSpeedInsightsDefaultData,
) {
  const hasDefaultData = !!defaultData?.filter(Boolean).length;
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn,
    enabled: !hasDefaultData,
    initialData: hasDefaultData ? (defaultData as PageSpeedInsightsQueryData) : undefined,
    throwOnError: true,
  });

  if (hasDefaultData) {
    return { data: defaultData, isLoading: false };
  }
  return {
    data: (data ?? []) as PageSpeedInsightsQueryData,
    isLoading,
  };
}

export function usePageSpeedInsightsQueryByUrl(
  url: string,
  defaultData?: PageSpeedInsightsDefaultData,
) {
  return usePageSpeedInsightsQueryBase(
    ["pagespeed", "url", url] as const,
    ({ signal }) => postPageSpeedInsightsByUrl(url, signal),
    defaultData,
  );
}

export function usePageSpeedInsightsQueryByPublicId(publicId: string) {
  return usePageSpeedInsightsQueryBase(["pagespeed", "publicId", publicId] as const, ({ signal }) =>
    getPageSpeedInsightsByPublicId(publicId, signal),
  );
}
