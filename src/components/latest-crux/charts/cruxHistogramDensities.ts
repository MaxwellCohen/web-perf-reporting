import type { CruxHistoryItem } from "@/lib/schema";

export const CRUX_DENSITY_KEYS_RADIAL = ["poor_density", "ni_density", "good_density"] as const;
export const CRUX_DENSITY_KEYS_BAR = ["good_density", "ni_density", "poor_density"] as const;

export type CruxDensityDataKey = (typeof CRUX_DENSITY_KEYS_RADIAL)[number];

const densityBarSegmentDefaults = {
  type: "natural" as const,
  fillOpacity: 0.4,
  stackId: "a" as const,
};

export function cruxHistogramDensityRow(data: CruxHistoryItem) {
  return {
    good_density: data.good_density ?? 0,
    ni_density: data.ni_density ?? 0,
    poor_density: data.poor_density ?? 0,
  };
}

export function cruxDensityBarProps(dataKey: CruxDensityDataKey) {
  return {
    dataKey,
    ...densityBarSegmentDefaults,
    fill: `var(--color-${dataKey})`,
    stroke: `var(--color-${dataKey})`,
  };
}
