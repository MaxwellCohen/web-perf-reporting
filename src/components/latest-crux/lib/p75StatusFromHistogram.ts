import { chartConfig } from "@/components/common/ChartSettings";
import type { CruxHistoryItem } from "@/lib/schema";

export function p75StatusFromHistogram(histogramData: CruxHistoryItem) {
  const p75 = histogramData.P75;
  if (p75 <= histogramData.good_max) return chartConfig.good_density;
  if (p75 <= histogramData.ni_max) return chartConfig.ni_density;
  return chartConfig.poor_density;
}
