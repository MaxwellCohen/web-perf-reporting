/* eslint-disable react/no-children-prop */
/* eslint-disable @next/next/no-img-element */
'use client';
import GaugeChart from '@/components/common/PageSpeedGaugeChart';

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
  AuditDetailOpportunitySchema,
  AuditRef,
  AuditResult,
  Entities,
  PageSpeedApiLoadingExperience,
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
import { Card, CardTitle } from '../ui/card';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { Fragment } from 'react';
import { Timeline } from './Timeline';

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

  return (
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
        <MetricsComponent
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
        console.log(category);
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
              <ReactMarkdown>{category.description}</ReactMarkdown>
              <div className="w-full" role="table" aria-label="Audit Table">
                {/* <div
                  className="grid grid-cols-[1fr_4fr] gap-4"
                  role="row"
                  aria-label="Audit table header"
                >
                  <div className="border-b pb-2 font-bold" role="columnheader">
                    Audit Name
                  </div>
                  <div className="border-b pb-2 font-bold" role="columnheader">
                    Description
                  </div>
                </div> */}

                {category.auditRefs && desktopAuditRecords ? (
                  <Accordion type="multiple">
                    {category.auditRefs.map((auditRef) => (
                      <AuditDetailsSection
                        key={auditRef.id}
                        auditRef={auditRef}
                        auditRecords={desktopAuditRecords}
                      />
                    ))}
                  </Accordion>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}

      <AccordionItem value="entities">
        <AccordionTrigger>
          <div className="text-lg font-bold">Entities</div>
        </AccordionTrigger>
        <AccordionContent>
          <EntitiesTable entities={desktopEntities} />
        </AccordionContent>
      </AccordionItem>
      {/* <AccordionItem value="audits">
        <AccordionTrigger>
          <div className="text-lg font-bold">Audits</div>
        </AccordionTrigger>
        <AccordionContent>
          <AuditTable audits={auditRecords} />
        </AccordionContent>
      </AccordionItem> */}
    </Accordion>
  );
}

export function LoadingExperienceGauges({
  experience,
}: {
  experience?: PageSpeedApiLoadingExperience;
}) {
  if (!experience) {
    return null;
  }
  const metrics: {
    metric: string;
    key: keyof PageSpeedApiLoadingExperience['metrics'];
  }[] = [
    {
      metric: 'Cumulative Layout Shift',
      key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE',
    },
    {
      metric: 'Time to First Byte',
      key: 'EXPERIMENTAL_TIME_TO_FIRST_BYTE',
    },
    {
      metric: 'First Contentful Paint',
      key: 'FIRST_CONTENTFUL_PAINT_MS',
    },
    {
      metric: 'Interaction to Next Paint',
      key: 'INTERACTION_TO_NEXT_PAINT',
    },
    {
      metric: 'Largest Contentful Paint',
      key: 'LARGEST_CONTENTFUL_PAINT_MS',
    },
  ];
  return (
    <div className="grid-auto-rows-[1fr] mt-2 grid grid-cols-[repeat(auto-fill,_minmax(180px,_1fr))] gap-2">
      {metrics.map(({ metric, key }) => (
        <GaugeChart key={key} metric={metric} data={experience.metrics[key]} />
      ))}
    </div>
  );
}

export function ScreenshotComponent({
  screenshot,
}: {
  screenshot?: {
    data: string;
    width: number;
    height: number;
  };
}) {
  if (!screenshot) {
    return null;
  }
  return (
    <div className="border">
      <img
        alt={'fullscreen image'}
        width={80}
        src={screenshot.data}
        className={`w-20 aspect-[${screenshot.width}/${screenshot.height}]`}
      />
    </div>
  );
}

