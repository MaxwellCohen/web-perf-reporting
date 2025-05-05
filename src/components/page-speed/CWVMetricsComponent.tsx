import { PageSpeedInsights } from '@/lib/schema';
import { AuditResultsRecord } from '@/lib/schema';
import { Card, CardTitle } from '../ui/card';
import { ScoreDisplay } from './ScoreDisplay';
import ReactMarkdown from 'react-markdown';
import { HorizontalScoreChart } from '../common/PageSpeedGaugeChart';
import { Details } from '../ui/accordion';
import { Fragment } from 'react';

export function CWVMetricsComponent({
  categoryGroups,
  audits,
  labels,
}: {
  categoryGroups: (
    | PageSpeedInsights['lighthouseResult']['categoryGroups']
    | null
  )[];
  audits: (AuditResultsRecord | null)[];
  labels: string[];
}) {
  const title = categoryGroups.find(
    (categoryGroup) => categoryGroup?.metrics?.title,
  )?.metrics?.title;

  return (
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        {title ? <h3 className="text-lg font-bold">{title}</h3> : null}
      </summary>
      <div className="-mx-2 grid grid-cols-[repeat(auto-fit,_minmax(14rem,_1fr))] gap-2">
        {[
          'first-contentful-paint',
          'largest-contentful-paint',
          'total-blocking-time',
          'cumulative-layout-shift',
          'speed-index',
        ]?.map((auditName) => {
          const auditItems = audits?.map((audit) => audit?.[auditName]);
          const hasData = auditItems?.some((audit) => !!audit);
          if (!hasData) {
            return null;
          }
          const auditTitle = auditItems?.find((audit) => audit?.title)?.title;
          const description = auditItems?.find(
            (audit) => audit?.description,
          )?.description;

          return (
            <Card
              key={auditName}
              className="flex w-full min-w-64 flex-col gap-2 px-4 py-4"
            >
              <div className="flex w-full flex-col gap-2">
                <CardTitle className="text-md font-bold">
                  {auditTitle}
                </CardTitle>
                <div className="contents text-sm">
                  {auditItems?.map((audit, idx) => {
                    if (!audit) return null;
                    return (
                      <Fragment key={`${auditName}_${idx}_${labels[idx]}`}>
                        <ScoreDisplay audit={audit} device={labels[idx]} />{' '}
                        <HorizontalScoreChart score={audit?.score || 0} />
                      </Fragment>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs">
                  <ReactMarkdown>{description || ''}</ReactMarkdown>
                </div>
              </div>
            </Card>
          );
        }) || null}
      </div>
    </Details>
  );
}
