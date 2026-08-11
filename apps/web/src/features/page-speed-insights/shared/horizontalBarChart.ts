import type { ChartConfig } from "@/components/ui/chart";

export const CHART_SERIES_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const;

/** Opt out of ChartContainer's default `aspect-video` for fixed-height bar charts. */
export const horizontalBarChartClassName = "aspect-auto w-full justify-start";

export const mutedBarCursor = { fill: "hsl(var(--muted))", opacity: 0.35 };

export const barEndRadius: [number, number, number, number] = [0, 6, 6, 0];

export function formatAxisMs(value: number): string {
  if (value >= 1000) {
    const seconds = value / 1000;
    return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

export function horizontalBarChartHeight(
  rowCount: number,
  {
    rowPx = 44,
    chromePx = 56,
    minPx = 160,
    legend = false,
  }: {
    rowPx?: number;
    chromePx?: number;
    minPx?: number;
    legend?: boolean;
  } = {},
): number {
  return Math.max(minPx, rowCount * rowPx + chromePx + (legend ? 32 : 0));
}

export function yAxisWidthForLabels(
  labels: Iterable<string>,
  {
    min = 72,
    max = 160,
    charPx = 7,
    padding = 16,
  }: {
    min?: number;
    max?: number;
    charPx?: number;
    padding?: number;
  } = {},
): number {
  let longest = 0;
  for (const label of labels) {
    longest = Math.max(longest, label.length);
  }
  return Math.min(max, Math.max(min, longest * charPx + padding));
}

export function truncateLabel(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, maxChars)}…` : value;
}

export function buildKeyedChartConfig(
  entries: Array<{ key: string; label: string; color?: string }>,
): ChartConfig {
  return Object.fromEntries(
    entries.map((entry, index) => [
      entry.key,
      {
        label: entry.label,
        color: entry.color ?? CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length],
      },
    ]),
  );
}

export function stackBarRadius(
  index: number,
  count: number,
): number | [number, number, number, number] {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  if (isFirst && isLast) return [6, 6, 6, 6];
  if (isFirst) return [6, 0, 0, 6];
  if (isLast) return [0, 6, 6, 0];
  return 0;
}
