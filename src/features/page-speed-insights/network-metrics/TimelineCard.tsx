"use client";
import { useMemo } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { DataTableHeader } from "@/features/page-speed-insights/lh-categories/table/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/lh-categories/table/DataTableBody";
import { useStandardTable } from "@/features/page-speed-insights/shared/tableConfigHelpers";
import { createOptionalNumericCell } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { NetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

type TimelineRow = {
  event: string;
  [reportLabel: string]: string | number | undefined;
};

const EVENT_MAP: Record<string, string> = {
  "Navigation Start": "observedNavigationStart",
  TTFB: "ttfb",
  "First Paint": "observedFirstPaint",
  "First Visual Change": "observedFirstVisualChange",
  FCP: "fcp",
  "FCP (Observed)": "observedFirstContentfulPaint",
  "FCP (All Frames)": "observedFirstContentfulPaintAllFrames",
  LCP: "lcp",
  "LCP (Observed)": "observedLargestContentfulPaint",
  "LCP (All Frames)": "observedLargestContentfulPaintAllFrames",
  "DOM Content Loaded": "domContentLoaded",
  Load: "loadTime",
  "Last Visual Change": "observedLastVisualChange",
  Interactive: "interactive",
  "Trace End": "observedTraceEnd",
};

const EVENTS_WITH_TTFB = new Set([
  "DOM Content Loaded",
  "Load",
  "First Paint",
  "First Visual Change",
  "FCP (Observed)",
  "FCP (All Frames)",
  "LCP (Observed)",
  "LCP (All Frames)",
  "Last Visual Change",
  "Trace End",
]);

const EVENT_DESCRIPTIONS: Record<string, string> = {
  "Navigation Start":
    "The time when the browser starts navigating to the page. This is the earliest timestamp in the navigation timing API.",
  TTFB: "Time to First Byte - The time between when the user requests a page and when the first byte of the response is received from the server.",
  "First Paint":
    "The time when the browser first renders any visual content (pixels) to the screen. This includes background colors, borders, or any visual change.",
  "First Visual Change":
    "The time when the first visual change occurs on the page, marking the beginning of visual rendering.",
  FCP: "First Contentful Paint - The time when the browser renders the first bit of content from the DOM, such as text, an image, or a canvas element.",
  "FCP (Observed)":
    "First Contentful Paint (Observed) - The observed FCP value from the Performance Observer API, which may differ slightly from the calculated FCP.",
  "FCP (All Frames)":
    "First Contentful Paint (All Frames) - The observed FCP value across all frames, including iframes.",
  LCP: "Largest Contentful Paint - The render time of the largest image or text block visible within the viewport.",
  "LCP (Observed)":
    "Largest Contentful Paint (Observed) - The observed LCP value from the Performance Observer API, which tracks the largest content element as it loads.",
  "LCP (All Frames)":
    "Largest Contentful Paint (All Frames) - The observed LCP value across all frames, including iframes.",
  "DOM Content Loaded":
    "The time when the HTML document has been completely loaded and parsed, without waiting for stylesheets, images, and subframes to finish loading.",
  Load: "The time when the page and all its resources (images, stylesheets, scripts) have finished loading.",
  "Last Visual Change":
    "The time when the last visual change occurs on the page, marking the end of visual rendering.",
  Interactive:
    "Time to Interactive - The time when the page becomes fully interactive, meaning the main thread is idle enough to handle user input.",
  "Trace End":
    "The time when the performance trace ends, marking the completion of the performance measurement.",
};

function sortNumeric(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
}

function buildEventDataMap(
  metrics: readonly NetworkMetricSeries[],
): Map<string, Record<string, number | undefined>> {
  const eventDataMap = new Map<string, Record<string, number | undefined>>();

  for (const metric of metrics) {
    const ttfb = metric.ttfb ?? 0;

    for (const [eventLabel, propKey] of Object.entries(EVENT_MAP)) {
      const rawValue = metric[propKey as keyof NetworkMetricSeries] as number | undefined;
      if (rawValue === undefined) continue;

      if (!eventDataMap.has(eventLabel)) {
        eventDataMap.set(eventLabel, {});
      }
      const eventData = eventDataMap.get(eventLabel)!;

      if (eventLabel === "Navigation Start") {
        eventData[metric.label] = 0;
      } else if (eventLabel === "TTFB") {
        eventData[metric.label] = rawValue;
      } else if (EVENTS_WITH_TTFB.has(eventLabel)) {
        eventData[metric.label] = rawValue + ttfb;
      } else {
        eventData[metric.label] = rawValue;
      }
    }
  }

  return eventDataMap;
}

function buildTimelineRows(
  eventDataMap: Map<string, Record<string, number | undefined>>,
  reportLabels: string[],
): TimelineRow[] {
  const rows: TimelineRow[] = [];

  eventDataMap.forEach((data, eventLabel) => {
    const row: TimelineRow = { event: eventLabel };
    for (const reportLabel of reportLabels) {
      row[reportLabel] = data[reportLabel] ?? undefined;
    }
    rows.push(row);
  });

  if (reportLabels.length > 0) {
    const firstReportLabel = reportLabels[0];
    rows.sort((a, b) =>
      sortNumeric(
        a[firstReportLabel] as number | undefined,
        b[firstReportLabel] as number | undefined,
      ),
    );
  }

  return rows;
}

function optionalMsCell(value: number | undefined) {
  return createOptionalNumericCell(RenderMSValue, value);
}

export function TimelineCard() {
  "use no memo";

  const series = useNetworkMetricSeries();

  const { data, columns } = useMemo((): {
    data: TimelineRow[];
    columns: ColumnDef<TimelineRow, any>[];
  } => {
    const reportLabels = series.map((m) => m.label);
    const eventDataMap = buildEventDataMap(series);
    const rows = buildTimelineRows(eventDataMap, reportLabels);

    const columnHelper = createColumnHelper<TimelineRow>();
    const tableColumns: ColumnDef<TimelineRow, any>[] = [
      columnHelper.accessor("event", {
        id: "event",
        header: () => (
          <span title="Performance events observed during page load, sorted by time">Event</span>
        ),
        enableSorting: true,
        enableResizing: true,
        cell: (info) => {
          const eventName = info.getValue();
          const description = EVENT_DESCRIPTIONS[eventName] ?? "";
          return (
            <span className="font-medium" title={description}>
              {eventName}
            </span>
          );
        },
      }),
      ...reportLabels.map((reportLabel, index) =>
        columnHelper.accessor((row) => row[reportLabel] as number | undefined, {
          id: `report_${index}`,
          header: reportLabel || `Report ${index + 1}`,
          enableSorting: true,
          enableResizing: true,
          sortingFn: (rowA, rowB, columnId) => {
            const a = rowA.getValue(columnId) as number | undefined;
            const b = rowB.getValue(columnId) as number | undefined;
            return sortNumeric(a, b);
          },
          cell: (info) => optionalMsCell(info.getValue()),
        }),
      ),
    ];

    return { data: rows, columns: tableColumns };
  }, [series]);

  const table = useStandardTable({
    data,
    columns,
  });

  if (!series.length || data.length === 0) {
    return null;
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Timeline of Observed Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
