import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DebugData } from '@/lib/schema';
import { renderBoolean } from './renderBoolean';
import { camelCaseToSentenceCase } from './camelCaseToSentenceCase';

export function RenderDebugData({
  mobileDebugData,
  desktopDebugData,
}: {
  mobileDebugData?: DebugData;
  desktopDebugData?: DebugData;
}) {
  const mobileItems = cleanDebugData(mobileDebugData);
  const mobileKeys = Object.keys(mobileItems);
  const desktopItems = cleanDebugData(desktopDebugData);
  const desktopKeys = Object.keys(desktopItems);

  const keys = [
    ...new Set([...mobileKeys, ...desktopKeys]),
  ].filter((k) => k !== 'type' ).filter((k) => !k.endsWith('Ts')).sort((a, b) => { return (TitleMap[a]?.sortOrder || Infinity) - (TitleMap[b]?.sortOrder || Infinity);  });

  if (!keys.length) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          {mobileKeys.length ? (
            <TableHead>Mobile Value</TableHead>
          ) : null}
          {desktopKeys?.length ? (
            <TableHead>Desktop Value </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key, i) => {
          return (
            <TableRow key={`${i}-${key}`}>
              <TableCell rowSpan={1}>
                {' '}
                {RenderTitle(key)}{' '}
              </TableCell>
              {mobileKeys?.length ? (
                <TableCell rowSpan={1}>
                  {renderItem(mobileItems?.[key])}
                </TableCell>
              ) : null}
              {desktopKeys?.length ? (
                <TableCell rowSpan={1}>
                  {renderItem(desktopItems?.[key])}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function renderItem(item: unknown) {
  if (typeof item === 'string') {
    return item;
  }
  if (typeof item === 'number') {
    return item.toFixed(2);
  }
  if (typeof item === 'boolean') {
    return renderBoolean(item);
  }
  return '';
}

function cleanDebugData(data: DebugData | undefined) {
  if (!data) {
    return {};
  }
  return [
    Object.fromEntries(
      Object.entries(data || {}).filter(
        (v) => !['type', 'items'].includes(v[0]),
      ),
    ),
    ...(data?.items || []),
  ].reduce(
    (acc: Record<string, unknown>, i: Record<string, unknown>) => ({
      ...acc,
      ...i,
    }),
    {},
  );
}
const TitleMap: Record<string, {label: string, sortOrder: number}> = {
  cumulativeLayoutShift: {label: "Cumulative Layout Shift", sortOrder: 1},
  cumulativeLayoutShiftMainFrame: {label: "Cumulative Layout Shift (Main Frame)", sortOrder: 2},
  firstContentfulPaint: {label: "First Contentful Paint", sortOrder: 3},
  interactive: {label: "Interactive", sortOrder: 4},
  largestContentfulPaint: {label: "Largest Contentful Paint", sortOrder: 5},
  lcpLoadStart: {label: "LCP Load Start", sortOrder: 6},
  lcpLoadEnd: {label: "LCP Load End", sortOrder: 7},
  lcpInvalidated: {label: "LCP Invalidated", sortOrder: 8},
  mainDocumentTransferSize: {label: "Main Document Transfer Size", sortOrder: 9},
  totalByteWeight: {label: "Total Byte Weight", sortOrder: 9.1},
  maxPotentialFID: {label: "Max Potential FID", sortOrder: 10},
  maxRtt: {label: "Maximum Round Trip Time", sortOrder: 11},
  maxServerLatency: {label: "Maximum Server Latency", sortOrder: 12},
  numFonts: {label: "Number of Fonts", sortOrder: 13},
  numScripts: {label: 'Number of Scripts', sortOrder: 14},
  numStylesheets: {label: "Number of Stylesheets", sortOrder: 15},
  numRequests: {label: "Number of Requests", sortOrder: 16},
  numTasks: {label: "Number of Tasks", sortOrder: 17},
  numTasksOver10ms: {label: 'Number of Tasks over 10ms', sortOrder: 18},
  numTasksOver25ms: {label: "Number of Tasks over 25ms", sortOrder: 19},
  numTasksOver50ms: {label: 'Number of Tasks over 50ms', sortOrder: 20},
  numTasksOver100ms: {label: 'Number of Tasks over 100ms', sortOrder: 21},
  numTasksOver500ms: {label: "Number of Tasks over 500ms", sortOrder: 22},
  totalTaskTime: {label: 'Total Task Time', sortOrder: 23},
  observedCumulativeLayoutShift: {label: "Observed Cumulative Layout Shift", sortOrder: 24},
  observedCumulativeLayoutShiftMainFrame: {label: "Observed Cumulative Layout Shift Main Frame", sortOrder: 25},
  observedDomContentLoaded: {label: "Observed DOM Content Loaded", sortOrder: 26},
  observedDomContentLoadedTs: {label: "Observed Dom Content Loaded Ts", sortOrder: 27},
  observedFirstContentfulPaint: {label: "Observed First Contentful Paint", sortOrder: 28},
  observedFirstContentfulPaintAllFrames: {label: "Observed First Contentful Paint All Frames", sortOrder: 29},
  observedFirstContentfulPaintAllFramesTs: {label: "Observed First Contentful Paint All Frames Ts", sortOrder: 30},
  observedFirstContentfulPaintTs: {label: "Observed First Contentful Paint Ts", sortOrder: 31},
  observedFirstPaint: {label: "Observed First Paint", sortOrder: 32},
  observedFirstPaintTs: {label: "Observed First Paint Ts", sortOrder: 33},
  observedFirstVisualChange: {label: "Observed First Visual Change", sortOrder: 34},
  observedFirstVisualChangeTs: {label: "Observed First Visual Change Ts", sortOrder: 35},
  observedLargestContentfulPaint: {label: "Observed Largest Contentful Paint", sortOrder: 36},
  observedLargestContentfulPaintAllFrames: {label: "Observed Largest Contentful Paint All Frames", sortOrder: 37},
  observedLargestContentfulPaintAllFramesTs: {label: "Observed Largest Contentful Paint All Frames Ts", sortOrder: 38},
  observedLargestContentfulPaintTs: {label: "Observed Largest Contentful Paint Ts", sortOrder: 39},
  observedLastVisualChange: {label: "Observed Last Visual Change", sortOrder: 40},
  observedLastVisualChangeTs: {label: "Observed Last Visual Change Ts", sortOrder: 41},
  observedLoad: {label: "Observed Load", sortOrder: 42},
  observedLoadTs: {label: "Observed Load Ts", sortOrder: 43},
  observedNavigationStart: {label: "Observed Navigation Start", sortOrder: 44},
  observedNavigationStartTs: {label: "Observed Navigation Start Ts", sortOrder: 45},
  observedSpeedIndex: {label: "Observed Speed Index", sortOrder: 46},
  observedSpeedIndexTs: {label: "Observed Speed Index Ts", sortOrder: 47},
  observedTimeOrigin: {label: "Observed Time Origin", sortOrder: 48},
  observedTimeOriginTs: {label: "Observed Time Origin Ts", sortOrder: 49},
  observedTraceEnd: {label: "Observed Trace End", sortOrder: 50},
  observedTraceEndTs: {label: "Observed Trace End Ts", sortOrder: 51},
  rtt: {label: "Round Trip Time (RTT)", sortOrder: 52},
  speedIndex: {label: "Speed Index", sortOrder: 53},
  throughput: {label: "Throughput", sortOrder: 54},
  timeToFirstByte: {label: "Time To First Byte", sortOrder: 55},
  totalBlockingTime: {label: "Total Blocking Time", sortOrder: 56},
  

 };

function RenderTitle(s: string) {
  console.log(s);
  return TitleMap[s as keyof typeof TitleMap]?.label || camelCaseToSentenceCase(s);
}