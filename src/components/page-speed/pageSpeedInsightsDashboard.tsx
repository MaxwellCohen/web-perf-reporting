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
  return (
    <Accordion 
      type="multiple" 
      defaultValue={[
        "page-loading-experience",
        "origin-loading-experience",
        "screenshot",
        "entities",
        "audits"
      ]}
    >
      <AccordionItem value="page-loading-experience">
        <AccordionTrigger>
          <h2 className="text-lg font-bold">Page Loading Experience: {data?.loadingExperience?.overall_category}</h2>
        </AccordionTrigger>
        <AccordionContent>
          <LoadingExperienceGauges
            experience={data?.loadingExperience}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="origin-loading-experience">
        <AccordionTrigger>
          <h2 className="text-lg font-bold">Origin Loading Experience: {data?.originLoadingExperience?.overall_category}</h2>
        </AccordionTrigger>
        <AccordionContent>
          <LoadingExperienceGauges
            experience={data?.originLoadingExperience}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="screenshot">
        <AccordionTrigger>
          <h2 className="text-lg font-bold">Screenshots</h2>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-[1fr_2fr]">
            <ScreenshotComponent screenshot={screenshot} />
            <TimelineComponent timeline={timeline} />
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="entities">
        <AccordionTrigger>
          <h2 className="text-lg font-bold">Entities</h2>
        </AccordionTrigger>
        <AccordionContent>
          <EntitiesTable entities={entities} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="audits">
        <AccordionTrigger>
          <h2 className="text-lg font-bold">Audits</h2>
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
  const metrics: {metric: string, key: keyof PageSpeedApiLoadingExperience['metrics']}[] = [
    {
      metric: "Cumulative Layout Shift",
      key: "CUMULATIVE_LAYOUT_SHIFT_SCORE"
    },
    {
      metric: "Time to First Byte", 
      key: "EXPERIMENTAL_TIME_TO_FIRST_BYTE"
    },
    {
      metric: "First Contentful Paint",
      key: "FIRST_CONTENTFUL_PAINT_MS"
    },
    {
      metric: "Interaction to Next Paint",
      key: "INTERACTION_TO_NEXT_PAINT"
    },
    {
      metric: "Largest Contentful Paint",
      key: "LARGEST_CONTENTFUL_PAINT_MS"
    }
  ]
  return (
    <div>
      <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-5">
        {metrics.map(({metric, key}) => (
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
  if (!entities?.length) {
    return null;
  }

  return (
    <>
      <h3> Entities - list of Origins that the site uses</h3>
      <Table>
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
      <h3> Audits </h3>
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
                <TableCell> {key} </TableCell>
                <TableCell> {audit.id} </TableCell>
                <TableCell> {audit.title} </TableCell>
                <TableCell>
                  <ReactMarkdown children={audit.description || ''} />
                </TableCell>
                <TableCell>{audit.score}</TableCell>
                {/* <TableCell>
                {JSON.stringify(
                  audit.details
                )}
              </TableCell> */}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