function MetricsComponent({
  desktopCategoryGroups,
  desktopAudits,
  mobileCategoryGroups,
  mobileAudits,
}: {
  desktopCategoryGroups?: PageSpeedInsights['lighthouseResult']['categoryGroups'];
  desktopAudits?: AuditResult;
  mobileCategoryGroups?: PageSpeedInsights['lighthouseResult']['categoryGroups'];
  mobileAudits?: AuditResult;
}) {
  return (
    <>
      {desktopCategoryGroups?.['metrics']?.title ||
      mobileCategoryGroups?.['metrics']?.title ? (
        <h3 className="text-lg font-bold">
          {desktopCategoryGroups?.['metrics']?.title ||
            mobileCategoryGroups?.['metrics']?.title}
        </h3>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fill,_minmax(14rem,_1fr))] gap-2">
        {[
          'first-contentful-paint',
          'largest-contentful-paint',
          'total-blocking-time',
          'cumulative-layout-shift',
          'speed-index',
        ]?.map((auditName) => {
          const desktopAuditData = desktopAudits?.[auditName];
          const mobileAuditData = mobileAudits?.[auditName];
          if (!desktopAuditData && !mobileAuditData) {
            return null;
          }
          return (
            <Card
              key={auditName}
              className="flex w-full min-w-64 flex-col gap-2 px-4 py-4"
            >
              <div className="flex w-full flex-col gap-2">
                <CardTitle className="text-md font-bold">
                  {desktopAuditData?.title || mobileAuditData?.title}
                </CardTitle>

                <div className="contents text-sm">
                  {mobileAuditData?.score != undefined ? (
                    <>
                      <ScoreDisplay audit={mobileAuditData} device="Mobile" />{' '}
                      <HorizontalScoreChart
                        score={mobileAuditData?.score || 0}
                      />
                    </>
                  ) : null}
                  {desktopAuditData?.score != undefined ? (
                    <>
                      <ScoreDisplay audit={desktopAuditData} device="Desktop" />{' '}
                      <HorizontalScoreChart
                        score={desktopAuditData?.score || 0}
                      />
                    </>
                  ) : null}
                </div>
                <div className="mt-2 text-xs">
                  <ReactMarkdown>
                    {desktopAuditData?.description ||
                      mobileAuditData?.description}
                  </ReactMarkdown>
                </div>
              </div>
            </Card>
          );
        }) || null}
      </div>
    </>
  );
}

const ScoreDisplayModes = {
  /** Scores of 0-1 (map to displayed scores of 0-100). */
  NUMERIC: 'numeric',
  /** Pass/fail audit (0 and 1 are only possible scores). */
  BINARY: 'binary',
  /**
   * Audit result score is determined by the metric savings and product score:
   * 1   - audit passed based on product score
   * 0.5 - audit failed and had no metric savings
   * 0   - audit failed and had metric savings
   */
  METRIC_SAVINGS: 'metricSavings',
  /** The audit exists only to tell you to review something yourself. Score is null and should be ignored. */
  MANUAL: 'manual',
  /** The audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored. */
  INFORMATIVE: 'informative',
  /** The audit turned out to not apply to the page. Score is null and should be ignored. */
  NOT_APPLICABLE: 'notApplicable',
  /** There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored. */
  ERROR: 'error',
} as const;

function ScoreDisplay({
  audit,
  device,
}: {
  audit?: AuditResult[string];
  device?: string;
}) {
  if (!audit) {
    return null;
  }
  if (audit.score === null || audit.scoreDisplayMode === undefined) {
    return null;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.NUMERIC) {
    return (
      <>
        <div>
          {device ? `${device} - ` : ''}{' '}
          {audit.displayValue ? `${audit.displayValue} - ` : ''}
          Score: {Math.round(audit.score * 100)} / 100
        </div>
      </>
    );
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.BINARY) {
    return <div>Score: {audit.score ? '✅ - Passed' : '❌ - Failed'}</div>;
  }
  if (
    audit.scoreDisplayMode === ScoreDisplayModes.METRIC_SAVINGS &&
    Object.keys(audit.metricSavings || {}).length > 0
  ) {
    return (
      <div>
        Metric Savings:{' '}
        {Object.entries(audit.metricSavings || {}).map(([metric, savings]) => (
          <div key={metric}>
            {metric}: {savings?.toFixed(0) || 'N/A'}
          </div>
        ))}
      </div>
    );
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.MANUAL) {
    return null;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.INFORMATIVE) {
    return (
      <div>
        <div>Score: {audit.score}</div>
        {audit.displayValue ? <div>Value: {audit.displayValue}</div> : null}
        {Object.entries(audit.metricSavings || {}).map(([metric, savings]) => (
          <div key={metric}>
            {metric}: {savings?.toFixed(0) || 'N/A'}
          </div>
        ))}
      </div>
    );
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.NOT_APPLICABLE) {
    return <div>Score: {audit.score}</div>;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.ERROR) {
    return <div>Error: {audit.errorMessage}</div>;
  }

  return <div>Score: {Math.round(audit.score * 100)} / 100</div>;
}

