import {
  AuditDetailOpportunity,
  TableColumnHeading,
  TableItem,
} from '@/lib/schema';
import type { AuditEntry } from '@/components/page-speed/RecommendationsSection/auditTypes';
import type { Recommendation, ActionableStep } from '@/components/page-speed/RecommendationsSection/types';
import { METRIC_NAMES } from '@/components/page-speed/RecommendationsSection/constants';
import { getRecommendationPriority } from '@/components/page-speed/RecommendationsSection/utils';
import { extractSpecificRecommendations } from '@/components/page-speed/RecommendationsSection/extractRecommendations';
import { getCategoryAndGenericSteps } from '@/components/page-speed/RecommendationsSection/categorySteps';
import { deduplicateResourcesByUrl } from '@/components/page-speed/RecommendationsSection/deduplicateResources';

export function collectSpecificRecommendations(
  auditId: string,
  auditEntries: AuditEntry[]
): ActionableStep[] {
  const stepsMap = new Map<string, { reports: Set<string>; url?: string }>();
  
  auditEntries.forEach(({ audit, label }) => {
    const details = audit.details;
    const reportItems: Array<Record<string, unknown>> = [];
    if (details && (details as { type?: string }).type === 'opportunity') {
      const opportunityDetails = details as AuditDetailOpportunity;
      if (opportunityDetails.items) {
        reportItems.push(...(opportunityDetails.items as Array<Record<string, unknown>>));
      }
    }
    
    const specificRecs = extractSpecificRecommendations(
      auditId,
      reportItems,
      { explanation: audit.explanation, displayValue: audit.displayValue },
      label,
    );
    
    specificRecs.forEach(({ step, reports, url }) => {
      if (!stepsMap.has(step)) {
        stepsMap.set(step, { reports: new Set(), url });
      }
      const entry = stepsMap.get(step)!;
      reports.forEach((r) => entry.reports.add(r));
      // Preserve URL if it exists
      if (url && !entry.url) {
        entry.url = url;
      }
    });
  });
  
  return Array.from(stepsMap.entries()).map(([step, { reports, url }]) => ({
    step,
    reports: Array.from(reports),
    url,
  }));
}

export function combineAndDeduplicateSteps(
  specificRecs: ActionableStep[],
  genericSteps: ActionableStep[]
): ActionableStep[] {
  const allStepsMap = new Map<string, { reports: Set<string>; url?: string }>();
  
  [...specificRecs, ...genericSteps].forEach(({ step, reports, url }) => {
    if (!allStepsMap.has(step)) {
      allStepsMap.set(step, { reports: new Set(), url });
    }
    const entry = allStepsMap.get(step)!;
    reports.forEach((r) => entry.reports.add(r));
    // Preserve URL if it exists
    if (url && !entry.url) {
      entry.url = url;
    }
  });
  
  return Array.from(allStepsMap.entries()).map(([step, { reports, url }]) => ({
    step,
    reports: Array.from(reports),
    url,
  }));
}

export function processMetricSavingsAudit(
  auditId: string,
  audit: AuditEntry['audit'],
  auditEntries: AuditEntry[],
  metric: string,
  savings: number,
  worstScore: number | null,
  allItems: Array<Record<string, unknown>>
): Recommendation {
  const metricName = METRIC_NAMES[metric] || metric;
  const priority = getRecommendationPriority(worstScore, savings);
  
  const specificRecs = collectSpecificRecommendations(auditId, auditEntries);
  const { category, genericSteps } = getCategoryAndGenericSteps(auditId, specificRecs);
  const actionableSteps = combineAndDeduplicateSteps(specificRecs, genericSteps);

  // Deduplicate resources by URL and keep all
  const deduplicatedItems = deduplicateResourcesByUrl(allItems);

  return {
    id: `${auditId}-${metric}`,
    title: audit.title || auditId,
    description: audit.description || '',
    priority,
    category,
    impact: {
      metric: metricName,
      savings: savings,
      unit: metric === 'TBT' || metric === 'LCP' || metric === 'FCP' ? 'ms' : undefined,
    },
    items: deduplicatedItems,
    actionableSteps,
  };
}

function addDescriptionBasedSteps(
  audit: AuditEntry['audit'],
  stepsMap: Map<string, Set<string>>,
  allReportsLabel: string[]
): void {
  if (!audit.description) return;
  
  const desc = audit.description.toLowerCase();
  if (desc.includes('meta description')) {
    stepsMap.set('Add a unique meta description to this page', new Set(allReportsLabel));
  }
  if (desc.includes('viewport')) {
    stepsMap.set('Add a viewport meta tag for mobile responsiveness', new Set(allReportsLabel));
  }
  if (desc.includes('document does not have a valid')) {
    stepsMap.set('Fix HTML validation errors', new Set(allReportsLabel));
  }
  if (desc.includes('tap targets')) {
    stepsMap.set('Increase tap target sizes to at least 48x48px', new Set(allReportsLabel));
  }
  if (desc.includes('contrast')) {
    stepsMap.set('Improve color contrast ratios to meet WCAG standards', new Set(allReportsLabel));
  }
}

