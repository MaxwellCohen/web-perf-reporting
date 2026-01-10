"use client";
import { useMemo } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { RenderMSValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";
import { DataTableHeader } from "@/components/page-speed/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/components/page-speed/lh-categories/table/DataTableBody";
import { useStandardTable } from "@/components/page-speed/shared/tableConfigHelpers";

type TimelineRow = {
  event: string;
  [reportLabel: string]: string | number | undefined;
};

type TimelineCardProps = {
  metrics: Array<{
    label: string;
    ttfb?: number;
    fcp?: number;
    lcp?: number;
    domContentLoaded?: number;
    loadTime?: number;
    interactive?: number;
    observedNavigationStart?: number;
    observedFirstPaint?: number;
    observedFirstContentfulPaint?: number;
    observedLargestContentfulPaint?: number;
  }>;
};

export function TimelineCard({ metrics }: TimelineCardProps) {
  "use no memo";
  
  const { data, columns } = useMemo(() => {
    const eventMap: { [key: string]: string } = {
      'Navigation Start': 'observedNavigationStart',
      'TTFB': 'ttfb',
      'First Paint': 'observedFirstPaint',
      'FCP': 'fcp',
      'FCP (Observed)': 'observedFirstContentfulPaint',
      'LCP': 'lcp',
      'LCP (Observed)': 'observedLargestContentfulPaint',
      'DOM Content Loaded': 'domContentLoaded',
      'Load': 'loadTime',
      'Interactive': 'interactive',
    };
    
    const reportLabels = metrics.map(m => m.label);
    const rows: TimelineRow[] = [];
    const eventDataMap = new Map<string, { [reportLabel: string]: number | undefined }>();
    
    // Events that should account for TTFB (show time after first byte)
    const eventsWithTTFB = new Set([
      'DOM Content Loaded',
      'Load',
      'First Paint',
      'FCP (Observed)',
      'LCP (Observed)',
    ]);
    
    // Collect all event data, adjusting times relative to Navigation Start
    metrics.forEach((metric) => {
      const ttfb = metric.ttfb ?? 0;
      
      Object.entries(eventMap).forEach(([eventLabel, propKey]) => {
        const rawValue = metric[propKey as keyof typeof metric] as number | undefined;
        if (rawValue !== undefined) {
          if (!eventDataMap.has(eventLabel)) {
            eventDataMap.set(eventLabel, {});
          }
          const eventData = eventDataMap.get(eventLabel)!;
          
          // Navigation Start is always 0
          if (eventLabel === 'Navigation Start') {
            eventData[metric.label] = 0;
          } else if (eventLabel === 'TTFB') {
            // TTFB is already a relative value (duration from navigation start), so use it as-is
            eventData[metric.label] = rawValue;
          } else if (eventsWithTTFB.has(eventLabel)) {
            // These events account for TTFB: show time after first byte was received
            // Subtract both navigation start and TTFB to get time after first byte
            eventData[metric.label] = rawValue + ttfb;
          } else {
            // All other events are absolute timestamps, subtract navigation start to get relative time
            eventData[metric.label] = rawValue;
          }
        }
      });
    });
    
    // Convert to rows
    eventDataMap.forEach((data, eventLabel) => {
      const row: TimelineRow = { event: eventLabel };
      reportLabels.forEach((reportLabel) => {
        row[reportLabel] = data[reportLabel] ?? undefined;
      });
      rows.push(row);
    });
    
    // Event descriptions for tooltips
    const eventDescriptions: { [key: string]: string } = {
      'Navigation Start': 'The time when the browser starts navigating to the page. This is the earliest timestamp in the navigation timing API.',
      'TTFB': 'Time to First Byte - The time between when the user requests a page and when the first byte of the response is received from the server.',
      'First Paint': 'The time when the browser first renders any visual content (pixels) to the screen. This includes background colors, borders, or any visual change.',
      'FCP': 'First Contentful Paint - The time when the browser renders the first bit of content from the DOM, such as text, an image, or a canvas element.',
      'FCP (Observed)': 'First Contentful Paint (Observed) - The observed FCP value from the Performance Observer API, which may differ slightly from the calculated FCP.',
      'LCP': 'Largest Contentful Paint - The render time of the largest image or text block visible within the viewport.',
      'LCP (Observed)': 'Largest Contentful Paint (Observed) - The observed LCP value from the Performance Observer API, which tracks the largest content element as it loads.',
      'DOM Content Loaded': 'The time when the HTML document has been completely loaded and parsed, without waiting for stylesheets, images, and subframes to finish loading.',
      'Load': 'The time when the page and all its resources (images, stylesheets, scripts) have finished loading.',
      'Interactive': 'Time to Interactive - The time when the page becomes fully interactive, meaning the main thread is idle enough to handle user input.',
    };
    
    // Create columns
    const columnHelper = createColumnHelper<TimelineRow>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableColumns: ColumnDef<TimelineRow, any>[] = [
      columnHelper.accessor('event', {
        id: 'event',
        header: 'Event',
        enableSorting: true,
        enableResizing: true,
        cell: (info) => {
          const eventName = info.getValue();
          const description = eventDescriptions[eventName] || '';
          return (
            <span className="font-medium" title={description}>
              {eventName}
            </span>
          );
        },
      }),
      ...reportLabels.map((reportLabel) =>
        columnHelper.accessor((row) => row[reportLabel] as number | undefined, {
          id: reportLabel,
          header: reportLabel,
          enableSorting: true,
          enableResizing: true,
          sortingFn: (rowA, rowB, columnId) => {
            const a = rowA.getValue(columnId) as number | undefined;
            const b = rowB.getValue(columnId) as number | undefined;
            if (a === undefined && b === undefined) return 0;
            if (a === undefined) return 1;
            if (b === undefined) return -1;
            return a - b;
          },
          cell: (info) => {
            const value = info.getValue();
            if (value === undefined) {
              return <span className="text-muted-foreground">N/A</span>;
            }
            return <RenderMSValue value={value} />;
          },
        })
      ),
    ];
    
    return { data: rows, columns: tableColumns };
  }, [metrics]);
  
  const table = useStandardTable({
    data,
    columns,
  });
  
  if (!metrics.length || data.length === 0) {
    return null;
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Timeline of Observed Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

