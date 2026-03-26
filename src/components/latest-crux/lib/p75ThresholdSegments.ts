import type { CruxHistoryItem } from "@/lib/schema";

/** SVG bar segments as percentage strings (matches previous `parseFloat` + `% ` behavior). */
export function p75ThresholdSegments(histogramData: CruxHistoryItem) {
  const maxValue = Math.max(histogramData.P75, histogramData.ni_max) * 1.05;
  return {
    maxValue,
    goodPercent: `${(histogramData.good_max / maxValue) * 100}% `,
    niPercent: `${((histogramData.ni_max - histogramData.good_max) / maxValue) * 100}% `,
    poorPercent: `${((maxValue - histogramData.ni_max) / maxValue) * 100}% `,
    p75Location: `${(histogramData.P75 / maxValue) * 100}% `,
  };
}
