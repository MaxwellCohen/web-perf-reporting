'use client';

import { RadialBar, RadialBarChart } from 'recharts';

import { Card } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { FormFactorFractions } from '@/lib/schema';

export function FormFactorPercentPieChart({
  title,
  form_factors,
}: {
  title: string;
  form_factors: FormFactorFractions;
}) {
  const entries = Object.entries(form_factors);
  const chartData = [
    {
      desktop: form_factors.desktop * 100,
      phone: form_factors.phone * 100,
      tablet: form_factors.tablet * 100,
    },
  ];
  const chartConfig = entries.reduce((acc: ChartConfig, [key], i) => {
    acc[key] = {
      label: key,
      color: `hsl(var(--chart-${i + 4}))`,
    };
    return acc;
  }, {});

  return (
    <Card className="grid grid-cols-1 grid-rows-[44px,auto,72px] gap-3 p-2">
      <div className="text-md text-center font-bold">{title}</div>
      <ChartContainer
        config={chartConfig}
        className="w-full"
      >
        <RadialBarChart
          data={chartData}
          innerRadius={'50%'}
          outerRadius={'100%'}
        >
          <ChartTooltip
            cursor={false}
            
            content={<ChartTooltipContent hideLabel   
          />}
          />
          <RadialBar
            dataKey="desktop"
            type="natural"
            fill="var(--color-desktop)"
            fillOpacity={0.4}
            stroke="var(--color-desktop)"
            stackId="a"
            animationDuration={0}
          />

          <RadialBar
            dataKey="phone"
            type="natural"
            fill="var(--color-phone)"
            fillOpacity={0.4}
            stroke="var(--color-phone)"
            stackId="a"
            animationDuration={0}
          />
          <RadialBar
            dataKey="tablet"
            type="natural"
            fill="var(--color-tablet)"
            fillOpacity={0.4}
            stroke="var(--color-tablet)"
            stackId="a"
            animationDuration={0}
          />
        </RadialBarChart>
      </ChartContainer>
    <div className='p-2'>
      <div className="text-xs leading-none text-muted-foreground"> <strong>desktop:</strong> {form_factors.desktop * 100} % </div>
      <div className="text-xs leading-none text-muted-foreground"> <strong>phone:</strong> {form_factors.phone * 100} % </div>
      <div className="text-xs leading-none text-muted-foreground"> <strong>tablet:</strong> {form_factors.tablet * 100} % </div>
      </div>
    </Card>
  );
}
