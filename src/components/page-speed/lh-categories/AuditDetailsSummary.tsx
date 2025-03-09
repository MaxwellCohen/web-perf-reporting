import ReactMarkdown from 'react-markdown';
import { ScoreDisplay } from '../ScoreDisplay';
import { AuditResult } from '@/lib/schema';

export function AuditDetailsSummary({
  desktopAuditData,
  mobileAuditData,
  acronym,
}: {
  desktopAuditData: AuditResult[string];
  mobileAuditData: AuditResult[string];
  acronym?: string;
}) {
  return (
    <div className="flex flex-1 flex-col flex-wrap gap-4 md:flex-row">
      <div className="flex flex-col gap-1 font-bold md:flex-[0_0_300px]">
        <span className="group-hover:underline">
          {desktopAuditData.title} {acronym ? `(${acronym})` : ''}
        </span>
        <ScoreDisplay audit={mobileAuditData} device={'Mobile'} />
        <ScoreDisplay audit={desktopAuditData} device={'Desktop'} />
        <div className="text-xs">
          {desktopAuditData.scoreDisplayMode === 'notApplicable'
            ? 'Not Applicable'
            : ''}
          {desktopAuditData.scoreDisplayMode === 'manual'
            ? 'Manual validation required'
            : ''}
        </div>
      </div>
      <div className="align-top no-underline hover:no-underline focus:no-underline md:flex-1">
        <ReactMarkdown>
          {desktopAuditData.description || mobileAuditData.description || ''}
        </ReactMarkdown>
      </div>
      {/* <div className="align-top no-underline hover:no-underline focus:no-underline md:flex-1">
            {desktopAuditData.scoreDisplayMode ||
              mobileAuditData.scoreDisplayMode ||
              ''}
          </div> */}
    </div>
  );
}
