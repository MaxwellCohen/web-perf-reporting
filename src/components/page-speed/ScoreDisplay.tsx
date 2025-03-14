import { AuditResultsRecord } from '@/lib/schema';

export const ScoreDisplayModes = {
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

export const ScoreDisplayModesRanking: Record<
  AuditResultsRecord[string]['scoreDisplayMode'] | 'empty',
  number
> = {
  metricSavings: 1,
  numeric: 2,
  binary: 3,
  informative: 4,
  manual: 5,
  empty: 6,
  error: 7,
  notApplicable: 8,
} as const;

export function isEmptyResult(auditData: AuditResultsRecord[string]) {
  if (
    auditData.details?.type === 'table' &&
    auditData.details.items?.length === 0
  ) {
    return true;
  }
  if (
    auditData.details?.type === 'opportunity' &&
    auditData.details.items?.length === 0
  ) {
    return true;
  }

  return !auditData.details;
}

export const sortByScoreDisplayModes = (
  a: AuditResultsRecord[string] | undefined,
  b: AuditResultsRecord[string] | undefined,
) => {
  if (!a || !b) {
    return -1;
  }


  const scoreDiff = (a.score || 0) - (b.score || 0);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const scoreDisplayModeDiff =
    ScoreDisplayModesRanking[
      isEmptyResult(a) ? 'empty' : a.scoreDisplayMode || 'notApplicable'
    ] -
    ScoreDisplayModesRanking[
      isEmptyResult(b) ? 'empty' : b.scoreDisplayMode || 'notApplicable'
    ];

  return scoreDisplayModeDiff;
};

export function ScoreDisplay({
  audit,
  device,
}: {
  audit?: AuditResultsRecord[string];
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
        <div className="text-xs">
          {device ? `${device} - ` : ''}{' '}
          {audit.displayValue ? `${audit.displayValue} - ` : ''}
          Score: {Math.round(audit.score * 100)} / 100
        </div>
      </>
    );
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.BINARY) {
    return (
      <div className="text-xs">
        {device} - {audit.score ? '✅ - Passed' : '❌ - Failed'}
      </div>
    );
  }

  if (audit.scoreDisplayMode === ScoreDisplayModes.MANUAL) {
    return <div className="text-xs">{device} - Manual</div>;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.INFORMATIVE) {
    return null;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.NOT_APPLICABLE) {
    return <div className="text-xs">{device} - Not Applicable</div>;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.ERROR) {
    return <div className="text-xs">Error: {audit.errorMessage}</div>;
  }

  return (
    <div className="text-xs">{device} - Score: {Math.round(audit.score * 100)} / 100</div>
  );
}
