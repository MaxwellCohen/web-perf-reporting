import ReactMarkdown from 'react-markdown';
import { ScoreDisplay } from '../ScoreDisplay';
import { AuditResultsRecord } from '@/lib/schema';

export function AuditDetailsSummary({
  desktopAuditData,
  mobileAuditData,
  acronym,
}: {
  desktopAuditData?: AuditResultsRecord[string];
  mobileAuditData?: AuditResultsRecord[string];
  acronym?: string;
}) {
  return (
    <div className="flex flex-1 flex-col flex-wrap gap-4 md:flex-row">
      <div className="flex flex-col gap-1 font-bold md:flex-[0_0_21rem]">
        <span className="underline">
          {desktopAuditData?.title || mobileAuditData?.title || ''} {acronym ? `(${acronym})` : ''}
        </span>
        <ScoreDisplay audit={mobileAuditData} device={'Mobile'} />
        {/* {mobileAuditData.displayValue ? (
          <SmallText text={`Mobile: ${mobileAuditData.displayValue}`} />
        ) : null} */}
        <ScoreDisplay audit={desktopAuditData} device={'Desktop'} />

        {/* {desktopAuditData.displayValue ? (
          <SmallText text={`Desktop: ${desktopAuditData.displayValue}`} />
        ) : null} */}
        <SmallText
          text={
            desktopAuditData?.scoreDisplayMode === 'notApplicable'
              ? 'Not Applicable'
              : desktopAuditData?.scoreDisplayMode === 'manual'
                ? 'Manual validation required'
                : null
          }
        />
      </div>
      <div className="align-top no-underline hover:no-underline focus:no-underline md:flex-1">
        <ReactMarkdown>
          {desktopAuditData?.description || mobileAuditData?.description || ''}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function SmallText({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="text-xs">{text}</div>;
}
