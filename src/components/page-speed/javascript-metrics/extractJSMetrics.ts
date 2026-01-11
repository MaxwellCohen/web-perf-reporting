import { AuditDetailTable, TableItem, PageSpeedInsights } from '@/lib/schema';
import type { InsightsContextItem } from '@/components/page-speed/PageSpeedContext';

export type JSMetrics = {
  label: string;
  bootupTime: TableItem[];
  mainThreadWork: TableItem[];
  unusedJS: TableItem[];
  unminifiedJS: TableItem[];
  legacyJS: TableItem[];
  diagnostics: TableItem[];
  mainThreadTasks: TableItem[];
  jsResources: TableItem[];
};

/**
 * Helper function to extract audit details from a Lighthouse audit
 */
function getAuditDetails(
  audits: PageSpeedInsights['lighthouseResult']['audits'],
  auditId: string,
): AuditDetailTable | undefined {
  const audit = audits?.[auditId];
  return audit?.details as AuditDetailTable | undefined;
}

/**
 * Filters JavaScript resources from network requests
 */
function filterJavaScriptResources(
  networkRequestsDetails: AuditDetailTable | undefined,
): TableItem[] {
  if (!networkRequestsDetails?.items) {
    return [];
  }

  return networkRequestsDetails.items.filter((item: TableItem) => {
    const resourceType = item?.resourceType;
    return (
      typeof resourceType === 'string' &&
      resourceType.toLowerCase() === 'script'
    );
  });
}

/**
 * Extracts JavaScript performance metrics from Lighthouse audit results
 */
export function extractJSMetrics({ item, label }: InsightsContextItem): JSMetrics {
  const audits = item?.lighthouseResult?.audits;
  if (!audits) {
    return {
      label,
      bootupTime: [],
      mainThreadWork: [],
      unusedJS: [],
      unminifiedJS: [],
      legacyJS: [],
      diagnostics: [],
      mainThreadTasks: [],
      jsResources: [],
    };
  }

  // Extract audit details
  const bootupTimeDetails = getAuditDetails(audits, 'bootup-time');
  const mainThreadWorkDetails = getAuditDetails(audits, 'mainthread-work-breakdown');
  const unusedJSDetails = getAuditDetails(audits, 'unused-javascript');
  const unminifiedJSDetails = getAuditDetails(audits, 'unminified-javascript');
  const legacyJSDetails = getAuditDetails(audits, 'legacy-javascript-insight');
  const diagnosticsDetails = getAuditDetails(audits, 'diagnostics');
  const mainThreadTasksDetails = getAuditDetails(audits, 'main-thread-tasks');
  const networkRequestsDetails = getAuditDetails(audits, 'network-requests');

  // Filter JavaScript resources from network requests
  const jsResources = filterJavaScriptResources(networkRequestsDetails);

  return {
    label,
    bootupTime: bootupTimeDetails?.items || [],
    mainThreadWork: mainThreadWorkDetails?.items || [],
    unusedJS: unusedJSDetails?.items || [],
    unminifiedJS: unminifiedJSDetails?.items || [],
    legacyJS: legacyJSDetails?.items || [],
    diagnostics: diagnosticsDetails?.items || [],
    mainThreadTasks: mainThreadTasksDetails?.items || [],
    jsResources,
  };
}

