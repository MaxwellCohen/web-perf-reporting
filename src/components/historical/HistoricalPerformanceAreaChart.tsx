'use client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import { chartConfig } from '../../components/common/ChartSettings';
import { CruxHistoryItem } from '@/lib/schema';

export function HistoricalPerformanceAreaChart({
  chartData,
}: {
  chartData: CruxHistoryItem[];
}) {
  return (
    <ChartContainer config={chartConfig}>
      <ComposedChart
        accessibilityLayer
        data={chartData}
        stackOffset="expand"
      >
        <CartesianGrid vertical={false}   horizontal={true} syncWithTicks={true}/>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value}
        />
          <YAxis 
          domain={[ 0, 1]}
          ticks={[0, 0.5, 0.89, 1]}
          hide={true}
        />
        <ChartTooltip
          cursor={true}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Area
          dataKey="good_density"
          type="linear"
          fill="var(--color-good_density)"
          fillOpacity={0.4}
          stroke="var(--color-good_density)"
          stackId="a"
        />
        <Area
          dataKey="ni_density"
          type="linear"
          fill="var(--color-ni_density)"
          fillOpacity={0.4}
          stroke="var(--color-ni_density)"
          stackId="a"
        />
        <Area
          dataKey="poor_density"
          type="linear"
          fill="var(--color-poor_density)"
          fillOpacity={0.4}
          stroke="var(--color-poor_density)"
          stackId="a"
        />
      </ComposedChart>
    </ChartContainer>
  );
}

interface DotProps {
  cx: number;
  cy: number;
  payload: {
    P75: number;
    good_max: number;
    ni_max: number;
  };
}

export const Dot = ({ cx, cy, r, payload }: { cx: number, cy: number, r: number, payload: DotProps['payload'] } ) => {
  // Determine color based on P75 value
  let dotColor;
  if (payload.P75 <= payload.good_max) {
    dotColor = "var(--color-good_density)"; // Green for good
  } else if (payload.P75 <= payload.ni_max) {
    dotColor = "var(--color-ni_density)"; // Yellow/amber for needs improvement
  } else {
    dotColor = "var(--color-poor_density)"; // Red for poor
  }
  
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={r} 
      fill={dotColor} 
      stroke="white" 
      strokeWidth={1} 
    />
  );
};


export function HistoricalP75Chart({
  chartData,
}: {
  chartData: CruxHistoryItem[];
}) {
 
  const worstValue = Math.max(...chartData.map(item => item.P75));
  const possibleTop = Math.max(worstValue, chartData[0].ni_max);
  const maxValue = possibleTop * 1.05;
  return (
    <ChartContainer config={chartConfig}
    className="[&_.recharts-cartesian-gridstripes-horizontal>rect]:opacity-40">
      <ComposedChart 
        accessibilityLayer 
        data={chartData} 
        stackOffset="expand"
      >
        <CartesianGrid 
          vertical={true} 
          horizontal={true}
          horizontalFill={[
            "var(--color-poor_density)", // Poor - red with opacity
            "var(--color-ni_density)", // Needs improvement - yellow/amber with opacity
            "var(--color-good_density)", // Good - green with opacity
          ]}
          syncWithTicks={true}
          />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value}
          /> 
        <YAxis 
          domain={[ 0, maxValue]}
          ticks={[0, chartData[0].good_max, chartData[0].ni_max, ]}
          hide={true}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Line
          dataKey="P75"
          type="linear"
          stroke="var(--color-good_density)"
          dot={(props) => <Dot {...props} r={2} />}
          // @ts-expect-error dot props are not typed
          activeDot={(props) => <Dot {...props} r={1} />}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
