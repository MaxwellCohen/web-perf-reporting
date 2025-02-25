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
  AuditDetailFilmstrip,
  AuditDetailFilmstripSchema,
  AuditDetailOpportunitySchema,
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

export function PageSpeedInsightsDashboard({
  data,
}: {
  data: PageSpeedInsights;
}) {
  if (!data) {
    return null;
  }
  // const url = data?.lighthouseResult.finalDisplayedUrl;
  const screenshot = data.lighthouseResult.fullPageScreenshot?.screenshot;
  const timeline = AuditDetailFilmstripSchema.safeParse(
    data?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;

  const entities: Entities | undefined = data?.lighthouseResult?.entities;
  const audits: AuditResult | undefined = data?.lighthouseResult?.audits;
  const categories = data.lighthouseResult.categories;

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
      <h2 className="text-2xl font-bold">
        Report for {new Date(data.analysisUTCTimestamp).toLocaleDateString()}
      </h2>
      <AccordionItem value="page-loading-experience">
        <AccordionTrigger>
          <div className="text-lg font-bold">
            Page Loading Experience: {data?.loadingExperience?.overall_category}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <LoadingExperienceGauges experience={data?.loadingExperience} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="origin-loading-experience">
        <AccordionTrigger>
          <div className="text-lg font-bold">
            Origin Loading Experience:{' '}
            {data?.originLoadingExperience?.overall_category}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <LoadingExperienceGauges experience={data?.originLoadingExperience} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="screenshot">
        <AccordionTrigger>
          <div className="text-lg font-bold">Screenshots</div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-[1fr_2fr]">
            <ScreenshotComponent screenshot={screenshot} />
            <TimelineComponent timeline={timeline} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {Object.entries(categories || {}).map(([key, category]) => {
        console.log(category);
        return (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger>
              <div className="text-lg font-bold">
                {category.title}{' '}
                {category.score ? `score: ${category.score * 100}` : ''}
              </div>
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
                  {/* <div className="font-bold border-b pb-2 text-right" role="columnheader">Weight</div> */}
                  {/* <div className="font-bold border-b pb-2 text-right" role="columnheader">Group</div> */}
                </div>

                <Accordion type="multiple">
                  {category.auditRefs?.map((audit) => {
                    if (!audit.id) {
                      console.log('no id for', audit);
                      return null;
                    }
                    const auditData = audits?.[audit.id];
                    if (!auditData) {
                      console.log('no audit result for', audit);
                      return null;
                    }
                    return (
                      <AccordionItem key={audit.id} value={audit.id}>
                        <AccordionTrigger>
                          <div
                            className="grid grid-cols-[1fr_4fr] gap-4 border-b"
                            key={audit.id}
                            role="row"
                          >
                            <div className="py-2" role="cell">
                              {auditData.title}{' '}
                              {audit.acronym ? `(${audit.acronym})` : ''}
                            </div>
                            <div className="py-2" role="cell">
                              <ReactMarkdown
                                children={auditData.description || ''}
                              />
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ReactMarkdown>{auditData.description}</ReactMarkdown>
                          <div className="grid grid-cols-[auto_1fr] gap-4">
                            <div className="py-2">Weight:</div>
                            <div className="py-2" role="cell">
                              {audit.weight}
                            </div>
                          </div>
                          <div className="grid grid-cols-[auto_1fr] gap-4">
                            <div className="py-2">Score:</div>
                            <div className="py-2" role="cell">
                              {auditData.score}
                            </div>
                          </div>
                          <div className="grid grid-cols-[auto_1fr] gap-4">
                            <div className="py-2">Details:</div>
                            <div className="py-2">
                              <AuditDetails details={auditData.details} />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
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
      <AccordionItem value="audits">
        <AccordionTrigger>
          <div className="text-lg font-bold">Audits</div>
        </AccordionTrigger>
        <AccordionContent>
          <AuditTable audits={audits} />
        </AccordionContent>
      </AccordionItem>
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
    <div>
      <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-5">
        {metrics.map(({ metric, key }) => (
          <GaugeChart
            key={key}
            metric={metric}
            data={experience.metrics[key]}
          />
        ))}
      </div>
    </div>
  );
}

function ScreenshotComponent({
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

// Add at the bottom of the file
function TimelineComponent({ timeline }: { timeline?: AuditDetailFilmstrip }) {
  if (!timeline?.items?.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-row gap-2 border align-top">
      {timeline.items.map((item, i) => (
        <div key={`${i}-${item.timestamp}`} className="">
          <img alt={'timeline image'} width={80} src={item.data} />
          <div>{item.timing} ms</div>
        </div>
      ))}
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
        {' '}
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

function AuditTable({ audits }: { audits?: AuditResult }) {
  if (!audits) {
    return null;
  }
  return (
    <>
      <div className="text-lg font-bold"> Audits </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Title </TableHead>
            <TableHead>Description </TableHead>
            {/* <TableHead>Details </TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(audits).map(([key, audit], i) => {
            return (
              <TableRow key={`${i}-${audit.id}`}>
                <TableCell rowSpan={1}> {key} </TableCell>
                <TableCell rowSpan={1}> {audit.id} </TableCell>
                <TableCell rowSpan={1}> {audit.title} </TableCell>
                <TableCell rowSpan={1}>
                  <ReactMarkdown children={audit.description || ''} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

function AuditDetails({ details }: { details: unknown }) {
  const opportunity = AuditDetailOpportunitySchema.safeParse(details);

  console.log(opportunity);
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

  return <div>{JSON.stringify(details)}</div>;
}
