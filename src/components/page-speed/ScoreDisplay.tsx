import { AuditResult } from '@/lib/schema';
import {
  Table,
  TableCell,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

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

export function ScoreDisplay({
  audit,
  device,
}: {
  audit?: AuditResult[string];
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
        <div>
          {device ? `${device} - ` : ''}{' '}
          {audit.displayValue ? `${audit.displayValue} - ` : ''}
          Score: {Math.round(audit.score * 100)} / 100
        </div>
      </>
    );
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.BINARY) {
    return <div>Score: {audit.score ? '✅ - Passed' : '❌ - Failed'}</div>;
  }

  if (audit.scoreDisplayMode === ScoreDisplayModes.MANUAL) {
    return null;
  }
  if (audit.scoreDisplayMode === ScoreDisplayModes.INFORMATIVE) {
    return (
      <div>
        <div>Score: {audit.score}</div>
        {audit.displayValue ? <div>Value: {audit.displayValue}</div> : null}

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
