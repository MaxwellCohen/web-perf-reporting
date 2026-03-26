/**
 * Configuration for audits that should display one table per report
 * instead of combining reports into a single table.
 *
 * Add audit IDs to this array to enable separate table rendering per report.
 */
export const AUDITS_WITH_SEPARATE_TABLES_PER_REPORT: string[] = [
  "dom-size-insight",
  "cls-culprits-insight",
  "network-metrics",
  "lcp-breakdown-insight",
  "resource-summary",
  "long-tasks",
  "third-parties-insight",
  "third-parties-details",
  "network-rtt",
  "network-requests",
  "network-server-latency",
  "network-resource-type-breakdown",
  "network-top-resources",
  "network-lcp-breakdown",
  "network-lcp-breakdown-insight",
  "network-lcp-breakdown-details",
  "network-lcp-breakdown-insight",
  // Add more audit IDs here as needed
];

/**
 * Check if an audit should display separate tables per report
 */
export function shouldShowSeparateTablesPerReport(auditId: string): boolean {
  return AUDITS_WITH_SEPARATE_TABLES_PER_REPORT.includes(auditId);
}
