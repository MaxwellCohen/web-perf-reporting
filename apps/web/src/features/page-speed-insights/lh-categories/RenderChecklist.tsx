"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableWithCopyToolbar } from "@/features/page-speed-insights/tanstack-table-v9/TableWithCopyToolbar";
import { AuditDetailChecklist } from "@/lib/schema";
import { renderBoolean } from "@/features/page-speed-insights/lh-categories/renderBoolean";
import { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";

export function RenderChecklist({
  items,
}: {
  items: TableDataItem[];
}) {
  const auditItems = items.map(
    (a) => (a?.auditResult.details as AuditDetailChecklist)?.items || {},
  );

  const keys = Object.keys(auditItems.reduce((acc, a) => ({ ...acc, ...a }), {}));

  return (
    <TableWithCopyToolbar>
      {({ tableRef }) => (
        <Table ref={tableRef}>
          <TableHeader>
            <TableRow>
              <TableHead>Checklist Item</TableHead>
              {items.map((a, i) => {
                const label = a?._userLabel || "";
                return <TableHead key={`${label}_${i}`}>{label}</TableHead>;
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => {
              const cells = auditItems.map((a) => a[key]);

              return (
                <TableRow key={key}>
                  <TableCell>{cells.find((a) => a?.label)?.label || ""}</TableCell>
                  {cells.map((a, i) => {
                    return (
                      <TableCell key={`${a}_${i}`}>{a ? renderBoolean(a.value) : null}</TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </TableWithCopyToolbar>
  );
}
