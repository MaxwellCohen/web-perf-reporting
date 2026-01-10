'use client';

import { Label, Pie, PieChart } from 'recharts';

import { ChartContainer } from '@/components/ui/chart';
import { chartConfig } from '@/components/common/ChartSettings';
import { UserPageLoadMetricV5 } from '@/lib/schema';

const RADIAN = Math.PI / 180;

type ChartData = [
  { name: string; value: number; fill: string },
  { name: string; value: number; fill: string },
  { name: string; value: number; fill: string },
];

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
      name: chartConfig['poor_density'].label,
      value: Math.max(distributions[2].min * 1.1 || 0, value),
      fill: 'var(--color-poor_density)',
    },
    {
      name: chartConfig['ni_density'].label,
      value: distributions[1].max,
      fill: 'var(--color-ni_density)',
    },
    {
      name: chartConfig['good_density'].label,
      value: distributions[0].max,
      fill: 'var(--color-good_density)',
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
          innerRadius={'50%'}
          strokeWidth={5}
          isAnimationActive={false}
          animationDuration={0}
          paddingAngle={0}
          cx="50%"
          cy="50%"
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
                      fill={'hsl(var(--muted-foreground))'}
                    />
                    <circle
                      cx={x0}
                      cy={y0}
                      r={1}
                      stroke="hsl(var(--muted-foreground))"
                      fill={'hsl(var(--muted-foreground))'}
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

export default GaugeChart;

export function HorizontalGaugeChart({
  metric,
  data,
}: {
  metric?: string;
  data?: UserPageLoadMetricV5;
}) {
  if (!data || data.distributions.length !== 3) {
    return null;
  }
  const value = data.percentile;
  const distributions = data.distributions;
  const chartData: ChartData = [
    {
      name: chartConfig['good_density'].label,
      value: distributions[0].max || 0,
      fill: 'hsl(var(--chart-1))',
    },
    {
      name: chartConfig['ni_density'].label,
      value: distributions[1].max || 0,
      fill: 'hsl(var(--chart-2))',
    },
    {
      name: chartConfig['poor_density'].label,
      value: Math.max(distributions[2].min || 0, value) * 1.1,
      fill: 'hsl(var(--chart-3))',
    },
  ];

  return (
    <div className="flex h-full w-full flex-col justify-center">
      <div className="mb-2 flex w-full items-center gap-2 whitespace-nowrap">
        <div className="text-sm font-medium">{metric}</div>
        {/* <div className="whitespace-nowrap text-sm font-bold">
          {value.toLocaleString()} 
        </div> */}
      </div>
      <LineChart chartData={chartData} value={value} />
    </div>
  );
}

export function LineChart({
  chartData,
  value,
}: {
  chartData: ChartData;
  value: number;
}) {
  const maxValue = Math.max(...chartData.map((dist) => dist.value));
  return (
    <svg
      width="100%"
      height="16"
      viewBox="0 0 100 16"
      preserveAspectRatio="none"
      className="rounded-full"
    >
      <rect
        x="0"
        y="0"
        width="100"
        height="16"
        fill="hsl(var(--muted))"
        rx="8"
        ry="8"
      />

      {/* Good segment */}
      <rect
        x="0"
        y="0"
        width={(chartData[0].value / maxValue) * 100}
        height="16"
        fill={chartData[0].fill}
        rx="0"
        ry="0"
      />

      {/* Needs Improvement segment */}
      <rect
        x={(chartData[0].value / maxValue) * 100}
        y="0"
        width={((chartData[1].value - chartData[0].value) / maxValue) * 100}
        height="16"
        fill={chartData[1].fill}
      />

      {/* Poor segment */}
      <rect
        x={(chartData[1].value / maxValue) * 100}
        y="0"
        width={((maxValue - chartData[1].value) / maxValue) * 100}
        height="16"
        fill={chartData[2].fill}
      />
      {/* Indicator line for current value */}
      
      <rect
        x={value === maxValue ? (value / maxValue) * 96 : (value / maxValue) * 100 - 1}
        y="0"
        width={(value === maxValue || value === 0) ? 4 : 2}
        height="16"
        className="rounded-l-full"
        fill="hsl(var(--destructive-foreground))"
      />
      {/* <circle
        cx={(value / maxValue) * 100 }
        cy="7"
        r="2"
        fill="hsl(var(--muted-foreground))"
      /> */}
      
      <text
        x={(chartData[0].value / maxValue) * 100}
        y="12"
        z={1000}
        fontSize="8"
        fontWeight="700"
        textAnchor="middle"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="0.5"
        strokeLinejoin="round"
        style={{
          paintOrder: 'stroke fill',
          textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 1px rgba(0,0,0,0.8)',
        }}
      >
        {chartData[0].value > 1
          ? chartData[0].value.toFixed(0)
          : chartData[0].value}
      </text>
      <text
        x={(chartData[1].value / maxValue) * 100}
        y="12"
        z={1000}
        fontSize="8"
        fontWeight="700"
        textAnchor="middle"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="0.5"
        strokeLinejoin="round"
        style={{
          paintOrder: 'stroke fill',
          textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 1px rgba(0,0,0,0.8)',
        }}
      >
        {chartData[1].value > 1
          ? chartData[1].value.toFixed(0)
          : chartData[1].value.toFixed(2)}
      </text>
    </svg>
  );
}

export function HorizontalScoreChart({
  score,
}: {
  score: number;
  className?: string;
}) {
  const chartData: ChartData = [
    {
      name: chartConfig['poor_density'].label,
      value: 50,
      fill: 'hsl(var(--chart-3))',
    },
    {
      name: chartConfig['ni_density'].label,
      value: 90,
      fill: 'hsl(var(--chart-2))',
    },
    {
      name: chartConfig['good_density'].label,
      value: 100,
      fill: 'hsl(var(--chart-1))',
    },
  ];

  return <LineChart chartData={chartData} value={score * 100} />;
}
