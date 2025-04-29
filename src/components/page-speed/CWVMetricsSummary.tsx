'use client';
import { DebugData, PageSpeedInsights } from '@/lib/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { renderBoolean } from './lh-categories/renderBoolean';
import { camelCaseToSentenceCase } from './lh-categories/camelCaseToSentenceCase';
import { Card, CardHeader } from '../ui/card';
import { Details } from '../ui/accordion';
import { RenderBytesValue, RenderMSValue } from './lh-categories/table/RenderTableValue';
import { JSX } from 'react';

export function CWVMetricsSummary({
  desktopData,
  mobileData,
}: {
  desktopData?: PageSpeedInsights;
  mobileData?: PageSpeedInsights;
}) {
  const desktopItems = mergeData(desktopData);
  const mobileItems = mergeData(mobileData);
  const mobileKeys = Object.keys(mobileItems);
  const desktopKeys = Object.keys(desktopItems);
  const keys = [...new Set([...mobileKeys, ...desktopKeys])]
    .filter((k) => k !== 'type')
    .filter((k) => !k.endsWith('Ts'))
    .sort((a, b) => {
      return (
        (TitleMap[a]?.sortOrder || Infinity) -
        (TitleMap[b]?.sortOrder || Infinity)
      );
    });

  if (!keys.length) {
    return null;
  }

  const CWV = [
    'cumulativeLayoutShift',
    'cumulativeLayoutShiftMainFrame',
    'firstContentfulPaint',
    'largestContentfulPaint',
    'interactive',
    'totalBlockingTime',
  ]
  
  const taskKeys = [
    'numTasksOver10ms',
    'numTasksOver25ms',
    'numTasksOver50ms',
    'numTasksOver100ms',
    'numTasksOver500ms',
    'numTasks',
  ];

  const resourceKeys = [
    'numRequests',
    'numFonts',
    'numScripts',
    'numStylesheets',
    'mainDocumentTransferSize',
    'totalByteWeight',
  ];

  const LCPInfo = [
    'lcpLoadStart',
    'lcpLoadEnd',
    'lcpInvalidated',
  ]

  const timmingInfo = [
    'firstContentfulPaint',
    'firstContentfulPaintAllFrames',
    'maxPotentialFID',  
    'totalBlockingTime',
    'largestContentfulPaint',
    'speedIndex',
    'interactive',
  ];
  const ObservedEvents = [
    'observedNavigationStart',
    'observedFirstPaint',
    'observedFirstContentfulPaint',
    'observedFirstContentfulPaintAllFrames',
    'observedLargestContentfulPaint',
    'observedLargestContentfulPaintAllFrames',
    'observedTraceEnd',
    'observedLoad',
    'observedDomContentLoaded',
  ]
  return (
    <Details>
      <summary className='flex flex-col gap-2'>
        <h3 className="text-xl font-semibold">Summary Metrics</h3>
        </summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3 ">
        <RenderTable
          mobileItems={mobileItems}
          desktopItems={desktopItems}
          keys={CWV}
          title={'Core Web Vitals'}
          formatter={(v, k) => ([    'cumulativeLayoutShift',
            'cumulativeLayoutShiftMainFrame'].includes(k as string)? `${v }`: RenderMSValue({value: v}))}
        />
        <RenderTable
          mobileItems={mobileItems}
          desktopItems={desktopItems}
          keys={taskKeys}
          title={'Number of tasks'}
          formatter={(v) => `${v}`}
        />
        <RenderTable
          mobileItems={mobileItems}
          desktopItems={desktopItems}
          keys={resourceKeys}
          title={'Resource Info'}
          formatter={(v, key) => ['mainDocumentTransferSize','totalByteWeight'].includes(key as string) ? RenderBytesValue({value: v}): `${v}`}
        />
        <RenderTable
          mobileItems={mobileItems}
          desktopItems={desktopItems}
          keys={LCPInfo}
          title={'LCP info'}
          formatter={(v) => {
            return typeof v === 'boolean' ? renderBoolean(v) : RenderMSValue({value: v});
          } }
        />
        <RenderTable
          mobileItems={mobileItems}
          desktopItems={desktopItems}
          keys={timmingInfo}
          title={'Timings info'}
          formatter={(v) => {
            return  RenderMSValue({value: v});
          } }
        />
        <RenderTable
          mobileItems={mobileItems}
          desktopItems={desktopItems}
          keys={ObservedEvents}
          title={'Observed Events'}
          formatter={(v) => {
            return  RenderMSValue({value: v});
          } }
        />
 
      </div>
    </Details>
  );
}

