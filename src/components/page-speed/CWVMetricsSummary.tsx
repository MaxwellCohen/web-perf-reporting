'use client';
import {
  AuditDetailTable,
  DebugData,
  NullablePageSpeedInsights,
  TreeMapData,
  TreeMapNode,
} from '@/lib/schema';
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
import {
  RenderBytesValue,
  RenderMSValue,
} from './lh-categories/table/RenderTableValue';
import { Fragment, JSX, useContext, useState } from 'react';
import { groupBy } from '@/lib/utils';
import { toTitleCase } from './toTitleCase';
import { InsightsContext } from './PageSpeedContext';

const CWV = [
  'firstContentfulPaint',
  'largestContentfulPaint',
  'totalBlockingTime',
  'cumulativeLayoutShift',
  'cumulativeLayoutShiftMainFrame',
  'speedIndex',
];

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

const LCPInfo = ['lcpLoadStart', 'lcpLoadEnd', 'lcpInvalidated'];

const timingInfo = [
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
  'observedTraceEnd',
  'observedLoad',
  'observedDomContentLoaded',
];

export function CWVMetricsSummary() {
  const data = useContext(InsightsContext);
  const labels = data.map((d) => d.label);
  const items = data.map(({ item }) => mergeData(item));
  const itemKeys = items.map((d) => Object.keys(d));
  const keys = [
    ...new Set(itemKeys.reduce((acc, curr) => [...acc, ...curr], [])),
  ]
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

  return (
    <Details>
      <summary className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold">Summary Metrics</h3>
      </summary>
      <div className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-2 lg:grid-cols-3">
        <RenderTable
          items={items}
          labels={labels}
          keys={CWV}
          title={'Core Web Vitals'}
          formatter={(v, k) =>
            [
              'cumulativeLayoutShift',
              'cumulativeLayoutShiftMainFrame',
            ].includes(k as string)
              ? `${+(v as number).toFixed(4)}`
              : RenderMSValue({ value: v })
          }
        />
        <RenderTable
          items={items}
          labels={labels}
          keys={taskKeys}
          title={'Number of Tasks'}
          formatter={(v) => `${v}`}
        />

        <RenderTable
          items={items}
          labels={labels}
          keys={LCPInfo}
          title={'LCP info'}
          formatter={(v) => {
            return typeof v === 'boolean'
              ? renderBoolean(v)
              : RenderMSValue({ value: v });
          }}
        />
        <RenderTable
          items={items}
          labels={labels}
          keys={timingInfo}
          title={'Timings info'}
          formatter={(v) => {
            return RenderMSValue({ value: v });
          }}
        />
        <RenderTable
          items={items}
          labels={labels}
          keys={ObservedEvents}
          title={'Observed Events'}
          formatter={(v) => {
            return RenderMSValue({ value: v });
          }}
        />
        <RenderNetworkRequestsSummary />
        <RenderJSUsageSummary />
        <RenderTable
          items={items}
          labels={labels}
          keys={resourceKeys}
          title={'Resource Info'}
          formatter={(v, key) =>
            ['mainDocumentTransferSize', 'totalByteWeight'].includes(
              key as string,
            )
              ? RenderBytesValue({ value: v })
              : `${v}`
          }
        />
      </div>
    </Details>
  );
}

