/**
 * Configuration for audits that should display one table per report
 * instead of combining reports into a single table.
 * 
 * Add audit IDs to this array to enable separate table rendering per report.
 */
export const AUDITS_WITH_SEPARATE_TABLES_PER_REPORT: string[] = [
  'dom-size-insight',
  'cls-culprits-insight',
  'network-metrics'
  // Add more audit IDs here as needed
];

/**
 * Check if an audit should display separate tables per report
 */
export function shouldShowSeparateTablesPerReport(auditId: string): boolean {
  return AUDITS_WITH_SEPARATE_TABLES_PER_REPORT.includes(auditId);
}

