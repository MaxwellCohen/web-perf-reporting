"use client";

import { Label, Pie, PieChart } from "recharts";

import { ChartContainer } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { UserPageLoadMetricV5 } from "@/lib/schema";
import { cn } from "@/lib/utils";

const RADIAN = Math.PI / 180;

function formatSegmentBoundary(value: number, format: "integer" | "decimal") {
  if (value > 1) return value.toFixed(0);
  if (format === "integer") return String(value);
  return value.toFixed(2);
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

type ChartData = [
  { name: string; value: number; fill: string },
  { name: string; value: number; fill: string },
  { name: string; value: number; fill: string },
];

function triBandChartInputs(data?: UserPageLoadMetricV5): {
  value: number;
  distributions: UserPageLoadMetricV5["distributions"];
  category: string;
} | null {
  if (!data || data.distributions.length !== 3) {
    return null;
  }
  return {
    value: data.percentile,
    distributions: data.distributions,
    category: data.category,
  };
}

export function GaugeChart({ metric, data }: { metric: string; data?: UserPageLoadMetricV5 }) {
  const band = triBandChartInputs(data);
  if (!band) {
    return null;
  }
  const { value, distributions, category } = band;
  const chartData = [
    {
      name: chartConfig["poor_density"].label,
      value: Math.max(distributions[2].min * 1.1 || 0, value),
      fill: "var(--color-poor_density)",
    },
    {
      name: chartConfig["ni_density"].label,
      value: distributions[1].max,
      fill: "var(--color-ni_density)",
    },
    {
      name: chartConfig["good_density"].label,
      value: distributions[0].max,
      fill: "var(--color-good_density)",
    },
  ];

  return (
    <ChartContainer config={chartConfig} className="aspect-2/1 w-full">
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={chartData}
          order={0}
          dataKey="value"
          nameKey="name"
          startAngle={0}
          endAngle={180}
          innerRadius={"50%"}
          strokeWidth={5}
          isAnimationActive={false}
          animationDuration={0}
          paddingAngle={0}
          cx="50%"
          cy="50%"
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                const sum = chartData.reduce((acc, entry) => acc + (entry.value || 0), 0);
                const ang = 180.0 * (1 - value / sum);
                const length =
                  ((((viewBox.innerRadius || 0) as number) +
                    (viewBox.outerRadius || 0)) as number) / 2;
                const sin = Math.sin(-RADIAN * ang);
                const cos = Math.cos(-RADIAN * ang);
                const r = 1;
                const x0 = viewBox.cx as number;
                const y0 = viewBox.cy as number;
                const xba = x0 + r * sin;
                const yba = y0 - r * cos;
                const xbb = x0 - r * sin;
                const ybb = y0 + r * cos;
                const xp = x0 + length * cos;
                const yp = y0 + length * sin;

                return (
                  <>
                    <path
                      d={`M ${xba} ${yba} L ${xbb} ${ybb} L ${xp} ${yp} `}
                      stroke="hsl(var(--muted-foreground))"
                      fill={"hsl(var(--muted-foreground))"}
                    />
                    <circle
                      cx={x0}
                      cy={y0}
                      r={1}
                      stroke="hsl(var(--muted-foreground))"
                      fill={"hsl(var(--muted-foreground))"}
                    />
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline={"middle"}
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy as number) + 24}
                        className="fill-foreground text-lg font-bold"
                      >
                        {value.toLocaleString()} {category}
                      </tspan>
                      {metric ? (
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 40}
                          className="fill-muted-foreground"
                        >
                          {metric}
                        </tspan>
                      ) : null}
                    </text>
                  </>
                );
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function HorizontalGaugeChart({
  metric,
  data,
}: {
  metric?: string;
  data?: UserPageLoadMetricV5;
}) {
  const band = triBandChartInputs(data);
  if (!band) {
    return null;
  }
  const { value, distributions } = band;
  const chartData: ChartData = [
    {
      name: chartConfig["good_density"].label,
      value: distributions[0].max || 0,
      fill: "hsl(var(--chart-1))",
    },
    {
      name: chartConfig["ni_density"].label,
      value: distributions[1].max || 0,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: chartConfig["poor_density"].label,
      value: Math.max(distributions[2].min || 0, value) * 1.1,
      fill: "hsl(var(--chart-3))",
    },
  ];

  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5">
      {metric ? (
        <div className="truncate text-xs font-medium tracking-wide text-muted-foreground">
          {metric}
        </div>
      ) : null}
      <LineChart chartData={chartData} value={value} />
    </div>
  );
}

export function LineChart({ chartData, value }: { chartData: ChartData; value: number }) {
  const maxValue = Math.max(...chartData.map((dist) => dist.value), value, Number.EPSILON);
  const toPct = (v: number) => clampPercent((v / maxValue) * 100);

  const boundary1 = toPct(chartData[0].value);
  const boundary2 = toPct(chartData[1].value);
  const markerPct = toPct(value);

  const segments = [
    { width: boundary1, fill: chartData[0].fill, name: chartData[0].name },
    {
      width: Math.max(0, boundary2 - boundary1),
      fill: chartData[1].fill,
      name: chartData[1].name,
    },
    {
      width: Math.max(0, 100 - boundary2),
      fill: chartData[2].fill,
      name: chartData[2].name,
    },
  ] as const;

  const boundaries = [
    { pct: boundary1, label: formatSegmentBoundary(chartData[0].value, "integer") },
    { pct: boundary2, label: formatSegmentBoundary(chartData[1].value, "decimal") },
  ] as const;

  return (
    <div className="relative w-full select-none">
      <div className="relative mb-1 h-3.5">
        {boundaries.map(({ pct, label }) => (
          <span
            key={`${label}-${pct}`}
            className={cn(
              "absolute top-0 -translate-x-1/2 font-mono text-[10px] leading-none tabular-nums text-muted-foreground",
              pct < 4 && "translate-x-0",
              pct > 96 && "-translate-x-full",
            )}
            style={{ left: `${pct}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="relative">
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_hsl(var(--border)/0.35)]"
          role="img"
          aria-label={`Value ${value} on a three-band scale`}
        >
          {segments.map((segment) => (
            <div
              key={segment.name}
              className="h-full min-w-0"
              style={{
                width: `${segment.width}%`,
                backgroundColor: segment.fill,
              }}
            />
          ))}
        </div>

        {boundaries.map(({ pct }) => (
          <div
            key={`tick-${pct}`}
            aria-hidden
            className="pointer-events-none absolute top-0 h-2.5 w-px -translate-x-1/2 bg-background/55"
            style={{ left: `${pct}%` }}
          />
        ))}

        <div
          data-testid="gauge-value-marker"
          className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${markerPct}%` }}
        >
          <div className="relative flex h-4 w-3 items-center justify-center">
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_1px_hsl(var(--background)/0.85)]" />
            <span className="absolute top-0 left-1/2 size-1.5 -translate-x-1/2 -translate-y-px rounded-full bg-foreground ring-2 ring-background" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HorizontalScoreChart({ score }: { score: number; className?: string }) {
  const chartData: ChartData = [
    {
      name: chartConfig["poor_density"].label,
      value: 50,
      fill: "hsl(var(--chart-3))",
    },
    {
      name: chartConfig["ni_density"].label,
      value: 90,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: chartConfig["good_density"].label,
      value: 100,
      fill: "hsl(var(--chart-1))",
    },
  ];

  return <LineChart chartData={chartData} value={score * 100} />;
}