function RenderNetworkRequestsSummary() {
  const items = useContext(InsightsContext);
  const labels = items.map((d) => d.label);
  const networkData = items.map(
    ({ item: d }) =>
      d?.lighthouseResult?.audits?.['network-requests']
        ?.details as AuditDetailTable,
  );
  const groupedNetworkData = networkData.map((d) => {
    if (!d) return {};
    return groupBy(d?.items || {}, (e) => `${e?.resourceType}` || '');
  });
  const displayKeys = groupedNetworkData
    .map((d) => Object.keys(d))
    .reduce((acc, curr) => [...acc, ...curr], [])
    .filter((k) => !!k);
  const keys = [...new Set(displayKeys)];
  if (!keys.length) {
    return null;
  }
  keys.push('Total');
  groupedNetworkData.map(
    (nd, i) => (nd['Total'] = networkData[i]?.items || []),
  );

  return (
    <Card className="col-span-2">
      <CardHeader className="text-center text-2xl font-bold">
        Network Request Summary
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead> Request Type</TableHead>
            {labels.length > 1 ? <TableHead> Device</TableHead> : null}
            <TableHead> Count</TableHead>
            <TableHead> Total Transfer Size</TableHead>
            <TableHead> Total Resource Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys
            .map((key, i) => {
              const data = groupedNetworkData.map((d, i) => ({
                item: d[key] || [],
                labelIndex: i,
              }));
              const filteredData = data.filter((d) => d.item.length > 0);
              if (!filteredData.length) {
                return null;
              }
              return (
                <Fragment key={`${i}-${key}`}>
                  {filteredData.map(({ item, labelIndex }, idx) => {
                    return (
                      <TableRow key={`${i}-${key}-${labelIndex}`}>
                        {idx === 0 ? (
                          <TableCell rowSpan={filteredData.length}>
                            {toTitleCase(key)}
                          </TableCell>
                        ) : null}
                        {labels.length > 1 ? (
                          <TableCell> {labels[labelIndex] || ''} </TableCell>
                        ) : null}
                        <TableCell> {item.length} </TableCell>
                        <TableCell>
                          {' '}
                          {RenderBytesValue({
                            value: sumOn(item, 'transferSize'),
                          })}{' '}
                        </TableCell>
                        <TableCell>
                          {' '}
                          {RenderBytesValue({
                            value: sumOn(item, 'resourceSize'),
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              );
            })
            .filter(Boolean)}
        </TableBody>
      </Table>
    </Card>
  );
}

export function RenderJSUsageSummary() {
  const items = useContext(InsightsContext);
  const treeData = items
    .map(({ item, label }) => ({
      treeData: item.lighthouseResult?.audits?.['script-treemap-data']
        ?.details as TreeMapData,
      label,
    }))
    .filter(({ treeData }) => treeData?.type === 'treemap-data');
  console.log('hi', treeData);
  if (treeData.length === 0) return null;

  return (
    <>
      {treeData.map(({ treeData, label }, idx) => {
        return (
          <Card className="sm:col-span-2 lg:col-span-full" key={`${idx}_label`}>
            <CardHeader className="text-center text-2xl font-bold">
              {label ? `JS Usage Summary for ${label}` : `JS Usage Summary`}
            </CardHeader>
            <Table className="border-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[18rem] max-w-[75vw] whitespace-nowrap">
                    Name
                  </TableHead>
                  <TableHead> Resource Size</TableHead>
                  <TableHead> Unused Bytes</TableHead>
                  <TableHead> % of Unused Bytes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treeData.nodes.map((node, idx) => (
                  <JSUsageTable
                    key={`${idx}-${node.name}`}
                    node={node}
                    depth={0}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        );
      })}
    </>
  );
}

function JSUsageTable({
  node,
  depth = 0,
}: {
  node: TreeMapNode;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const handleClick = () => {
    setOpen(!open);
  };
  const unusedBytes = node.unusedBytes || 0;
  const resourceBytes = node.resourceBytes || 0;
  const percent = (unusedBytes / resourceBytes) * 100;
  const isLarge = unusedBytes > 51200;
  return (
    <Fragment>
      <TableRow onClick={handleClick} suppressHydrationWarning>
        <TableCell
          className={`min-w-[12rem] max-w-[75vw] overflow-scroll whitespace-nowrap ${depth ? 'border-b border-l' : ''}`}
          style={{ width: `calc(75vw - ${0.5 * depth}rem) ` }}
        >
          <div className="flex flex-row align-middle">
            {isLarge || percent > 50 ? <WarningSquare /> : null}
            <div>
              {`${node.name}${node.duplicatedNormalizedModuleName ? ` - ${node.duplicatedNormalizedModuleName}` : ''}`}
            </div>
          </div>
        </TableCell>
        <TableCell className="w-20 border">
          {RenderBytesValue({
            value: resourceBytes || 0,
          })}
        </TableCell>
        <TableCell className="w-20 border">
          {RenderBytesValue({
            value: unusedBytes || 0,
          })}
        </TableCell>
        <TableCell className={`w-20 ${depth ? 'border' : ''}`}>
          {`${percent.toFixed(2)} %`}
        </TableCell>
      </TableRow>
      {node.children && open ? (
        <TableCell
          className="border-x border-b-2 py-0 pr-0"
          colSpan={4}
          suppressHydrationWarning
        >
          <Table className="pr-0 pt-0" suppressHydrationWarning>
            {node.children.map((child, idx) => (
              <JSUsageTable
                key={`${idx}-${child.name}`}
                node={child}
                depth={depth + 1}
              />
            ))}
          </Table>
        </TableCell>
      ) : null}
    </Fragment>
  );
}

function WarningSquare() {
  return (
    <div className={'rounded-ful mr-2 h-3 w-3 self-center bg-yellow-500'}>
      <span className="sr-only">warning this function could have extra JS</span>
    </div>
  );
}

function sumOn<T>(items: T[], key: string) {
  return items.reduce((acc, curr) => {
    return acc + (+curr[key as keyof typeof curr] || 0);
  }, 0);
}

function RenderTable({
  items,
  labels,
  keys,
  title,
  formatter,
}: {
  items: Record<string, string | number>[];
  labels: string[];
  keys: string[];
  title: string;
  formatter: (item: unknown, key?: string) => string | JSX.Element;
}) {
  const itemKeys = items.map((d) =>
    Object.keys(d).filter((k) => keys.includes(k)),
  );

  return (
    <Card className="min-w-1/3">
      <CardHeader className="text-center text-2xl font-bold">
        {title}
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            {itemKeys
              .map((itemKey, idx) =>
                itemKey?.length ? (
                  <TableHead key={`${idx}-${labels[idx]}`}>
                    {labels[idx] || ''}
                  </TableHead>
                ) : null,
              )
              .filter(Boolean)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key, i) => {
            return (
              <TableRow key={`${i}-${key}`}>
                <TableCell rowSpan={1}> {RenderTitle(key)} </TableCell>
                {items
                  .map((item, idx) => {
                    if (item?.[key] === undefined) return null;
                    return (
                      <TableCell key={`${i}-${keys}-${idx}`}>
                        {formatter(item?.[key], key)}
                      </TableCell>
                    );
                  })
                  .filter(Boolean)}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function mergeData(auditData?: NullablePageSpeedInsights) {
  if (!auditData) {
    return {};
  }
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
  cumulativeLayoutShiftMainFrame: {
    label: 'Cumulative Layout Shift (Main Frame)',
    sortOrder: 2,
  },
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
