/* eslint-disable react/no-children-prop */
/* eslint-disable @next/next/no-img-element */
'use client';
import GaugeChart from '@/components/common/PageSpeedGuageChart';

import {
  TableCaption,
  TableHeader,
  TableRow,
  Table,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  AuditDetailFilmstrip,
  PageSpeedApiLoadingExperience,
  PageSpeedInsights,
} from '@/lib/schema';

import ReactMarkdown from 'react-markdown';

export function PageSpeedInsightsDashboard({
  data,
}: {
  data: PageSpeedInsights;
}) {
  if (!data) {
    return null;
  }
  const url = data?.lighthouseResult.finalDisplayedUrl;
  const screenshot = data.lighthouseResult.fullPageScreenshot?.screenshot;
  const timeline = AuditDetailFilmstrip.safeParse(
    data?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;
  return (
    <div>
      <LoadingExperienceGauges
        title={'Page Loading Experience: '}
        experience={data?.loadingExperience}
      />
      <LoadingExperienceGauges
        title={'Origin Loading Experience:'}
        experience={data?.originLoadingExperience}
      />

      {screenshot ? (
        <div className="grid grid-cols-3">
          <img
            alt={'fullscreen image'}
            width={80}
            src={screenshot.data}
            className={`w-20 aspect-[${screenshot.width}/${screenshot.height}]`}
          />
        </div>
      ) : null}
      <div className="mt-3 flex flex-row border">
        {timeline ? (
          timeline?.items?.length ? (
            <>
              {timeline.items.map((item, i) => {
                return (
                  <div key={`${i}-${item.timestamp}`} className="w-[250px]">
                    <img alt={'timeline image'} width={80} src={item.data} />
                    <div>{item.timing} ms</div>
                  </div>
                );
              })}
            </>
          ) : null
        ) : null}
      </div>
      {data?.lighthouseResult?.entities ? (
        <>
          <h3> Entities - list of Origins that the site uses</h3>
          <Table>
            <TableCaption>A list of entities that {url} uses </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name </TableHead>
                <TableHead>Is First Party </TableHead>
                <TableHead>Is Unrecognized </TableHead>
                <TableHead>Origins </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lighthouseResult.entities.map((entity, i) => (
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
      ) : null}
      {data?.lighthouseResult?.audits ? (
        <>
          <h3> Audits </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title </TableHead>
                <TableHead>Description </TableHead>
                {/* <TableHead>Details </TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(data.lighthouseResult.audits).map((audit, i) => (
                <TableRow key={`${i}-${audit.id}`}>
                  <TableCell> {audit.id} </TableCell>
                  <TableCell> {audit.title} </TableCell>
                  <TableCell>
                    {' '}
                    <ReactMarkdown children={audit.description || ''} />
                  </TableCell>
                  <TableCell>{audit.score}</TableCell>
                  {/* <TableCell>
                      {JSON.stringify(
                        audit.details
                      )}
                    </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}
    </div>
  );
}

export function LoadingExperienceGauges({
  title,
  experience,
}: {
  title: string;
  experience?: PageSpeedApiLoadingExperience;
}) {
  if (!experience) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xl">
        {title}
        <strong>{experience.overall_category}</strong>
      </h3>
      <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-5">
        <GaugeChart
          metric="Cumulative Layout Shift"
          data={experience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE}
        />
        <GaugeChart
          metric="Time to First Byte"
          data={experience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE}
        />
        <GaugeChart
          metric="First Contentful Paint"
          data={experience.metrics.FIRST_CONTENTFUL_PAINT_MS}
        />
        <GaugeChart
          metric="Interaction to Next Paint"
          data={experience.metrics.INTERACTION_TO_NEXT_PAINT}
        />
        <GaugeChart
          metric="Largest Contentful Paint"
          data={experience.metrics.LARGEST_CONTENTFUL_PAINT_MS}
        />
      </div>
    </div>
  );
}
