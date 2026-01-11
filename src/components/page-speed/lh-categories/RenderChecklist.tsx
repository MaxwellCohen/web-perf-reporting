import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AuditDetailChecklist } from '@/lib/schema';
import { renderBoolean } from '@/components/page-speed/lh-categories/renderBoolean';
import { Details } from '@/components/ui/accordion';
import { TableDataItem } from '@/components/page-speed/tsTable/TableDataItem';
import { useMemo } from 'react';

export function RenderChecklist({
  items,
  title,
}: {
  items: TableDataItem[];
  title: string;
}) {
  const auditItems = useMemo(
    () =>
      items.map(
        (a) => (a?.auditResult.details as AuditDetailChecklist)?.items || {},
      ),
    [items],
  );

  const keys = useMemo(
    () => Object.keys(auditItems.reduce((acc, a) => ({ ...acc, ...a }), {})),
    [auditItems],
  );

  return (
    <Details>
      <summary className="flex flex-col gap-2">
        <h4 className="text-md font-bold">{title} Audit Checklist Items</h4>
      </summary>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Checklist Item</TableHead>
            {items.map((a, i) => {
              const label = a?._userLabel || '';
              return <TableHead key={`${label}_${i}`}>{label}</TableHead>;
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map((key) => {
            const items = auditItems.map((a) => a[key]);

            return (
              <TableRow key={key}>
                <TableCell>{items.find((a) => a?.label)?.label || ''}</TableCell>
                {items.map((a, i) => {
                  return (
                    <TableCell key={`${a}_${i}`}>
                      {a ? renderBoolean(a.value) : null}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Details>
  );
}
