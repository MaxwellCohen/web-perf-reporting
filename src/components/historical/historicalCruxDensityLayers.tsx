"use client";

import type { ReactElement } from "react";
import { Area, Bar } from "recharts";

const DENSITY_LAYERS = [
  { dataKey: "good_density", color: "var(--color-good_density)" },
  { dataKey: "ni_density", color: "var(--color-ni_density)" },
  { dataKey: "poor_density", color: "var(--color-poor_density)" },
] as const;

export function HistoricalCruxDensityAreas(): ReactElement {
  return (
    <>
      {DENSITY_LAYERS.map(({ dataKey, color }) => (
        <Area
          key={dataKey}
          dataKey={dataKey}
          type="linear"
          fill={color}
          fillOpacity={0.4}
          stroke={color}
          stackId="a"
        />
      ))}
    </>
  );
}

export function HistoricalCruxDensityBars(): ReactElement {
  return (
    <>
      {DENSITY_LAYERS.map(({ dataKey, color }) => (
        <Bar
          key={dataKey}
          dataKey={dataKey}
          type="natural"
          fill={color}
          fillOpacity={0.4}
          stroke={color}
          stackId="a"
        />
      ))}
    </>
  );
}
