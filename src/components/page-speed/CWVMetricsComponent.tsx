import { PageSpeedInsights } from '@/lib/schema';
import { AuditResultsRecord } from '@/lib/schema';
import { Card, CardTitle } from '../ui/card';
import { ScoreDisplay } from './ScoreDisplay';
import ReactMarkdown from 'react-markdown';
import { HorizontalScoreChart } from '../common/PageSpeedGaugeChart';
import { Details } from '../ui/accordion';

export function CWVMetricsComponent({
  desktopCategoryGroups,
  desktopAudits,
  mobileCategoryGroups,
  mobileAudits,
}: {
  desktopCategoryGroups?: PageSpeedInsights['lighthouseResult']['categoryGroups'];
  desktopAudits?: AuditResultsRecord;
  mobileCategoryGroups?: PageSpeedInsights['lighthouseResult']['categoryGroups'];
  mobileAudits?: AuditResultsRecord;
}) {
  return (
    <Details className="flex flex-col gap-2 print:border-0">
      <summary className="flex flex-col gap-2">
        {desktopCategoryGroups?.['metrics']?.title ||
        mobileCategoryGroups?.['metrics']?.title ? (
          <h3 className="text-lg font-bold">
            {desktopCategoryGroups?.['metrics']?.title ||
              mobileCategoryGroups?.['metrics']?.title}
          </h3>
        ) : null}
      </summary>
      <div className="-mx-2 grid grid-cols-[repeat(auto-fit,_minmax(14rem,_1fr))] gap-2">
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
    </Details>
  );
}
