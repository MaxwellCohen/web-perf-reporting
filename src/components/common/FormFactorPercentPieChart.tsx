'use client';

import { RadialBar, RadialBarChart } from 'recharts';

import { Card } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import React from 'react';
import { cn } from '@/lib/utils';

export function toSentenceCase(str: string) {
  if (!str) {
    return '';
  }
  const result = str.split('_').join(' ').toLowerCase();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function FormFactorPercentPieChart({
  title,
  form_factors,
}: {
  title: string;
  form_factors: Record<string, number>;
}) {
  const entries = Object.entries(form_factors);
  const chartData = [
    entries.reduce((acc: Record<string, number>, [key, value]) => {
      acc[key] = value * 100;
      return acc;
    }, {}),
  ];
  const chartConfig = entries.reduce((acc: ChartConfig, [label], i) => {
    acc[label] = {
      label: toSentenceCase(label),
      color: `hsl(var(--chart-${i + 4}))`,
    };
    return acc;
  }, {});

  return (
    <Card className="grid-rows-[44px,auto, 1fr] grid grid-cols-1 gap-3 p-2">
      <div className="text-md text-center font-bold">{title}</div>
      <ChartContainer config={chartConfig} className="w-full">
        <RadialBarChart
          data={chartData}
          innerRadius={'50%'}
          outerRadius={'100%'}
        >
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          {entries.map(([label]) => (
            <RadialBar
              key={label}
              dataKey={label}
              type="natural"
              fill={chartConfig[label].color}
              fillOpacity={0.4}
              stroke={chartConfig[label].color}
              stackId="a"
              animationDuration={0}
            />
          ))}
        </RadialBarChart>
      </ChartContainer>
      <div className="p-2">
        {entries.map(([label, value]) => {
          return (
            <div key={label} className="text-xs leading-none text-muted-foreground">
              {' '}
              <strong>{toSentenceCase(label)}</strong>{' '}
              {(value * 100).toFixed(2)} %{' '}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PercentTable({
  title,
  data,
  className,
}: {
  title: string;
  data: Record<string, number>;
  className?: string;
}) {
  const entries = Object.entries(data);
  return (
    <Card className={cn('flex-1', className)}>
      <div className="text-md text-center font-bold">{title}</div>
      <Table>
        <TableHeader className="pt-2">
          {entries.map(([label]) => {
            return (
              <TableHead key={label} className="h-4">
                {' '}
                {toSentenceCase(label)}{' '}
              </TableHead>
            );
          })}
        </TableHeader>
        <TableBody>
          <TableRow>
            {entries.map(([label, value]) => {
              return (
                <TableCell key={label} className="h-4">
                  {' '}
                  {(value * 100).toFixed(2)} %{' '}
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
