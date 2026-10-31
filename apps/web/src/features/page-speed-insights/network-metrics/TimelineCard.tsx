"use client";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { createOptionalNumericCell } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import {
  buildTimelineChartRows,
  sortNumeric,
  type TimelineChartRow,
} from "@/features/page-speed-insights/network-metrics/timelineMetricsData";

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

function optionalMsCell(value: number | undefined) {
  return createOptionalNumericCell(RenderMSValue, value);
}

function TimelineCardTable({
  data,
  columns,
  title,
}: {
  data: TimelineChartRow[];
  columns: StandardColumnDef<TimelineChartRow>[];
  title: string;
}) {
  const table = useStandardTable({ data, columns });

  return <TableCard title={title} table={table} />;
}

export function TimelineCard() {
  const series = useNetworkMetricSeries();

  const reportLabels = series.map((m) => m.label);
  const rows = buildTimelineChartRows(series, EVENT_MAP, "Navigation Start");
  const simulationLabel = series.map((m) => m.simulationLabel).find(Boolean);
  const title = simulationLabel
    ? `Timeline of Observed Events (${simulationLabel})`
    : "Timeline of Observed Events";
  const columnHelper = createStockColumnHelper<TimelineChartRow>();
  const tableColumns: StandardColumnDef<TimelineChartRow>[] = [
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
    ...reportLabels.map((reportLabel, index) => {
      const columnId = reportLabel ? `report_${reportLabel}` : `report_${index}`;
      return columnHelper.accessor((row) => row[reportLabel] as number | undefined, {
        id: columnId,
        header: reportLabel || `Report ${index + 1}`,
        enableSorting: true,
        enableResizing: true,
        sortFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as number | undefined;
          const b = rowB.getValue(columnId) as number | undefined;
          return sortNumeric(a, b);
        },
        cell: (info) => optionalMsCell(info.getValue()),
      });
    }),
  ];
  if (!series.length || rows.length === 0) {
    return null;
  }

  return <TimelineCardTable data={rows} columns={tableColumns} title={title} />;
}
