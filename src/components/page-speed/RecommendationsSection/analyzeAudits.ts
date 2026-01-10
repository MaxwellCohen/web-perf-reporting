import { PageSpeedInsights, TableColumnHeading, TableItem } from '@/lib/schema';
import type { Recommendation } from './types';
import type { AuditEntry } from './auditTypes';
import {
  collectAuditData,
  getWorstScore,
  combineMetricSavings,
  combineAuditItems,
} from './auditProcessing';
import {
  processMetricSavingsAudit,
  processFailedAudit,
} from './recommendationProcessing';

function hasActionableDetails(
  allTableDataItems: TableItem[],
  allItems: Array<Record<string, unknown>>,
  tableHeadings: TableColumnHeading[] | undefined
): boolean {
  return (
    (allTableDataItems.length > 0 && !!tableHeadings) ||
    allItems.length > 0
  );
}

function sortRecommendations(recommendations: Recommendation[]): Recommendation[] {
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (b.impact.savings || 0) - (a.impact.savings || 0);
  });
}

export function analyzeAudits(items: Array<{ item: PageSpeedInsights; label: string }>): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const auditDataMap = collectAuditData(items);

  auditDataMap.forEach((auditEntries, auditId) => {
    const baseAudit = auditEntries[0].audit;
    const worstScore = getWorstScore(auditEntries);
    const scoreDisplayMode = baseAudit.scoreDisplayMode;
    const explanation = baseAudit.explanation;

    if (scoreDisplayMode === 'notApplicable' || scoreDisplayMode === 'manual') {
      return;
    }

    const combinedMetricSavings = combineMetricSavings(auditEntries);
    const { allItems, allTableDataItems, tableHeadings, itemsByReport } = combineAuditItems(auditEntries);

    if (scoreDisplayMode === 'metricSavings' && Object.keys(combinedMetricSavings).length > 0) {
      Object.entries(combinedMetricSavings).forEach(([metric, savings]) => {
        const recommendation = processMetricSavingsAudit(
          auditId,
          baseAudit,
          auditEntries,
          metric,
          savings,
          worstScore,
          allItems
        );
        recommendations.push(recommendation);
      });
    }

    if ((worstScore === 0 || worstScore === null) && scoreDisplayMode !== 'metricSavings') {
      const recommendation = processFailedAudit(
        auditId,
        baseAudit,
        auditEntries,
        worstScore,
        allTableDataItems,
        tableHeadings,
        explanation,
        itemsByReport
      );
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    if (
      scoreDisplayMode === 'informative' &&
      hasActionableDetails(allTableDataItems, allItems, tableHeadings)
    ) {
      const recommendation = processFailedAudit(
        auditId,
        baseAudit,
        auditEntries,
        worstScore,
        allTableDataItems,
        tableHeadings,
        explanation,
        itemsByReport
      );
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
  });

  return sortRecommendations(recommendations);
}

export function hasDetails(rec: Recommendation): boolean {
  const metricOnlyTitles = [
    'Speed Index',
    'Time to Interactive',
    'First Contentful Paint',
    'Largest Contentful Paint',
    'Cumulative Layout Shift',
    'Total Blocking Time',
  ];
  if (metricOnlyTitles.some((title) => rec.title.includes(title) && !rec.title.includes('Reduce'))) {
    return false;
  }

  const hasTableData = !!(rec.tableData && rec.tableData.items.length > 0);
  if (rec.tableData && rec.tableData.items.length === 0) {
    return false;
  }

  const hasItems = !!(rec.items && rec.items.length > 0);
  if (rec.items && rec.items.length === 0) {
    return false;
  }

  const hasActionableSteps =
    rec.actionableSteps.length > 0 &&
    !rec.actionableSteps.every(
      ({ step }) =>
        step === 'Review the audit details for specific recommendations' ||
        step === 'Test changes in a staging environment' ||
        step === 'Monitor performance metrics after implementation' ||
        step.trim().length === 0 ||
        step.toLowerCase().includes('shows how') ||
        step.toLowerCase().includes('learn more about'),
    );
  
  return hasActionableSteps || hasTableData || hasItems;
}