function AuditDetailsSection({
  auditRef,
  auditRecords,
}: {
  auditRef: AuditRef;
  auditRecords: AuditResult;
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
                  <TableHead>Savings</TableHead>
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
        <div className="grid grid-cols-[auto_1fr] gap-4">
          <div className="py-2">
            {/* <AuditDetails details={auditData} /> */}
            <DetailTable
              headings={auditData.details?.headings}
              items={auditData.details?.items}
              entities={auditData.details?.entities}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function AuditDetails({ details }: { details: AuditResult[string] }) {
  const opportunity = AuditDetailOpportunitySchema.safeParse(details.details);
  if (opportunity.success) {
    const data = opportunity.data;
    if (data?.items?.length && data?.headings?.length) {
      return (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {data.headings.map((heading, i) => {
                  if (heading.key === 'node') {
                    return null;
                  }
                  return (
                    <TableHead key={`${i}-${heading.label}`}>
                      {heading.label}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item, i) => (
                <TableRow key={`${i}-${item.label}`}>
                  {data?.headings?.map((heading, j) => {
                    if (heading?.key === 'node') {
                      return null;
                    }

                    return heading?.key && heading.key in item ? (
                      <TableCell key={`${i}-${j}`}>
                        {JSON.stringify(item[heading.key])}
                      </TableCell>
                    ) : null;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </>
      );
    }
  }
  if (details.scoreDisplayMode === ScoreDisplayModes.MANUAL) {
    return null;
  }
  if (details.scoreDisplayMode === ScoreDisplayModes.NOT_APPLICABLE) {
    return <div>Not applicable</div>;
  }
  if (details.scoreDisplayMode === ScoreDisplayModes.ERROR) {
    return null;
  }
  if (
    details.scoreDisplayMode === ScoreDisplayModes.NUMERIC &&
    !details.details?.items?.length
  ) {
    return null;
  }
  return (
    <div>
      <pre>{JSON.stringify(details, null, 2)}</pre>
    </div>
  );
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

const renderEntityAdornments = (entityName: string, entities: EntityInfo[]) => {
  const matchedEntity = entities.find((e) => e.name === entityName);
  if (!matchedEntity) return null;

  return (
    <div className="ml-2 inline-flex gap-2">
      {matchedEntity.category && (
        <span className="rounded bg-gray-100 px-2 py-1 text-xs">
          {matchedEntity.category}
        </span>
      )}
      {matchedEntity.isFirstParty && (
        <span className="rounded bg-blue-100 px-2 py-1 text-xs">1P</span>
      )}
      {matchedEntity.homepage && (
        <a
          href={matchedEntity.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800"
          title="Open in new tab"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
};

function DetailTable({
  headings,
  items,
  isEntityGrouped = false,
  skipSumming = [],
  sortedBy,
  entities = [],
}: TableProps) {
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
    <div className="overflow-x-auto">
      <Table className="">
        <TableHeader className="">
          <TableRow>
            {headings.map((heading, index) => (
              <TableHead
                key={index}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {heading.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entityItems.length > 0
            ? // Render entity-grouped rows
              entityItems.map((entityItem, index) => (
                <Fragment key={index}>
                  <TableRow className="">
                    {headings.map((heading, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className="whitespace-nowrap px-6 py-4 text-sm"
                      >
                        {heading.key && (
                          <>
                            {entityItem[heading.key]}
                            {colIndex === 0 &&
                              entityItem.entity &&
                              renderEntityAdornments(
                                entityItem.entity,
                                entities,
                              )}
                          </>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {items
                    .filter((item) => item.entity === entityItem.entity)
                    .map((item, subIndex) => (
                      <TableRow key={`${index}-${subIndex}`} className="">
                        {headings.map((heading, colIndex) => (
                          <TableCell
                            key={colIndex}
                            className="whitespace-nowrap px-6 py-4 text-sm"
                          >
                            {heading.key && item[heading.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </Fragment>
              ))
            : // Render regular rows
              items.map((item, index) => (
                <TableRow key={index}>
                  {headings.map((heading, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className="whitespace-nowrap px-6 py-4 text-sm"
                    >
                      {heading.key && (
                        <>
                          {item[heading.key]}
                          {colIndex === 0 &&
                            item.entity &&
                            renderEntityAdornments(item.entity, entities)}
                        </>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
