'use client';
import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';

import { ChartContainer } from '@/components/ui/chart';
import { chartConfig } from './ChartSettings';
import { UserPageLoadMetricV5 } from '@/lib/schema';

const RADIAN = Math.PI / 180;

export function GaugeChart({
  metric,
  data,
}: {
  metric: string;
  data?: UserPageLoadMetricV5;
}) {
  if (!data || data.distributions.length !== 3) {
    return null;
  }
  const value = data.percentile;
  const distributions = data.distributions;
  const chartData = [
    {
      name: chartConfig['poor'].label,
      value: Math.max(distributions[2].min * 1.1 || 0, value),
      fill: 'var(--color-poor)',
    },
    {
      name: chartConfig['ni'].label,
      value: distributions[1].max,
      fill: 'var(--color-ni)',
    },
    {
      name: chartConfig['good'].label,
      value: distributions[0].max,
      fill: 'var(--color-good)',
    },
  ];

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full aspect-[2/1]"
    >
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={chartData}
          order={0}
          dataKey="value"
          nameKey="name"
          startAngle={0}
          endAngle={180}
          innerRadius={'50%'}
          strokeWidth={5}
          isAnimationActive={false}
          animationDuration={0}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                const sum = chartData.reduce(
                  (acc, entry) => acc + (entry.value || 0),
                  0,
                );
                const ang = 180.0 * (1 - value / sum);
                const length =
                  ((((viewBox.innerRadius || 0) as number) +
                    (viewBox.outerRadius || 0)) as number) / 2;
                const sin = Math.sin(-RADIAN * ang);
                const cos = Math.cos(-RADIAN * ang);
                const r = 5;
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
                      stroke="#d0d000"
                      fill={'#d0d000'}
                    />
                    <circle
                      cx={x0}
                      cy={y0}
                      r={5}
                      stroke="#d0d000"
                      fill={'#d0d000'}
                    />
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline={'middle'}
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy as number) + 24}
                        className="fill-foreground text-lg font-bold"
                      >
                        {value.toLocaleString()} {data.category}
                      </tspan>
                      {metric ? <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 40}
                        className="fill-muted-foreground"
                      >
                        {metric}
                      </tspan> : null}
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

export default GaugeChart;
