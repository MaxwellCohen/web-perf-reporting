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
import { useId } from 'react';

import { HorizontalScoreChart } from '@/components/common/PageSpeedGaugeChart';
import { Card } from '../ui/card';
import { Timeline } from './Timeline';
import { LoadingExperience } from './LoadingExperience';

export function PageSpeedInsightsDashboard({
  data,
}: {
  data: PageSpeedInsights;
}) {
  if (!data) {
    return null;
  }
  // const url = data?.lighthouseResult.finalDisplayedUrl;
  // const screenshot = data.lighthouseResult.fullPageScreenshot?.screenshot;
  const timeline = AuditDetailFilmstripSchema.safeParse(
    data?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;

  const entities: Entities | undefined = data?.lighthouseResult?.entities;
  const auditRecords: AuditResult | undefined = data?.lighthouseResult?.audits;
  const categories = data.lighthouseResult.categories;
  const categoryGroups = data.lighthouseResult.categoryGroups;
  return (
    <Accordion
      type="multiple"
      defaultValue={[
        'page-loading-experience',
        'origin-loading-experience',
        'screenshot',
        'entities',
        'audits',
        ...Object.keys(categories || {}),
      ]}
    >
      <h2 className="text-2xl font-bold text-center">
        Report for {new Date(data.analysisUTCTimestamp).toLocaleDateString()}
      </h2>
      <LoadingExperience title="Page Loading Experience" experience={data?.loadingExperience} />
      <LoadingExperience title="Origin Loading Experience" experience={data?.originLoadingExperience} />

      <div className="grid grid-rows-[auto_1fr]">
        <MetricsComponent
          categoryGroups={categoryGroups}
          audits={auditRecords}
        />
        <Timeline timeline={timeline} />
      </div>

      {Object.entries(categories || {}).map(([key, category]) => {
        console.log(category);
        return (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="flex flex-row gap-2 text-lg font-bold flex-wrap">
              <div className="w-64 whitespace-nowrap">
                {category.score
                  ? `${category.title} - Score: ${Math.round(category.score * 100)}`
                  : `${category.title}`}
              </div>
              {category.score ? (
                <div className="flex-1 min-w-64">
                  <HorizontalScoreChart
                    score={category.score || 0}
                    className="overflow-hidden h-2 min-w-11 flex-1"
                  />
                </div>
              ) : (
                ''
              )}
            </AccordionTrigger>
            <AccordionContent>
              <ReactMarkdown>{category.description}</ReactMarkdown>
              <div className="w-full" role="table" aria-label="Audit Table">
                <div
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
                </div>

                {category.auditRefs && auditRecords ? (
                  <Accordion type="multiple">
                    {category.auditRefs.map((auditRef) => (
                      <AuditDetailsSection
                        key={auditRef.id}
                        auditRef={auditRef}
                        auditRecords={auditRecords}
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
          <EntitiesTable entities={entities} />
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


function EntitiesTable({ entities }: { entities?: Entities }) {
  const id = useId();
  if (!entities?.length) {
    return null;
  }

  return (
    <>
      <div id={`${id}-entities-title`}>
        Entities - list of Origins that the site uses
      </div>
      <Table aria-labelledby={`${id}-entities-title`}>
        <TableHeader>
          <TableRow>
            <TableHead>Name </TableHead>
            <TableHead>Is First Party </TableHead>
            <TableHead>Is Unrecognized </TableHead>
            <TableHead>Origins </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entity, i) => (
            <TableRow key={`${i}-${entity.name}`}>
              <TableCell> {entity.name} </TableCell>
              <TableCell>
                {entity.isFirstParty ? '✅ - yes' : '❌ - no'}
              </TableCell>
              <TableCell>
                {entity.isUnrecognized ? '✅ - yes' : '❌ - no'}
              </TableCell>
              <TableCell>
                {entity.origins.map((o, i) => (
                  <div key={`${i}-${o}`}>{o} </div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
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

function MetricsComponent({
  categoryGroups,
  audits,
}: {
  categoryGroups?: PageSpeedInsights['lighthouseResult']['categoryGroups'];
  categories?: PageSpeedInsights['lighthouseResult']['categories'];
  audits?: AuditResult;
}) {
  return (
    <>
      {categoryGroups?.['metrics']?.title ? (
        <h3 className="text-lg font-bold">
          {categoryGroups?.['metrics']?.title}
        </h3>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fill,_minmax(16rem,_1fr))] gap-2">
        {[
          'first-contentful-paint',
          'largest-contentful-paint',
          'total-blocking-time',
          'cumulative-layout-shift',
          'speed-index',
        ]?.map((audit) => {
          const auditData = audits?.[audit];
          if (!auditData) {
            return null;
          }
          return (
            <Card key={audit} className="px-4 py-4 w-full min-w-64">
              <Accordion type="multiple" defaultValue={[]}>
                <AccordionItem value={audit} className="border-b-0">
                  <AccordionTrigger>
                    <div className="text-md font-bold">{auditData.title}</div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ReactMarkdown>{auditData.description}</ReactMarkdown>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              {auditData.score ? <ScoreDisplay audit={auditData} /> : null}
              <HorizontalScoreChart score={auditData.score || 0} />
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

function ScoreDisplay({ audit }: { audit?: AuditResult[string] }) {
  if (!audit) {
    return null;
  }
  if (audit.score === null || audit.scoreDisplayMode === undefined) {
    return null;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.NUMERIC) {
    return (
      <>
        <div>Score: {Math.round(audit.score * 100)} / 100</div>
        <div>
          Value: {audit.numericValue?.toFixed(2) || 'N/A'}{' '}
          {audit.numericUnit && audit.numericUnit !== 'unitless'
            ? audit.numericUnit
            : ''}
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
      <AccordionTrigger>
        <div
          className="grid grid-cols-[1fr_4fr] gap-4 border-b"
          key={auditRef.id}
          role="row"
        >
          <div className="py-2" role="cell">
            {auditData.title} {auditRef.acronym ? `(${auditRef.acronym})` : ''}
          </div>
          <div className="py-2" role="cell">
            <ReactMarkdown children={auditData.description || ''} />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <ReactMarkdown>{auditData.description}</ReactMarkdown>
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
