import { Card, CardTitle } from '@/components/ui/card';
import { ScoreDisplay } from '@/components/page-speed/ScoreDisplay';
import ReactMarkdown from 'react-markdown';
import { HorizontalScoreChart } from '@/components/common/PageSpeedGaugeChart';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Fragment, useContext } from 'react';
import { InsightsContext } from '@/components/page-speed/PageSpeedContext';
const metricAuditRefId = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
];
export function CWVMetricsComponent() {
  const items = useContext(InsightsContext)
    .map(({ item, label }) => ({
      cg: item?.lighthouseResult?.categoryGroups,
      a: item.lighthouseResult?.audits,
      label,
    }))
    .filter(({ cg, a }) => cg && a);

  const metricItems = metricAuditRefId.map((id) => {
    const auditItems = items
      .map(({ a, label }) => ({  audit: a?.[id], label }))
      .filter(({ audit }) => !!audit);

    return {
      auditName: id,
      title: auditItems.find(({ audit }) => audit?.title)?.audit?.title,
      description: auditItems.find(({ audit }) => audit?.description)?.audit
        ?.description,
      auditItems,
    };
  });

  if(!items.length) {
    return null;
  }
  
  return (
    <AccordionItem value={'cwv'} className="flex flex-col gap-2 print:border-0">
      <AccordionTrigger className="">
        <h3 className="text-lg font-bold">Core Web Vitals Summary</h3>
      </AccordionTrigger>
      <AccordionContent className="-mx-2 grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-2">
        {metricItems.map(({ auditName, title, auditItems, description }) => {
          return (
            <Card
              key={auditName}
              className="flex w-full min-w-64 flex-col gap-2 px-4 py-4"
            >
              <div className="flex w-full flex-col gap-2">
                <CardTitle className="text-md font-bold">{title}</CardTitle>
                <div className="contents text-sm">
                  {auditItems?.map(({ audit, label }, idx) => {
                    if (!audit) return null;
                    return (
                      <Fragment key={`${auditName}_${idx}_${label}`}>
                        <ScoreDisplay audit={audit} device={label} />{' '}
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
      </AccordionContent>
    </AccordionItem>
  );
}