function addCategorySpecificSteps(
  auditId: string,
  stepsMap: Map<string, Set<string>>,
  allReportsLabel: string[]
): string {
  if (auditId.includes('layout-shift') || auditId.includes('cls')) {
    stepsMap.set('Set explicit dimensions for images and videos', new Set(allReportsLabel));
    stepsMap.set('Avoid inserting content above existing content', new Set(allReportsLabel));
    stepsMap.set('Reserve space for ads and embeds', new Set(allReportsLabel));
    stepsMap.set('Use CSS aspect-ratio for responsive images', new Set(allReportsLabel));
    return 'Layout Stability';
  }
  if (auditId.includes('accessibility') || auditId.includes('heading-order') || 
      auditId.includes('color-contrast') || auditId.includes('aria') ||
      auditId.includes('label') || auditId.includes('alt') || auditId.includes('tap-targets')) {
    if (auditId.includes('heading-order')) {
      stepsMap.set('Ensure headings follow a logical order (h1 → h2 → h3, etc.)', new Set(allReportsLabel));
      stepsMap.set('Do not skip heading levels (e.g., h1 to h3)', new Set(allReportsLabel));
      stepsMap.set('Use headings to structure content semantically', new Set(allReportsLabel));
    } else {
      stepsMap.set('Fix identified accessibility issues', new Set(allReportsLabel));
      stepsMap.set('Test with screen readers', new Set(allReportsLabel));
    }
    return 'Accessibility';
  }
  if (auditId.includes('seo')) {
    stepsMap.set('Fix identified SEO issues', new Set(allReportsLabel));
    stepsMap.set('Improve meta tags and structured data', new Set(allReportsLabel));
    return 'SEO';
  }
  if (auditId.includes('best-practices')) {
    stepsMap.set('Address security and performance concerns', new Set(allReportsLabel));
    stepsMap.set('Follow modern web standards', new Set(allReportsLabel));
    return 'Best Practices';
  }
  return 'Performance';
}

function addFallbackSteps(
  audit: AuditEntry['audit'],
  explanation: string | undefined,
  stepsMap: Map<string, Set<string>>,
  allReportsLabel: string[]
): void {
  if (explanation) {
    explanation.split('. ').filter((s: string) => s.length > 20).forEach((step) => {
      stepsMap.set(step, new Set(allReportsLabel));
    });
  }
  if (stepsMap.size === 0 && audit.description) {
    const descLines = audit.description.split(/[.!?]\s+/);
    descLines.filter((line: string) => line.length > 30 && line.length < 200).forEach((step) => {
      stepsMap.set(step, new Set(allReportsLabel));
    });
  }
}

function addFailedAuditSteps(
  auditId: string,
  audit: AuditEntry['audit'],
  explanation: string | undefined,
  stepsMap: Map<string, Set<string>>,
  allReportsLabel: string[]
): string {
  addDescriptionBasedSteps(audit, stepsMap, allReportsLabel);
  const category = addCategorySpecificSteps(auditId, stepsMap, allReportsLabel);
  addFallbackSteps(audit, explanation, stepsMap, allReportsLabel);
  return category;
}

function buildActionableStepsFromMap(
  stepsMap: Map<string, Set<string>>
): ActionableStep[] {
  return Array.from(stepsMap.entries()).map(([step, reports]) => ({
    step,
    reports: Array.from(reports),
  }));
}

function getDefaultActionableSteps(
  audit: AuditEntry['audit'],
  explanation: string | undefined,
  allReportsLabel: string[]
): ActionableStep[] {
  if (explanation) {
    return [{ step: explanation, reports: allReportsLabel }];
  }
  if (audit.description) {
    return [{ step: audit.description.split('.')[0] + '.', reports: allReportsLabel }];
  }
  return [{ step: 'Review the audit details for specific recommendations', reports: allReportsLabel }];
}

function collectFailedAuditSteps(
  auditId: string,
  auditEntries: AuditEntry[],
  stepsMap: Map<string, Set<string>>
): string[] {
  const allReportLabels = auditEntries.map((e) => e.label);
  const allReportsLabel = allReportLabels.length === auditEntries.length && 
    allReportLabels.every((label) => auditEntries.some((e) => e.label === label))
    ? allReportLabels
    : [];
  
  const specificRecs = collectSpecificRecommendations(auditId, auditEntries);
  specificRecs.forEach(({ step, reports }) => {
    if (!stepsMap.has(step)) {
      stepsMap.set(step, new Set());
    }
    reports.forEach((r) => stepsMap.get(step)!.add(r));
  });
  
  return allReportsLabel;
}

export function processFailedAudit(
  auditId: string,
  audit: AuditEntry['audit'],
  auditEntries: AuditEntry[],
  worstScore: number | null,
  allTableDataItems: TableItem[],
  tableHeadings: TableColumnHeading[] | undefined,
  explanation: string | undefined,
  itemsByReport?: Map<string, TableItem[]>
): Recommendation | null {
  const priority = getRecommendationPriority(worstScore);
  const tableData = allTableDataItems.length > 0 && tableHeadings
    ? { 
        headings: tableHeadings, 
        items: allTableDataItems,
        itemsByReport: itemsByReport || new Map<string, TableItem[]>()
      }
    : undefined;

  const stepsMap = new Map<string, Set<string>>();
  const allReportsLabel = collectFailedAuditSteps(auditId, auditEntries, stepsMap);
  const category = addFailedAuditSteps(auditId, audit, explanation, stepsMap, allReportsLabel);
  const actionableSteps = buildActionableStepsFromMap(stepsMap);

  if (actionableSteps.length > 0 || audit.description || tableData) {
    return {
      id: `${auditId}-failed`,
      title: audit.title || auditId,
      description: audit.description || '',
      priority,
      category,
      impact: {},
      actionableSteps: actionableSteps.length > 0
        ? actionableSteps
        : getDefaultActionableSteps(audit, explanation, allReportsLabel),
      tableData,
    };
  }
  
  return null;
}

