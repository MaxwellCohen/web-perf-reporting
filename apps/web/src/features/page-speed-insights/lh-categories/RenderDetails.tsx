import { Timeline } from "@/features/page-speed-insights/Timeline";
import {
  AuditDetailFilmstrip,
  AuditDetailList,
  CriticalRequestChain,
  TreeMapData,
} from "@/lib/schema";
import { RenderChecklist } from "@/features/page-speed-insights/lh-categories/RenderChecklist";
import { DetailTable } from "@/features/page-speed-insights/lh-categories/table/RenderTable";
import { RenderDebugData } from "@/features/page-speed-insights/lh-categories/RenderDebugdata";
import { RenderCriticalChainData } from "@/features/page-speed-insights/lh-categories/table/RenderCriticalChain";
import { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { JSUsageAccordion } from "@/features/page-speed-insights/JSUsage/JSUsageSection";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { RenderNetworkDependencyTree } from "@/features/page-speed-insights/lh-categories/table/RenderNetworkDependencyTree";

function isDetailTableItem(item: TableDataItem): item is TableDataItem & DetailTableItem {
  const type = item?.auditResult?.details?.type;
  return type === "table" || type === "opportunity";
}

export function RenderDetails({ items }: { items: TableDataItem[] }) {
  const details = items.map((a) => a?.auditResult.details);
  const types = [...new Set(details.map((a) => a?.type).filter(Boolean))];
  const detailType = types[0];
  if (types.length !== 1 || !detailType) {
    return null;
  }
  const auditData = items.map((a) => a?.auditResult);
  const labels = items.map((a) => a?._userLabel);
  const title = auditData.find((a) => a?.title)?.title || "";

  switch (detailType) {
    case "filmstrip":
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
    case "list":
      return <RenderList rows={items} />;
    case "checklist":
      return <RenderChecklist items={items} />;
    case "table":
    case "opportunity":
      return <DetailTable rows={items.filter(isDetailTableItem)} title={title} />;
    case "criticalrequestchain":
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
    case "screenshot":
      return null;
    case "debugdata":
      return <RenderDebugData items={items} />;
    case "treemap-data":
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

/** Lighthouse "list-section" entries carry their payload in `value`; the schema doesn't model it. */
function isNetworkTreeSection(item: unknown): boolean {
  if (typeof item !== "object" || item === null || !("value" in item)) return false;
  const { value } = item;
  return (
    typeof value === "object" && value !== null && "type" in value && value.type === "network-tree"
  );
}

function RenderList({ rows }: { rows: TableDataItem[] }) {
  // const auditData = rows.map((a) => a?.auditResult);
  if (!rows.every((r) => r?.auditResult?.details?.type === "list")) {
    return null;
  }

  const hasNetworkTree = rows.some((row) => {
    const details = row?.auditResult?.details as AuditDetailList;
    const listItems = details?.items;
    return listItems?.some(isNetworkTreeSection);
  });

  if (hasNetworkTree) {
    return <RenderNetworkDependencyTree />;
  }

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

  return (
    <div>
      {groupedItems.map((item, index: number) => (
        <RenderDetails key={index} items={item} />
      ))}
    </div>
  );
}
