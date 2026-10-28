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
import { cn } from "@/lib/utils";
import { Details } from "@/components/ui/accordion";
import { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";

type ChecklistEntry = { label?: string; value?: boolean } | undefined;

function Chip({ entry, prefix }: { entry: ChecklistEntry; prefix?: string }) {
  if (!entry) {
    return <span className="text-xs text-muted-foreground">n/a</span>;
  }
  const pass = !!entry.value;
  return (
    <span
      data-testid="checklist-chip"
      data-pass={pass}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        pass
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      )}
    >
      <span aria-hidden>{pass ? "✓" : "✗"}</span>
      <span className="sr-only">{pass ? "Pass:" : "Fail:"}</span>
      {prefix ? <span className="font-semibold">{prefix}</span> : null}
      <span>{entry.label || ""}</span>
    </span>
  );
}

function ChecklistChips({
  keys,
  auditItems,
  labels,
}: {
  keys: string[];
  auditItems: Array<Record<string, ChecklistEntry>>;
  labels: string[];
}) {
  if (!keys.length) return null;

  if (auditItems.length <= 1) {
    return (
      <div className="mb-2 flex flex-wrap gap-2" data-testid="checklist-chips">
        {keys.map((key) => (
          <Chip key={key} entry={auditItems[0]?.[key]} />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-2 space-y-1" data-testid="checklist-chips">
      {keys.map((key) => {
        const entries = auditItems.map((a) => a[key]);
        const differs = new Set(entries.map((e) => (e ? !!e.value : "n/a"))).size > 1;
        const rowLabel = entries.find((e) => e?.label)?.label || key;
        return (
          <div
            key={key}
            data-differs={differs}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-md border px-2 py-1",
              differs && "border-amber-500/60 bg-amber-500/5",
            )}
          >
            <span className="min-w-40 text-xs text-muted-foreground">{rowLabel}</span>
            {entries.map((entry, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="text-xs font-medium">{labels[i]}</span>
                <Chip entry={entry} />
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function RenderChecklist({
  items,
  title,
  embedded = false,
}: {
  items: TableDataItem[];
  title: string;
  embedded?: boolean;
}) {
  const auditItems = items.map(
    (a) => (a?.auditResult.details as AuditDetailChecklist)?.items || {},
  );

  const keys = Object.keys(auditItems.reduce((acc, a) => ({ ...acc, ...a }), {}));

  const table = (
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

  const labels = items.map((a, i) => a?._userLabel || `Report ${i + 1}`);

  return (
    <div>
      <ChecklistChips keys={keys} auditItems={auditItems} labels={labels} />
      <Details open={false}>
        <summary className="flex flex-col gap-2">
          <h4 className="text-md font-bold">
            {embedded ? "Checklist table" : `${title} Audit Checklist Items`}
          </h4>
        </summary>
        {table}
      </Details>
    </div>
  );
}
