"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RenderMSValue, renderTimeValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { chartConfig } from '@/components/common/ChartSettings';
import { PageSpeedInsights } from "@/lib/schema";
import { getNumber } from "@/lib/utils";


 // Color mapping for subparts
 const subpartColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

// LCP subpart order (from first to last)
const LCP_SUBPART_ORDER = [
  'timeToFirstByte',      // Time to First Byte (TTFB)
  'resourceLoadDelay',    // Resource load delay
  'resourceLoadDuration', // Resource load duration
  'elementRenderDelay',   // Element render delay
];

type LCPBreakdownCardProps = {
  metrics: Array<{
    item: PageSpeedInsights;
    label: string;
  }>;
};

type LCPSubpartRow = {
  subpart: string;
  label: string;
  [reportLabel: string]: string | number | undefined;
};

export function LCPBreakdownCard({ metrics }: LCPBreakdownCardProps) {
  const breakdownData = useMemo(() => {
    return metrics.map(({ item, label }) => {
      const lcpBreakdownAudit = item?.lighthouseResult?.audits?.['lcp-breakdown-insight'];
      const details = lcpBreakdownAudit?.details as { items?: Array<{ type?: string; items?: Array<Record<string, unknown>> }> } | undefined;
      
      // Find the table item in details
      const tableItem = details?.items?.find(item => item.type === 'table');
      const subparts = (tableItem?.items || []) as Array<{
        subpart?: string;
        label?: string;
        duration?: number | unknown;
      }>;
      
      return {
        label,
        subparts: subparts.map(subpart => ({
          subpart: typeof subpart.subpart === 'string' ? subpart.subpart : '',
          label: typeof subpart.label === 'string' ? subpart.label : '',
          duration: getNumber(subpart.duration) || 0,
        })),
      };
    }).filter(data => data.subparts.length > 0);
  }, [metrics]);


  // Create table rows
  const tableRows = useMemo(() => {
    const subpartMap = new Map<string, LCPSubpartRow>();
    
    breakdownData.forEach(({ label, subparts }) => {
      subparts.forEach(({ subpart, label: subpartLabel, duration }) => {
        if (!subpartMap.has(subpart)) {
          subpartMap.set(subpart, {
            subpart,
            label: subpartLabel,
          });
        }
        const row = subpartMap.get(subpart)!;
        row[label] = duration;
      });
    });
    
    // Sort by LCP subpart order
    return Array.from(subpartMap.values()).sort((a, b) => {
      const aIndex = LCP_SUBPART_ORDER.indexOf(a.subpart);
      const bIndex = LCP_SUBPART_ORDER.indexOf(b.subpart);
      // If not in order array, put at end
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [breakdownData]);

  // Get all unique subparts for the chart, sorted by LCP subpart order
  const allSubparts = useMemo(() => {
    const subpartSet = new Set<string>();
    breakdownData.forEach(({ subparts }) => {
      subparts.forEach(({ subpart }) => {
        if (subpart) subpartSet.add(subpart);
      });
    });
    const subpartsArray = Array.from(subpartSet);
    // Sort by LCP subpart order
    return subpartsArray.sort((a, b) => {
      const aIndex = LCP_SUBPART_ORDER.indexOf(a);
      const bIndex = LCP_SUBPART_ORDER.indexOf(b);
      // If not in order array, put at end
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [breakdownData]);

  // Create chart data - one bar per report, with subparts as stacked segments
  // Subparts must be added in the correct order for stacking
  const chartData = useMemo(() => {
    return breakdownData.map(({ label, subparts }) => {
      const dataPoint: Record<string, string | number> = {
        report: label,
      };
      // Create a map for quick lookup
      const subpartMap = new Map(subparts.map(s => [s.subpart, s.duration]));
      // Add each subpart in order (using allSubparts which is already sorted)
      allSubparts.forEach((subpart) => {
        dataPoint[subpart] = subpartMap.get(subpart) || 0;
      });
      return dataPoint;
    });
  }, [breakdownData, allSubparts]);

  const reportLabels = breakdownData.map(d => d.label);
  
  // Calculate chart height based on number of reports (1rem per report + spacing)
  const chartHeight = useMemo(() => {
    const barHeight = 16; // 1rem = 16px
    const spacing = 24; // spacing between bars (increased to prevent overlap)
    const topMargin = 12;
    const bottomMargin = 12;
    // Height = (number of bars × (bar height + spacing)) + margins
    // For the last bar, we don't need spacing after it
    return breakdownData.length * barHeight + (breakdownData.length - 1) * spacing + topMargin + bottomMargin;
  }, [breakdownData.length]);
  
  // Map subpart keys to their labels for display
  const subpartLabels = useMemo(() => {
    const labelMap = new Map<string, string>();
    breakdownData.forEach(({ subparts }) => {
      subparts.forEach(({ subpart, label: subpartLabel }) => {
        if (subpart && !labelMap.has(subpart)) {
          labelMap.set(subpart, subpartLabel);
        }
      });
    });
    return labelMap;
  }, [breakdownData]);
  
 

  if (!breakdownData.length) {
    return null;
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>LCP Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Chart Visualization */}
             <div className="relative z-10">
             <ChartContainer config={chartConfig} className="w-full h-full" style={{ height: `${chartHeight}px` }}>
                <BarChart
                  accessibilityLayer
                  data={chartData}
                  layout="vertical"
                  margin={{
                    left: 120,
                    right: 12,
                    top: 12,
                    bottom: 12,
                  }}
                  barCategoryGap={24}
                >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}ms`}
                />
                <YAxis
                  type="category"
                  dataKey="report"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={120}
                  interval={0}
                />
                <ChartTooltip
                  cursor={false}
                  wrapperStyle={{ zIndex: 9999 }}
                  content={<ChartTooltipContent 
                    indicator="line"
                    style={{ zIndex: 9999 }}
                    formatter={(value, name) => {
                      const label = subpartLabels.get(name as string) || name;
                      const formattedValue = `${renderTimeValue(value)} `;
                      return [formattedValue, label];
                    }}
                  />}
                />
                {allSubparts.map((subpart, index) => (
                  <Bar
                    key={subpart}
                    dataKey={subpart}
                    stackId="a"
                    fill={subpartColors[index % subpartColors.length]}
                    fillOpacity={0.8}
                    radius={index === allSubparts.length - 1 ? [0, 4, 4, 0] : 0}
                    barSize={16}
                  />
                ))}
              </BarChart>
            </ChartContainer>
            </div>
          

          {/* Table */}
           <div className="overflow-x-auto relative z-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">Subpart</TableHead>
                  {reportLabels.map((label) => (
                    <TableHead key={label} className="min-w-35">{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => (
                  <TableRow key={row.subpart}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {reportLabels.map((label) => (
                      <TableCell key={label}>
                        {row[label] !== undefined ? (
                          <RenderMSValue value={row[label] as number} />
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

