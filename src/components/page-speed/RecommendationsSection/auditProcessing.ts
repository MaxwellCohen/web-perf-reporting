import {
  AuditDetailOpportunity,
  AuditDetailTable,
  AuditDetailList,
  TableColumnHeading,
  TableItem,
  PageSpeedInsights,
} from '@/lib/schema';
import type { AuditEntry, AuditDataMap } from '@/components/page-speed/RecommendationsSection/auditTypes';

export function collectAuditData(
  items: Array<{ item: PageSpeedInsights; label: string }>
): AuditDataMap {
  const auditDataMap = new Map<string, AuditEntry[]>();

  items.forEach(({ item, label }) => {
    const audits = item?.lighthouseResult?.audits;
    if (!audits) return;

    Object.entries(audits).forEach(([auditId, audit]) => {
      if (!audit) return;
      
      if (!auditDataMap.has(auditId)) {
        auditDataMap.set(auditId, []);
      }
      auditDataMap.get(auditId)!.push({ 
        auditId, 
        audit: audit as AuditEntry['audit'], 
        label, 
        item 
      });
    });
  });

  return auditDataMap;
}

export function getWorstScore(auditEntries: AuditEntry[]): number | null {
  const allScores = auditEntries.map((e) => e.audit.score).filter((s) => s !== null);
  if (allScores.length === 0) {
    return auditEntries[0]?.audit.score ?? null;
  }
  return Math.min(...allScores);
}

export function combineMetricSavings(auditEntries: AuditEntry[]): Record<string, number> {
  const combinedMetricSavings: Record<string, number> = {};
  
  auditEntries.forEach(({ audit }) => {
    const metricSavings = (audit as { metricSavings?: Record<string, number> }).metricSavings;
    if (metricSavings) {
      Object.entries(metricSavings).forEach(([metric, savings]) => {
        if (savings && savings > 0) {
          combinedMetricSavings[metric] = Math.max(
            combinedMetricSavings[metric] || 0,
            savings,
          );
        }
      });
    }
  });
  
  return combinedMetricSavings;
}

export function extractTableFromListItems(listDetails: AuditDetailList): {
  items: TableItem[];
  headings: TableColumnHeading[] | undefined;
} {
  const items: TableItem[] = [];
  let headings: TableColumnHeading[] | undefined;
  
  listDetails.items.forEach((item) => {
    if (item && typeof item === 'object' && 'type' in item && item.type === 'table') {
      const tableItem = item as AuditDetailTable;
      if (tableItem.items && tableItem.items.length > 0) {
        items.push(...tableItem.items);
        if (!headings && tableItem.headings) {
          headings = tableItem.headings;
        }
      }
    }
  });
  
  return { items, headings };
}

export function combineAuditItems(auditEntries: AuditEntry[]): {
  allItems: Array<Record<string, unknown>>;
  allTableDataItems: TableItem[];
  tableHeadings: TableColumnHeading[] | undefined;
  itemsByReport: Map<string, TableItem[]>;
} {
  const allItems: Array<Record<string, unknown>> = [];
  const allTableDataItems: TableItem[] = [];
  const itemsByReport = new Map<string, TableItem[]>();
  let tableHeadings: TableColumnHeading[] | undefined;
  
  auditEntries.forEach(({ audit, label }) => {
    const details = audit.details;
    if (!details || typeof details !== 'object' || !('type' in details)) {
      return;
    }
    
    const detailType = (details as { type?: string }).type;
    
    if (detailType === 'table') {
      const tableDetails = details as AuditDetailTable;
      if (tableDetails.items && tableDetails.items.length > 0) {
        allTableDataItems.push(...tableDetails.items);
        if (!itemsByReport.has(label)) {
          itemsByReport.set(label, []);
        }
        itemsByReport.get(label)!.push(...tableDetails.items);
        if (!tableHeadings && tableDetails.headings) {
          tableHeadings = tableDetails.headings;
        }
      }
    } else if (detailType === 'list') {
      const listDetails = details as AuditDetailList;
      const { items, headings } = extractTableFromListItems(listDetails);
      if (items.length > 0) {
        allTableDataItems.push(...items);
        if (!itemsByReport.has(label)) {
          itemsByReport.set(label, []);
        }
        itemsByReport.get(label)!.push(...items);
        if (!tableHeadings && headings) {
          tableHeadings = headings;
        }
      }
    } else if (detailType === 'opportunity') {
      const opportunityDetails = details as AuditDetailOpportunity;
      if (opportunityDetails.items) {
        allItems.push(...(opportunityDetails.items as Array<Record<string, unknown>>));
      }
    }
  });
  
  return { allItems, allTableDataItems, tableHeadings, itemsByReport };
}

