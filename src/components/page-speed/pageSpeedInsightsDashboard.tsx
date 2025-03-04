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
import { Card } from '../ui/card';
import { Timeline } from './Timeline';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';

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
        {new Date(desktopData?.analysisUTCTimestamp || mobileData?.analysisUTCTimestamp || 0).toLocaleDateString()}
      </h2>
      <LoadingExperience
        title="Page Loading Experience"
        experienceDesktop={desktopData?.loadingExperience}
        experienceMobile={mobileData?.loadingExperience}
      />
      <LoadingExperience
        title="Origin Loading Experience"
        experienceDesktop={desktopData?.originLoadingExperience}
        experienceMobile={mobileData?.originLoadingExperience}
      />

      <div className="grid grid-rows-[auto_1fr]">
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
            <AccordionTrigger className="flex flex-row flex-wrap gap-2 text-lg font-bold">
              <div className="w-[300px] whitespace-nowrap">
                {category.score
                  ? `${category.title} - Score: ${Math.round(category.score * 100)}`
                  : `${category.title}`}
              </div>
              {category.score ? (
                <div className="min-w-64 flex-1">
                  <HorizontalScoreChart
                    score={category.score || 0}
                    className="h-2 min-w-11 flex-1 overflow-hidden"
                  />
                </div>
              ) : (
                ''
              )}
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
      <div className="grid grid-cols-[repeat(auto-fill,_minmax(16rem,_1fr))] gap-2">
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
            <Card key={auditName} className="w-full min-w-64 px-4 py-4">
              <Accordion type="multiple" defaultValue={[]}>
                <AccordionItem value={auditName} className="border-b-0">
                  <AccordionTrigger>
                    <div className="flex w-full flex-col gap-2">
                      <div className="text-md font-bold">
                        {desktopAuditData?.title || mobileAuditData?.title}
                      </div>

                      {mobileAuditData?.score != undefined ? (
                        <>
                          <ScoreDisplay
                            audit={mobileAuditData}
                            device="Mobile"
                          />{' '}
                          <HorizontalScoreChart
                            score={mobileAuditData?.score || 0}
                          />
                        </>
                      ) : null}
                      {desktopAuditData?.score != undefined ? (
                        <>
                          <ScoreDisplay
                            audit={desktopAuditData}
                            device="Desktop"
                          />{' '}
                          <HorizontalScoreChart
                            score={desktopAuditData?.score || 0}
                          />
                        </>
                      ) : null}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ReactMarkdown>
                      {desktopAuditData?.description ||
                        mobileAuditData?.description}
                    </ReactMarkdown>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
            <AuditDetails details={auditData} />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function AuditDetails({ details }: { details: AuditResult[string] }) {
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
