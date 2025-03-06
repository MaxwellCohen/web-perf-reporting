/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-children-prop */
'use client';

import {
  TableHeader,
  TableRow,
  Table,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  AuditDetailFilmstripSchema,
  AuditRef,
  AuditResult,
  CategoryResult,
  Entities,
  FullPageScreenshot,
  PageSpeedInsights,
} from '@/lib/schema';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

import ReactMarkdown from 'react-markdown';

import { HorizontalScoreChart } from '@/components/common/PageSpeedGaugeChart';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { createContext, Fragment, useContext } from 'react';
import { Timeline } from './Timeline';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { ScoreDisplay } from './ScoreDisplay';

const fullPageScreenshotContext = createContext<{
  desktopFullPageScreenshot: FullPageScreenshot | null;
  mobileFullPageScreenshot: FullPageScreenshot | null;
}>({
  desktopFullPageScreenshot: null,
  mobileFullPageScreenshot: null,
});

// const screenshotContext = createContext<{
//   fullPageScreenshot: FullPageScreenshot | null;
//   ElementScreenshotRenderer: ElementScreenshotRenderer | null;
// }>({
//   fullPageScreenshot: null,
//   ElementScreenshotRenderer: null,
// });

export function PageSpeedInsightsDashboard({
  desktopData,
  mobileData,
}: {
  desktopData?: PageSpeedInsights | null;
  mobileData?: PageSpeedInsights | null;
}) {
  const DesktopTimeline = AuditDetailFilmstripSchema.safeParse(
    desktopData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;
  const MobileTimeline = AuditDetailFilmstripSchema.safeParse(
    mobileData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;

  const desktopEntities: Entities | undefined =
    desktopData?.lighthouseResult?.entities;
  const desktopAuditRecords: AuditResult | undefined =
    desktopData?.lighthouseResult?.audits;
  const desktopCategories = desktopData?.lighthouseResult?.categories;
  const desktopCategoryGroups = desktopData?.lighthouseResult?.categoryGroups;
  const mobileAuditRecords: AuditResult | undefined =
    mobileData?.lighthouseResult?.audits;
  const mobileCategoryGroups = mobileData?.lighthouseResult?.categoryGroups;
  // const mobileCategories = mobileData?.lighthouseResult?.categories;
  const desktopFullPageScreenshotData =
    desktopData?.lighthouseResult.fullPageScreenshot || null;
  const mobileFullPageScreenshotData =
    mobileData?.lighthouseResult.fullPageScreenshot || null;

  return (
    <fullPageScreenshotContext.Provider
      value={{
        desktopFullPageScreenshot: desktopFullPageScreenshotData,
        mobileFullPageScreenshot: mobileFullPageScreenshotData,
      }}
    >
      <div
        style={
          {
            '--desktopFullPageScreenshot': `url(${desktopFullPageScreenshotData?.screenshot.data})`,
            '--desktopFullPageScreenshotHeight': `${desktopFullPageScreenshotData?.screenshot.height}px`,
            '--desktopFullPageScreenshotWidth': `${desktopFullPageScreenshotData?.screenshot.width}px`,
            '--mobileFullPageScreenshot': `url(${mobileFullPageScreenshotData?.screenshot.data})`,
            '--mobileFullPageScreenshotHeight': `${mobileFullPageScreenshotData?.screenshot.height}px`,
            '--mobileFullPageScreenshotWidth': `${mobileFullPageScreenshotData?.screenshot.width}px`,
          } as React.CSSProperties
        }
      >
        <Accordion
          type="multiple"
          defaultValue={[
            'page-loading-experience',
            'origin-loading-experience',
            'screenshot',
            'entities',
            'audits',
            ...Object.keys(desktopCategories || {}),
          ]}
        >
          <h2 className="text-center text-2xl font-bold">
            Report for{' '}
            {new Date(
              desktopData?.analysisUTCTimestamp ||
                mobileData?.analysisUTCTimestamp ||
                0,
            ).toLocaleDateString()}
          </h2>
          <LoadingExperience
            title="Page Loading Experience"
            experienceDesktop={desktopData?.loadingExperience}
            experienceMobile={mobileData?.loadingExperience}
          />
          <div className="schreenhidden print:break-before-page"></div>
          <LoadingExperience
            title="Origin Loading Experience"
            experienceDesktop={desktopData?.originLoadingExperience}
            experienceMobile={mobileData?.originLoadingExperience}
          />

          <div className="grid grid-rows-[auto_1fr] print:break-before-page">
            <CWVMetricsComponent
              desktopCategoryGroups={desktopCategoryGroups}
              desktopAudits={desktopAuditRecords}
              mobileCategoryGroups={mobileCategoryGroups}
              mobileAudits={mobileAuditRecords}
            />
            <div className="flex flex-row flex-wrap gap-2">
              <Timeline timeline={MobileTimeline} device="Mobile" />
              <Timeline timeline={DesktopTimeline} device="Desktop" />
            </div>
          </div>

          {Object.entries(desktopCategories || {}).map(([key, category]) => {
            return categoryAuditSection({
              category,
              key,
              desktopAuditRecords,
            });
          })}
          <AccordionItem value="entities">
            <AccordionTrigger>
              <div className="text-lg font-bold">Entities</div>
            </AccordionTrigger>
            <AccordionContent>
              <EntitiesTable entities={desktopEntities} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </fullPageScreenshotContext.Provider>
  );
}

function categoryAuditSection({
  category,
  key,
  desktopAuditRecords,
}: {
  category: CategoryResult;
  key: string;
  desktopAuditRecords?: AuditResult;
}) {
  if (!category) {
    return null;
  }
  return (
    <AccordionItem key={key} value={key}>
      <AccordionTrigger className="flex flex-row justify-start gap-2 text-lg font-bold">
        <div className="flex flex-1 flex-row flex-wrap items-center">
          <div className="flex w-[300px] whitespace-nowrap">
            {category.score
              ? `${category.title} - Score: ${Math.round(category.score * 100)}`
              : `${category.title}`}
          </div>
          {category.score ? (
            <div className="flex-0 w-64 align-top">
              <HorizontalScoreChart
                score={category.score || 0}
                className="h-2 min-w-11 flex-1 overflow-hidden"
              />
            </div>
          ) : (
            ''
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {/* {category.description ? <ReactMarkdown>{category.description}</ReactMarkdown> : null}
          {category.manualDescription ? <ReactMarkdown>{category.manualDescription}</ReactMarkdown> : null} */}
        <div className="w-full" role="table" aria-label="Audit Table">
          {category.auditRefs && desktopAuditRecords ? (
            <Accordion type="multiple">
              {category.auditRefs.map((auditRef) => (
                <AuditDetailsSection
                  key={auditRef.id}
                  auditRef={auditRef}
                  auditRecords={desktopAuditRecords}
                  device="Desktop"
                />
              ))}
            </Accordion>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function AuditDetailsSection({
  auditRef,
  auditRecords,
  device,
}: {
  auditRef: AuditRef;
  auditRecords: AuditResult;
  device: 'Desktop' | 'Mobile';
}) {
  if (!auditRef.id) {
    console.log('no id for', auditRef);
    return null;
  }
  if (auditRef.group === 'metrics') {
    return null;
  }
  const auditData = auditRecords?.[auditRef.id];
  if (!auditData) {
    console.log('no audit result for', auditRef);
    return null;
  }

  if (auditData?.details?.type === 'filmstrip') {
    return null;
  }

  return (
    <AccordionItem key={auditRef.id} value={auditRef.id}>
      <AccordionTrigger className="flex flex-row gap-4 border-b">
        <div className="flex flex-1 flex-row gap-4">
          <div className="flex-[0_0_300px]">
            {auditData.title} {auditRef.acronym ? `(${auditRef.acronym})` : ''}
          </div>
          <div className="flex-1 align-top">
            <ReactMarkdown children={auditData.description || ''} />
          </div>
          <div className="flex-1 align-top">{auditData.scoreDisplayMode}</div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {auditData.score ? <ScoreDisplay audit={auditData} /> : null}
        {auditData.metricSavings ? (
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Possible Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(auditData.metricSavings).map(
                  ([metric, savings]) => (
                    <TableRow key={metric}>
                      <TableCell>{metric}</TableCell>
                      <TableCell>{savings}</TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <div className="">
          <RenderDetails auditData={auditData} device={device} />
        </div>
        <details>
          <summary>Details</summary>
          <pre>{JSON.stringify(auditData, null, 2)}</pre>
        </details>

        {/* <pre>{JSON.stringify(auditData, null, 2)}</pre> */}

        {/* <DetailTable
              headings={auditData.details?.headings}
              items={auditData.details?.items}
              entities={auditData.details?.entities}
            /> */}
      </AccordionContent>
    </AccordionItem>
  );
}

function RenderDetails({
  auditData,
  device,
}: {
  auditData?: AuditResult[string];
  device: 'Desktop' | 'Mobile';
}) {
  if (!auditData?.details) {
    return null;
  }

  const details = auditData.details;
  console.log('list', details);
  switch (details.type) {
    case 'filmstrip':
      return <Timeline timeline={details} device={device} />;
    case 'list':
      console.log('list', details);
      return <RenderList auditData={auditData} device={device} />;
    case 'checklist':
      return <RenderChecklist auditData={auditData} device={device} />;
    case 'table':
    case 'opportunity':
      console.log('table', details);
      return (
        <DetailTable
          device={device}
          headings={details.headings}
          items={details.items}
          isEntityGrouped={details.isEntityGrouped}
          skipSumming={details.skipSumming}
          sortedBy={details.sortedBy}
          entities={details.entities}
        />
      );
    case 'criticalrequestchain':
      // return CriticalRequestChainRenderer.render(this._dom, details, this);
      return (
        <div>
          Critical Request Chain
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </div>
      );
    // Internal-only details, not for rendering.
    // case 'screenshot':
    // case 'debugdata':
    // case 'treemap-data':
    //   return null;

    default:
      return <RenderUnknown details={details} />;
  }
}

function RenderList({
  auditData,
  device,
}: {
  auditData: AuditResult[string];
  device: 'Desktop' | 'Mobile';
}) {
  const details = auditData.details;
  if (details.type !== 'list') {
    return null;
  }
  return (
    <div>
      {details.items.map((item: any, index: number) => {
        console.log('item', item);
        switch (item.type) {
          case 'filmstrip':
            return <Timeline key={index} timeline={item} device={device} />;
          case 'list':
            console.log('list', details);
            return <RenderList key={index} auditData={item} device={device} />;
          case 'checklist':
            return (
              <RenderChecklist key={index} auditData={item} device={device} />
            );
          case 'table':
          case 'opportunity':
            console.log('table', details);
            return (
              <DetailTable
                key={index}
                device={device}
                headings={item.headings}
                items={item.items}
                isEntityGrouped={item.isEntityGrouped}
                skipSumming={item.skipSumming}
                sortedBy={item.sortedBy}
                entities={item.entities}
              />
            );
          case 'criticalrequestchain':
            // return CriticalRequestChainRenderer.render(this._dom, details, this);
            return (
              <div key={index}>
                Critical Request Chain
                <pre>{JSON.stringify(details, null, 2)}</pre>
              </div>
            );
          // Internal-only details, not for rendering.
          // case 'screenshot':
          // case 'debugdata':
          // case 'treemap-data':
          //   return null;

          default:
            return <RenderUnknown key={index} details={details} />;
        }
      })}
    </div>
  );
}

function RenderChecklist({
  auditData,
  device,
}: {
  auditData: AuditResult[string];
  device: 'Desktop' | 'Mobile';
}) {
  const details = auditData.details;
  if (details.type !== 'checklist') {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <div>
        {' '}
        Checklist for {auditData.title} on {device}
      </div>
      {Object.entries(
        details.items as Record<string, { label: string; value: boolean }>,
      ).map(([key, item]) => {
        if (typeof item !== 'object') {
          return null;
        }
        if (typeof item?.label !== 'string') {
          return null;
        }

        return (
          <div key={key}>
            <div>
              {item.value ? (
                <span title="true">✅</span>
              ) : (
                <span title="false">❌</span>
              )}{' '}
              - {item?.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RenderUnknown({
  details,
}: {
  details: AuditResult[string]['details'];
}) {
  return (
    <div className="overflow-x-auto">
      We don&apos;t know how to render audit details of type{' '}
      {details?.type || ' unknown '}
      The Lighthouse version that collected this data is likely newer than the
      Lighthouse version of the report renderer. Expand for the raw JSON.
      <pre>{JSON.stringify(details, null, 2)}</pre>
    </div>
  );
}

// export function AuditDetails({ details }: { details: AuditResult[string] }) {
//   const opportunity = AuditDetailOpportunitySchema.safeParse(details.details);
//   if (opportunity.success) {
//     const data = opportunity.data;
//     if (data?.items?.length && data?.headings?.length) {
//       return (
//         <>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 {data.headings.map((heading, i) => {
//                   if (heading.key === 'node') {
//                     return null;
//                   }
//                   return (
//                     <TableHead key={`${i}-${heading.label}`}>
//                       {heading.label}
//                     </TableHead>
//                   );
//                 })}
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {data.items.map((item, i) => (
//                 <TableRow key={`${i}-${item.label}`}>
//                   {data?.headings?.map((heading, j) => {
//                     if (heading?.key === 'node') {
//                       return null;
//                     }

//                     return heading?.key && heading.key in item ? (
//                       <TableCell key={`${i}-${j}`}>
//                         {JSON.stringify(item[heading.key])}
//                       </TableCell>
//                     ) : null;
//                   })}
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//           <div>
//             <pre>{JSON.stringify(data, null, 2)}</pre>
//           </div>
//         </>
//       );
//     }
//   }
//   if (details.scoreDisplayMode === ScoreDisplayModes.MANUAL) {
//     return null;
//   }
//   if (details.scoreDisplayMode === ScoreDisplayModes.NOT_APPLICABLE) {
//     return <div>Not applicable</div>;
//   }
//   if (details.scoreDisplayMode === ScoreDisplayModes.ERROR) {
//     return null;
//   }
//   if (
//     details.scoreDisplayMode === ScoreDisplayModes.NUMERIC &&
//     !details.details?.items?.length
//   ) {
//     return null;
//   }
//   return (
//     <div>
//       <pre>{JSON.stringify(details, null, 2)}</pre>
//     </div>
//   );
// }

type ValueType =
  | 'bytes'
  | 'code'
  | 'ms'
  | 'numeric'
  | 'text'
  | 'thumbnail'
  | 'timespanMs'
  | 'url';

interface TableColumnHeading {
  key?: string;
  valueType?: ValueType;
  label: string;
  granularity?: number;
  displayUnit?: string;
}

interface TableItem {
  entity?: string;
  subItems?: {
    items: TableItem[];
  };
  [key: string]: any;
}

interface EntityInfo {
  name: string;
  category?: string;
  isFirstParty?: boolean;
  homepage?: string;
}

interface TableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  isEntityGrouped?: boolean;
  skipSumming?: string[];
  sortedBy?: string;
  entities?: EntityInfo[];
  device: 'Desktop' | 'Mobile';
}

const SUMMABLE_VALUETYPES: ValueType[] = [
  'bytes',
  'numeric',
  'ms',
  'timespanMs',
];

const getEntityGroupItems = ({
  items,
  headings,
  isEntityGrouped,
  skipSumming,
  sortedBy,
}: {
  items: TableItem[];
  headings: TableColumnHeading[];
  isEntityGrouped: boolean;
  skipSumming: string[];
  sortedBy?: string;
}) => {
  // Exclude entity-grouped audits and results without entity classification
  if (!items.length || isEntityGrouped || !items.some((item) => item.entity)) {
    return [];
  }

  const skippedColumns = new Set(skipSumming);
  const summableColumns: string[] = [];

  for (const heading of headings) {
    if (!heading.key || skippedColumns.has(heading.key)) continue;
    if (SUMMABLE_VALUETYPES.includes(heading.valueType as ValueType)) {
      summableColumns.push(heading.key);
    }
  }

  const firstColumnKey = headings[0].key;
  if (!firstColumnKey) return [];

  const byEntity = new Map<string | undefined, TableItem>();

  for (const item of items) {
    const entityName =
      typeof item.entity === 'string' ? item.entity : undefined;
    const groupedItem = byEntity.get(entityName) || {
      [firstColumnKey]: entityName || 'Unattributable',
      entity: entityName,
    };

    for (const key of summableColumns) {
      groupedItem[key] = Number(groupedItem[key] || 0) + Number(item[key] || 0);
    }
    byEntity.set(entityName, groupedItem);
  }

  const result = Array.from(byEntity.values());
  if (sortedBy) {
    result.sort((a, b) => (a[sortedBy] > b[sortedBy] ? -1 : 1));
  }
  return result;
};

function DetailTable({
  headings,
  items,
  isEntityGrouped = false,
  skipSumming = [],
  sortedBy,
  device,
}: TableProps) {
  console.log('headings', headings);
  if (!items?.length) return null;
  if (!headings?.length) return null;

  const entityItems = getEntityGroupItems({
    items,
    headings,
    isEntityGrouped,
    skipSumming,
    sortedBy,
  });

  return (
    <div
      className="grid overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${headings.length}, 1fr)` }}
    >
      <div
        className="grid grid-cols-subgrid border-b-2"
        style={{
          gridColumn: `span ${headings.length} / span ${headings.length}`,
        }}
      >
        {headings.map((heading, index) => (
          <div
            key={index}
            // style={{ gridColumn: `${index + 1} / ${index + 2}` }}
            className="grid-col-span-1 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
          >
            {heading.label}
          </div>
        ))}

        {entityItems.length > 0
          ? // Render entity-grouped rows
            entityItems.map((entityItem, index) => (
              <Fragment key={index}>
                <div
                  className="grid grid-cols-subgrid border-b-2"
                  style={{
                    gridColumn: `span ${headings.length} / span ${headings.length}`,
                  }}
                >
                  {headings.map((heading, colIndex) => (
                    <div
                      key={colIndex}
                      className="whitespace-nowrap px-6 py-4 text-sm"
                      style={{
                        gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                      }}
                    >
                      {heading.key && (
                        <>
                          {typeof entityItem[heading.key] === 'object'
                            ? JSON.stringify(entityItem[heading.key])
                            : entityItem[heading.key]}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {items
                  .filter((item) => item.entity === entityItem.entity)
                  .map((item, subIndex) => (
                    <div
                      key={`${index}-${subIndex}`}
                      className="grid grid-cols-subgrid border-b-2"
                      style={{
                        gridColumn: `span ${headings.length} / span ${headings.length}`,
                      }}
                    >
                      {headings.map((heading, colIndex) => (
                        <div
                          key={colIndex}
                          className="whitespace-nowrap px-6 py-4 text-sm"                    
                        >
                          {heading.key ? (
                            <RenderTableValue
                              value={item[heading.key]}
                              heading={heading}
                              device={device}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ))}
              </Fragment>
            ))
          : items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-subgrid border-b-2"
                style={{
                  gridColumn: `span ${headings.length} / span ${headings.length}`,
                }}
              >
                {headings.map((heading, colIndex) => (
                  <div
                    key={colIndex}
                    className="whitespace-nowrap px-6 py-4 text-sm"
                  >
                    {heading.key ? (
                      <RenderTableValue
                        value={item[heading.key]}
                        heading={heading}
                        device={device}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ))}
      </div>
    </div>
  );
}

const URL_PREFIXES = ['http://', 'https://', 'data:'];

/**
 * Render a details item value for embedding in a table. Renders the value
 * based on the heading's valueType, unless the value itself has a `type`
 * property to override it.
 * @param {TableItemValue} value
 * @param {LH.Audit.Details.TableColumnHeading} heading
 * @return {Element|null}
 */
function RenderTableValue({
  value,
  heading,
  device,
}: {
  value: any;
  heading: TableColumnHeading;
  device: 'Desktop' | 'Mobile';
}) {
  if (value === undefined || value === null) {
    return null;
  }

  // First deal with the possible object forms of value.
  if (typeof value === 'object') {
    // The value's type overrides the heading's for this column.
    switch (value.type) {
      case 'code': {
        return (
          <pre title="code" className="text-xs">
            {value.value}
          </pre>
        );
      }
      case 'link': {
        return (
          <a href={value.value} title="link">
            {value.value}
          </a>
        );
      }
      case 'node': {
        return <NodeComponent item={value} device={device} />;
      }
      case 'numeric': {
        return <div title="numeric">{value.value}</div>;
      }
      case 'source-location': {
        return (
          <div title="source-location" className="font-mono text-xs">
            {JSON.stringify(value, null, 2)}
          </div>
        );
      }
      case 'url': {
        return (
          <a href={value.value} title="url">
            {value.value}
          </a>
        );
      }
      case 'text': {
        return <div title="text">{value.value}</div>;
      }
      default: {
        return <pre title="default">{JSON.stringify(value, null, 2)}</pre>;
      }
    }
  }

  // Next, deal with primitives.
  switch (heading.valueType) {
    case 'bytes': {
      const numValue = Number(value);
      return <div title="bytes">{numValue}</div>;
    }
    case 'code': {
      const strValue = String(value);
      return (
        <code title="code" className="font-mono text-xs">
          {strValue}
        </code>
      );
    }
    case 'ms': {
      return <div title="ms"> {value.toFixed(2)} ms</div>;
    }
    case 'numeric': {
      const numValue = Number(value);
      return <div title="numeric">{numValue}</div>;
    }
    case 'text': {
      const strValue = String(value);
      return <div title="text">{strValue}</div>;
    }
    case 'thumbnail': {
      const strValue = String(value);
      return <div title="thumbnail">{strValue}</div>;
    }
    case 'timespanMs': {
      const numValue = Number(value);
      return <div title="timespanMs">{numValue}</div>;
    }
    case 'url': {
      const strValue = String(value);
      if (URL_PREFIXES.some((prefix) => strValue.startsWith(prefix))) {
        return (
          <a href={strValue} className="break-all">
            {strValue}
          </a>
        );
      } else {
        // Fall back to <pre> rendering if not actually a URL.
        return <div title="url">{strValue}</div>;
      }
    }
    default: {
      return <pre title="default">{JSON.stringify(value, null, 2)}</pre>;
    }
  }
}

/**
 * React component that renders a node element similar to the renderNode function
 * in the Lighthouse details-renderer.js
 */
function NodeComponent({
  item,
  device,
}: {
  item: any;
  device: 'Desktop' | 'Mobile';
}) {
  const screenshotData = useContext(fullPageScreenshotContext);
  const fullPageScreenshot =
    device === 'Desktop'
      ? screenshotData?.desktopFullPageScreenshot
      : screenshotData?.mobileFullPageScreenshot;
  // React.useEffect(() => {
  //   // Handle screenshot rendering if available
  //   if (fullPageScreenshot && nodeRef.current) {
  //     const rect = item.lhId && fullPageScreenshot.nodes[item.lhId];
  //     if (rect && rect.width !== 0 && rect.height !== 0) {
  //       const maxThumbnailSize = { width: 147, height: 100 };
  //       const elementScreenshot = ElementScreenshotRenderer.render(
  //         document, // This would need to be replaced with appropriate DOM utility
  //         fullPageScreenshot.screenshot,
  //         rect,
  //         maxThumbnailSize
  //       );

  //       if (elementScreenshot) {
  //         // In React, we'd insert this differently
  //         nodeRef.current.prepend(elementScreenshot);
  //       }
  //     }
  //   }
  // }, [item, fullPageScreenshot, ElementScreenshotRenderer]);
  const imageSize = 300;
  const scale = imageSize / item?.boundingRect?.width;
  return (
    <div className="flex flex-col gap-2">
      {fullPageScreenshot &&
      item?.boundingRect &&
      fullPageScreenshot?.nodes[item.lhId] ? (
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: item?.boundingRect?.width / item?.boundingRect?.height,
            width: `${imageSize}px`,
          }}
        >
          <div className="absolute" style={{ scale: scale }}>
            <div
              className="absolute"
              style={{
                width: `var(--${device.toLowerCase()}FullPageScreenshotWidth)`,
                height: `var(--${device.toLowerCase()}FullPageScreenshotHeight)`,
                backgroundImage: `var(--${device.toLowerCase()}FullPageScreenshot)`,
                backgroundSize: 'cover',
                left: `-${fullPageScreenshot?.nodes[item.lhId]?.left}px`,
                top: `-${fullPageScreenshot?.nodes[item.lhId]?.top}px`,
                // transform: ``,
                backgroundRepeat: 'no-repeat',
              }}
            ></div>
          </div>
        </div>
      ) : null}
      {item.nodeLabel ? <div>{item.nodeLabel}</div> : null}

      {item.snippet && (
        <div className="whitespace-pre-wrap font-mono text-sm leading-5 text-blue-500">
          {item.snippet}
        </div>
      )}

      <details>
        <summary>Details</summary>
        <pre>{JSON.stringify(item, null, 2)}</pre>
      </details>
    </div>
  );
}
