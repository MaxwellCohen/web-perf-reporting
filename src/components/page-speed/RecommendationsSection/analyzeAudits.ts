import { PageSpeedInsights, TableColumnHeading, TableItem } from '@/lib/schema';
import type { Recommendation } from '@/components/page-speed/RecommendationsSection/types';
import {
  collectAuditData,
  getWorstScore,
  combineMetricSavings,
  combineAuditItems,
} from '@/components/page-speed/RecommendationsSection/auditProcessing';
import {
  processMetricSavingsAudit,
  processFailedAudit,
} from '@/components/page-speed/RecommendationsSection/recommendationProcessing';

const hideAuditId = [ "main-thread-tasks", "screenshot-thumbnails" ];

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
    // Filter out notApplicable and manual audits from entries
    const applicableEntries = auditEntries.filter(
      (entry) => 
        entry.audit.scoreDisplayMode.toLocaleLowerCase() !== 'notapplicable' && 
        entry.audit.scoreDisplayMode.toLocaleLowerCase() !== 'manual'
    );

    // Skip if all entries are notApplicable or manual, or if auditId is in hide list
    if (applicableEntries.length === 0 || hideAuditId.includes(auditId)) {
      return;
    }

    const baseAudit = applicableEntries[0].audit;
    const worstScore = getWorstScore(applicableEntries);
    const scoreDisplayMode = baseAudit.scoreDisplayMode;
    const explanation = baseAudit.explanation;
    
    const combinedMetricSavings = combineMetricSavings(applicableEntries);
    const { allItems, allTableDataItems, tableHeadings, itemsByReport } = combineAuditItems(applicableEntries);

    if (scoreDisplayMode === 'metricSavings' && Object.keys(combinedMetricSavings).length > 0) {
      Object.entries(combinedMetricSavings).forEach(([metric, savings]) => {
        const recommendation = processMetricSavingsAudit(
          auditId,
          baseAudit,
          applicableEntries,
          metric,
          savings,
          worstScore,
          allItems
        );
        recommendations.push(recommendation);
      });
    }

    // For audits with metricSavings but scoreDisplayMode is not 'metricSavings',
    // only include if there are actual savings (> 0)
    const hasNonZeroSavings = Object.values(combinedMetricSavings).some(savings => savings > 0);
    
    if ((worstScore === 0 || worstScore === null) && scoreDisplayMode !== 'metricSavings') {
      // Skip audits that have metricSavings but all are 0 (no actual impact)
      if (Object.keys(combinedMetricSavings).length > 0 && !hasNonZeroSavings) {
        return;
      }
      
      const recommendation = processFailedAudit(
        auditId,
        baseAudit,
        applicableEntries,
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
        applicableEntries,
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


  const metricOnlyTitles = [
    'Speed Index',
    'Time to Interactive',
    'First Contentful Paint',
    'Largest Contentful Paint',
    'Cumulative Layout Shift',
    'Total Blocking Time',
  ];

export function hasDetails(rec: Recommendation): boolean {
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
    rec.actionableSteps.length > 0
    // !rec.actionableSteps.every(
    //   ({ step }) =>
    //     step === 'Review the audit details for specific recommendations' ||
    //     step === 'Test changes in a staging environment' ||
    //     step === 'Monitor performance metrics after implementation' ||
    //     step.trim().length === 0 ||
    //     step.toLowerCase().includes('shows how') ||
    //     step.toLowerCase().includes('learn more about'),
    // );
  
  return hasActionableSteps || hasTableData || hasItems;
}

