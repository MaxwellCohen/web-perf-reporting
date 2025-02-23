'use client';
import {
  Card,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from 'recharts';

import { CruxHistoryItem, UserPageLoadMetricV5 } from '../../lib/schema';
import { useContext, useMemo } from 'react';

import { chartConfig, PerformanceChartData } from './ChartSettings';
import { RadialChart } from './PerformanceRadialChart';
import { PerformanceStackedBarChart } from './PerformanceStackedBarChart';
import GaugeChart from './PageSpeedGuageChart';
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
      fill: 'var(--color-good)',
    },
    { status: 'ni', density: data.ni_density || 0, fill: 'var(--color-ni)' },
    {
      status: 'poor',
      density: data.poor_density || 0,
      fill: 'var(--color-poor)',
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
    <Card className="grid h-full grid-cols-1 grid-rows-[44px,auto,72px] gap-3 p-2">
      <div className="text-md text-center font-bold">{title}</div>
      <Chart histogramData={histogramData} />
      <div className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          P75 is {histogramData.P75 ?? 'N/A'} <StatusLabel histogramData={histogramData} />
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

  let status = chartConfig['poor'];
  if (p75 <= histogramData.good_max) {
    status = chartConfig['good'];
  } else if (p75 <= histogramData.ni_max) {
    status = chartConfig['ni'];
  }
  return <span style={{ color: status.color }}>{status.label}</span>;
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
        max: (histogramData.ni_max ?? 0) * 1.25,
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
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) =>
              chartConfig[value as keyof typeof chartConfig]?.label || ''
            }
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
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
