import { Timeline } from '../Timeline';
import {
  AuditDetailFilmstrip,
  AuditDetailList,
  CriticalRequestChain,
  TreeMapData,
} from '@/lib/schema';
import { RenderChecklist } from './RenderChecklist';
import { DetailTable2 } from './table/RenderTable';
import { RenderDebugData } from './RenderDebugdata';
import { RenderCriticalChainData } from './table/renderCricticalChain';
import { TableDataItem } from '../tsTable/TableDataItem';
import { JSUsageAccordion } from '../JSUsage/JSUsageSection';
import { useMemo } from 'react';

export function RenderDetails({ items }: { items: TableDataItem[] }) {
  const details = items.map((a) => a?.auditResult.details);
  const types = [...new Set(details.map((a) => a?.type).filter(Boolean))];
  const detailType = types[0];
  if (types.length !== 1 || !detailType) {
    return null;
  }
  const auditData = items.map((a) => a?.auditResult);
  const labels = items.map((a) => a?._userLabel);
  const title = auditData.find((a) => a?.title)?.title || '';

  switch (detailType) {
    case 'filmstrip':
      return (
        <>
          {details.map((ad, i) => (
            <Timeline
              key={`${i}_${labels[i]}`}
              timeline={ad as AuditDetailFilmstrip}
              device={labels[i]}
            />
          ))}
        </>
      );
    case 'list':
      return <RenderList rows={items} />;
    case 'checklist':
      return <RenderChecklist items={items} title={title} />;
    case 'table':
    case 'opportunity':
      // @ts-expect-error need better type narrowing
      return <DetailTable2 rows={items} />;
    case 'criticalrequestchain':
      return (
        <div>
          Critical Request Chain
          <RenderCriticalChainData
            desktopDetails={details[1] as CriticalRequestChain}
            mobileDetails={details[2] as CriticalRequestChain}
          />
        </div>
      );
    // Internal-only details, not for rendering.
    case 'screenshot':
      return null;
    case 'debugdata':
      return <RenderDebugData items={items} />;
    case 'treemap-data':
      return items.map((r, i) => (
        <JSUsageAccordion
          key={`${r.auditResult.id}_${i}`}
          treeData={r.auditResult?.details as TreeMapData}
          label={r._userLabel}
        />
      ));

    default:
      return null;
    // return <RenderUnknown details={desktopDetails} />;
  }
}

function RenderList({ rows }: { rows: TableDataItem[] }) {
  // const auditData = rows.map((a) => a?.auditResult);
  const items = useMemo(() => {
    // Early validation of rows having list type details
    if (!rows.every((r) => r?.auditResult?.details?.type === 'list')) {
      return null;
    }

    // Transform and group items in a single pass
    const groupedItems: TableDataItem[][] = [];

    for (const row of rows) {
      const details = row?.auditResult?.details as AuditDetailList;
      const items = details?.items;

      if (!items?.length) continue;

      items.forEach((item, index) => {
        groupedItems[index] = groupedItems[index] || [];
        groupedItems[index].push({
          ...row,
          auditResult: {
            ...row.auditResult,
            details: {
              ...details,
              ...item,
            },
          },
        });
      });
    }

    return groupedItems;
  }, [rows]);
  if (!items) return null;

  return (
    <div>
      {items.map((item, index: number) => (
        <RenderDetails key={index} items={item} />
      ))}
    </div>
  );
}
