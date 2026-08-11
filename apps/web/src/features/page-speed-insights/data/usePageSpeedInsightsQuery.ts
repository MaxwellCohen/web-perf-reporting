"use client";
import { use } from "react";
import {
  fetchPageSpeedInsightsByPublicId,
  type PageSpeedLoadResult,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";
import { browser } from "react-dom";

export function usePageSpeedInsightsQueryByPublicId(publicId: string): PageSpeedLoadResult {
  use(browser());
  return use(fetchPageSpeedInsightsByPublicId(publicId));
}