function RenderTable({
  mobileItems,
  desktopItems,
  keys,
  title,
  formatter,
}: {
  mobileItems: Record<string, string | number>;
  desktopItems: Record<string, string | number>;
  keys: string[];
  title: string;
  formatter: (item: unknown, key?: string) => string | JSX.Element;
}) {
  const mobileKeys = Object.keys(mobileItems).filter((k) => keys.includes(k));
  const desktopKeys = Object.keys(desktopItems).filter((k) => keys.includes(k));

  return (
    <Card className="min-w-1/3">
      <CardHeader className="text-center text-2xl font-bold">
        {title}
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            {mobileKeys.length ? <TableHead>Mobile</TableHead> : null}
            {desktopKeys?.length ? <TableHead>Desktop</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key, i) => {
            return (
              <TableRow key={`${i}-${key}`}>
                <TableCell rowSpan={1}> {RenderTitle(key)} </TableCell>
                {mobileKeys?.length ? (
                  <TableCell rowSpan={1}>
                    {formatter(mobileItems?.[key], key)}
                  </TableCell>
                ) : null}
                {desktopKeys?.length ? (
                  <TableCell rowSpan={1}>
                    {formatter(desktopItems?.[key], key)}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function mergeData(auditData?: PageSpeedInsights) {
  const metrics =
    (auditData?.lighthouseResult?.audits?.['metrics'] as unknown as DebugData)
      ?.details?.items || [];
  const details =
    (
      auditData?.lighthouseResult?.audits?.[
        'diagnostics'
      ] as unknown as DebugData
    )?.details?.items || [];
  const allData = [...metrics, ...details];
  const mergedData = allData.reduce(
    (acc, curr) => {
      return { ...acc, ...curr };
    },
    {} as Record<string, string | number>,
  );
  return mergedData;
}

const TitleMap: Record<string, { label: string; sortOrder: number }> = {
  // Core Web Vitals
  cumulativeLayoutShift: { label: 'Cumulative Layout Shift', sortOrder: 1 },
  cumulativeLayoutShiftMainFrame: {label: 'Cumulative Layout Shift (Main Frame)', sortOrder: 2 },
  firstContentfulPaint: { label: 'First Contentful Paint', sortOrder: 3 },
  largestContentfulPaint: { label: 'Largest Contentful Paint', sortOrder: 4 },
  interactive: { label: 'Interactive', sortOrder: 5 },
  totalBlockingTime: { label: 'Total Blocking Time', sortOrder: 6 },

  // LCP Details
  lcpLoadStart: { label: 'LCP Load Start', sortOrder: 7 },
  lcpLoadEnd: { label: 'LCP Load End', sortOrder: 8 },
  lcpInvalidated: { label: 'LCP Invalidated', sortOrder: 9 },

  // Performance Metrics
  speedIndex: { label: 'Speed Index', sortOrder: 10 },
  maxPotentialFID: { label: 'Max Potential FID', sortOrder: 11 },
  timeToFirstByte: { label: 'Time To First Byte', sortOrder: 12 },

  // Network Statistics
  rtt: { label: 'Round Trip Time (RTT)', sortOrder: 13 },
  maxRtt: { label: 'Maximum Round Trip Time', sortOrder: 14 },
  maxServerLatency: { label: 'Maximum Server Latency', sortOrder: 15 },
  throughput: { label: 'Throughput', sortOrder: 16 },
  mainDocumentTransferSize: {
    label: 'Main Document Transfer Size',
    sortOrder: 17,
  },
  totalByteWeight: { label: 'Total Byte Weight', sortOrder: 18 },

  // Resource Counts
  numRequests: { label: 'Number of Requests', sortOrder: 19 },
  numFonts: { label: 'Number of Fonts', sortOrder: 20 },
  numScripts: { label: 'Number of Scripts', sortOrder: 21 },
  numStylesheets: { label: 'Number of Stylesheets', sortOrder: 22 },

  // Task Timing
  numTasks: { label: 'Number of Top Level Tasks', sortOrder: 23 },
  numTasksOver10ms: { label: 'Number of Tasks over 10ms', sortOrder: 24 },
  numTasksOver25ms: { label: 'Number of Tasks over 25ms', sortOrder: 25 },
  numTasksOver50ms: { label: 'Number of Tasks over 50ms', sortOrder: 26 },
  numTasksOver100ms: { label: 'Number of Tasks over 100ms', sortOrder: 27 },
  numTasksOver500ms: { label: 'Number of Tasks over 500ms', sortOrder: 28 },
  totalTaskTime: { label: 'Total Task Time', sortOrder: 29 },

  // Observed Metrics
  observedCumulativeLayoutShift: {
    label: 'Observed Cumulative Layout Shift',
    sortOrder: 30,
  },
  observedCumulativeLayoutShiftMainFrame: {
    label: 'Observed Cumulative Layout Shift Main Frame',
    sortOrder: 31,
  },
  observedFirstPaint: { label: 'Observed First Paint', sortOrder: 32 },
  observedFirstPaintTs: { label: 'Observed First Paint Ts', sortOrder: 33 },
  observedFirstContentfulPaint: {
    label: 'Observed First Contentful Paint',
    sortOrder: 34,
  },
  observedFirstContentfulPaintTs: {
    label: 'Observed First Contentful Paint Ts',
    sortOrder: 35,
  },
  observedFirstContentfulPaintAllFrames: {
    label: 'Observed First Contentful Paint All Frames',
    sortOrder: 36,
  },
  observedFirstContentfulPaintAllFramesTs: {
    label: 'Observed First Contentful Paint All Frames Ts',
    sortOrder: 37,
  },
  observedLargestContentfulPaint: {
    label: 'Observed Largest Contentful Paint',
    sortOrder: 38,
  },
  observedLargestContentfulPaintTs: {
    label: 'Observed Largest Contentful Paint Ts',
    sortOrder: 39,
  },
  observedLargestContentfulPaintAllFrames: {
    label: 'Observed Largest Contentful Paint All Frames',
    sortOrder: 40,
  },
  observedLargestContentfulPaintAllFramesTs: {
    label: 'Observed Largest Contentful Paint All Frames Ts',
    sortOrder: 41,
  },

  // Page Load Events
  observedDomContentLoaded: {
    label: 'Observed DOM Content Loaded',
    sortOrder: 42,
  },
  observedDomContentLoadedTs: {
    label: 'Observed Dom Content Loaded Ts',
    sortOrder: 43,
  },
  observedLoad: { label: 'Observed Load', sortOrder: 44 },
  observedLoadTs: { label: 'Observed Load Ts', sortOrder: 45 },

  // Visual Change Events
  observedFirstVisualChange: {
    label: 'Observed First Visual Change',
    sortOrder: 46,
  },
  observedFirstVisualChangeTs: {
    label: 'Observed First Visual Change Ts',
    sortOrder: 47,
  },
  observedLastVisualChange: {
    label: 'Observed Last Visual Change',
    sortOrder: 48,
  },
  observedLastVisualChangeTs: {
    label: 'Observed Last Visual Change Ts',
    sortOrder: 49,
  },

  // Navigation and Timing
  observedNavigationStart: {
    label: 'Observed Navigation Start',
    sortOrder: 50,
  },
  observedNavigationStartTs: {
    label: 'Observed Navigation Start Ts',
    sortOrder: 51,
  },
  observedSpeedIndex: { label: 'Observed Speed Index', sortOrder: 52 },
  observedSpeedIndexTs: { label: 'Observed Speed Index Ts', sortOrder: 53 },
  observedTimeOrigin: { label: 'Observed Time Origin', sortOrder: 54 },
  observedTimeOriginTs: { label: 'Observed Time Origin Ts', sortOrder: 55 },
  observedTraceEnd: { label: 'Observed Trace End', sortOrder: 56 },
  observedTraceEndTs: { label: 'Observed Trace End Ts', sortOrder: 57 },
};

function RenderTitle(s: string) {
  return (
    TitleMap[s as keyof typeof TitleMap]?.label || camelCaseToSentenceCase(s)
  );
}
