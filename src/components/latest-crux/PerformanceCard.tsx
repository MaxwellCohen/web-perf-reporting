'use client';
import { Card } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from 'recharts';

import { CruxHistoryItem, UserPageLoadMetricV5 } from '@/lib/schema';
import { useContext, useMemo } from 'react';

import {
  chartConfig,
  PerformanceChartData,
} from '@/components/common/ChartSettings';
import { RadialChart } from '@/components/latest-crux/PerformanceRadialChart';
import { PerformanceStackedBarChart } from '@/components/latest-crux/PerformanceStackedBarChart';
import GaugeChart from '@/components/common/PageSpeedGaugeChart';
import { createContext } from 'react';

const makeHistogramData = (data?: CruxHistoryItem) => {
  if (!data) {
    return {
      chartData: [] as PerformanceChartData[],
      chartConfig: {} satisfies ChartConfig,
      extraInfo: [] as string[],
    };
  }

  const chartData: PerformanceChartData[] = [
    {
      status: 'good',
      density: data.good_density || 0,
      fill: 'var(--color-good_density)',
    },
    {
      status: 'ni',
      density: data.ni_density || 0,
      fill: 'var(--color-ni_density)',
    },
    {
      status: 'poor',
      density: data.poor_density || 0,
      fill: 'var(--color-poor_density)',
    },
  ];

  return {
    chartData,
  };
};

export const ChartMap: Record<string, typeof CurrentGaugeChart> = {
  Histogram: Histogram,
  'Stacked Bar': PerformanceStackedBarChart,
  'Radial Chart': RadialChart,
  'Gauge Chart': CurrentGaugeChart,
};

export const CurrentPerformanceChartContext =
  createContext<string>('Histogram');

export function CurrentPerformanceCard({
  histogramData,
  title,
}: {
  histogramData?: CruxHistoryItem;
  title: string;
}) {
  const ChartType = useContext(CurrentPerformanceChartContext);

  const extraInfo = useMemo(
    () => [
      `Good: 0 to ${histogramData?.good_max ?? 0}`,
      `Needs Improvement: ${histogramData?.good_max ?? 0} to ${histogramData?.ni_max ?? 0}`,
      `Poor: ${histogramData?.ni_max ?? 0} and above`,
    ],
    [histogramData],
  );

  const Chart = ChartMap[ChartType] ?? Histogram;

  if (!histogramData) {
    return null;
  }

  return (
    <Card className="grid h-full grid-cols-1 grid-rows-[2.75rem,auto,1rem,auto] p-2">
      <div className="text-md text-center font-bold">{title}</div>
      <Chart histogramData={histogramData} />
      <P75barChart histogramData={histogramData} />
      <div className="flex-col items-start text-sm">
        <div className="flex gap-2 font-medium leading-none">
          P75 is {histogramData.P75 ?? 'N/A'}
        </div>
        <div className="flex gap-2 font-medium leading-none">
          <StatusLabel histogramData={histogramData} />
        </div>
        {extraInfo.map((info, idx) => (
          <div
            className="text-xs leading-none text-muted-foreground"
            key={`${idx}-${info}`}
          >
            {info}
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatusLabel({ histogramData }: { histogramData: CruxHistoryItem }) {
  const p75 = histogramData.P75;

  let status = chartConfig['poor_density'];
  if (p75 <= histogramData.good_max) {
    status = chartConfig['good_density'];
  } else if (p75 <= histogramData.ni_max) {
    status = chartConfig['ni_density'];
  }
  return <span style={{ color: status.color }}>{status.label}</span>;
}

function P75barChart({ histogramData }: { histogramData: CruxHistoryItem }) {
  const maxValue = Math.max(histogramData.P75, histogramData.ni_max) * 1.05;
  const goodPercent = `${(histogramData.good_max / maxValue) * 100}% `;
  const niPercent = `${((histogramData.ni_max - histogramData.good_max) / maxValue) * 100}% `;
  const poorPercent = `${((maxValue - histogramData.ni_max) / maxValue) * 100}% `;
  const p75Location = `${(histogramData.P75 / maxValue) * 100}% `;

  return (
    <svg viewBox="0 0 100 7">
      <g className="flex flex-row">
        <rect width={goodPercent} height="10" fill="hsl(var(--chart-1))" />
        <rect
          width={niPercent}
          height="10"
          x={parseFloat(goodPercent) || 0}
          fill="hsl(var(--chart-2))"
        />
        <rect
          width={poorPercent}
          height="10"
          x={parseFloat(goodPercent) + parseFloat(niPercent) || 0}
          fill="hsl(var(--chart-3))"
        />
      </g>
      <g className="flex flex-row">
        <line
          x1={parseFloat(p75Location)}
          y1="0"
          x2={parseFloat(p75Location)}
          y2="10"
          stroke="currentColor"
          strokeWidth="1"
        />
        <line
          x1={parseFloat(p75Location)}
          y1="0"
          x2={parseFloat(p75Location)}
          y2="4"
          stroke="bg-primary"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

function CurrentGaugeChart({
  histogramData,
}: {
  histogramData: CruxHistoryItem;
}) {
  const data: UserPageLoadMetricV5 = {
    percentile: +(histogramData.P75 ?? 0),
    category: '',
    distributions: [
      {
        min: 0,
        max: histogramData.good_max ?? 0,
        proportion: histogramData.good_density ?? 0,
      },
      {
        min: histogramData.good_max ?? 0,
        max: histogramData.ni_max ?? 0,
        proportion: histogramData.ni_density ?? 0,
      },
      {
        min: histogramData.ni_max ?? 0,
        max: Math.max(histogramData.P75, histogramData.ni_max) * 1.05,
        proportion: histogramData.poor_density ?? 0,
      },
    ],
  };

  return <GaugeChart metric={''} data={data} />;
}

function Histogram({ histogramData }: { histogramData: CruxHistoryItem }) {
  const { chartData } = useMemo(
    () => makeHistogramData(histogramData),
    [histogramData],
  );
  return (
    <div>
      <ChartContainer config={chartConfig}>
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="status"
            tickLine={false}
            axisLine={false}
            hide={true}
            tickFormatter={(value) =>
              chartConfig[value as keyof typeof chartConfig]?.label || ''
            }
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar
            dataKey="density"
            strokeWidth={2}
            radius={8}
            activeIndex={2}
            activeBar={({ ...props }) => {
              return (
                <Rectangle
                  {...props}
                  fillOpacity={0.8}
                  stroke={props.payload.fill}
                  strokeDasharray={4}
                  strokeDashoffset={4}
                />
              );
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
