"use client";
import { use } from "react";
import {
  fetchPageSpeedInsightsByPublicId,
  type PageSpeedLoadResult,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";

export function usePageSpeedInsightsQueryByPublicId(publicId: string): PageSpeedLoadResult {
  return use(fetchPageSpeedInsightsByPublicId(publicId));
}
