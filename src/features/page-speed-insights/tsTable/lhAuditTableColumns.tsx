import { createColumnHelper } from '@tanstack/react-table';
import { categorySortFn } from '@/features/page-speed-insights/tsTable/categorySortFn';
import {
  LHCategoryScoreCell,
  LHCategoryTitleCell,
  LHAuditDescriptionCell,
} from '@/features/page-speed-insights/tsTable/lhAuditTableCells';
import type { TableDataItem } from '@/features/page-speed-insights/tsTable/TableDataItem';

const columnHelper = createColumnHelper<TableDataItem>();

/**
 * Lighthouse audit accordion table columns. Grouping is driven by useLHTable state
 * (e.g. category_title + id); sorting row models are not enabled on that hook.
 */
export const LH_AUDIT_TABLE_COLUMNS = [
  columnHelper.accessor((row) => row._category?.title || '', {
    id: 'category_title',
    header: 'Category',
    enableGrouping: true,
    sortingFn: categorySortFn,
    cell: LHCategoryTitleCell,
  }),
  columnHelper.accessor((r) => [r._category.score, r._userLabel].join(':::'), {
    id: 'category_score',
    header: 'Category Score',
    enableGrouping: true,
    enablePinning: true,
    aggregationFn: 'unique',
    cell: LHCategoryScoreCell,
  }),
  columnHelper.accessor('auditRef.group', {
    id: 'auditGroup',
    enableGrouping: true,
    header: 'Audit Group',
  }),
  columnHelper.accessor('_userLabel', {
    id: 'userLabel',
    enableGrouping: true,
    enableColumnFilter: true,
    filterFn: 'arrIncludesSome',
    sortingFn: 'alphanumeric',
    header: 'User Label',
  }),
  columnHelper.accessor('auditRef.id', {
    id: 'id',
    header: 'Id',
    enableGrouping: true,
  }),
  columnHelper.accessor('auditResult.title', {
    id: 'auditTitle',
    header: 'Audit Title',
    enableGrouping: true,
  }),
  columnHelper.accessor('auditResult.description', {
    id: 'auditDescription',
    header: 'Description',
    enableGrouping: true,
    cell: LHAuditDescriptionCell,
  }),
  columnHelper.accessor('auditResult.score', {
    id: 'auditScore',
    header: 'Score',
    enableGrouping: true,
  }),
  columnHelper.accessor('auditResult.displayValue', {
    id: 'auditDisplayValue',
    header: 'Display Value',
    enableGrouping: false,
  }),
  columnHelper.accessor('auditResult.details', {
    id: 'auditDetails',
    header: 'Details',
    enableGrouping: false,
  }),
];
