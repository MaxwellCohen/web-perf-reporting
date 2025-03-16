import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AuditDetailChecklistSchema, AuditResultsRecord } from '@/lib/schema';
import { renderBoolean } from './renderBoolean';
import { Details } from '@/components/ui/accordion';

export function RenderChecklist({
  desktopAuditData,
  mobileAuditData,
  title,
}: {
  desktopAuditData: AuditResultsRecord[string];
  mobileAuditData: AuditResultsRecord[string];
  title: string;
}) {
  const desktopDetails = AuditDetailChecklistSchema.safeParse(
    desktopAuditData.details,
  );
  const mobileDetails = AuditDetailChecklistSchema.safeParse(
    mobileAuditData.details,
  );
  if (!desktopDetails.success || !mobileDetails.success) {
    return null;
  }
  const checklistItems = Object.keys(desktopDetails.data.items);
  const mobileChecklistItems = Object.keys(mobileDetails.data.items);
  const allKeys = [...new Set([...checklistItems, ...mobileChecklistItems])];

  return (
    <Details>
      <summary className="flex flex-col gap-2">
        <h4 className="text-md font-bold">{title} Audit Checklist Items</h4>
      </summary>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Checklist Item</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Desktop</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allKeys.map((key) => {
            const desktopItem = desktopDetails.data.items[key];
            const mobileItem = mobileDetails.data.items[key];
            const label = desktopItem?.label || mobileItem?.label || '';
            return (
              <TableRow key={key}>
                <TableCell>{label}</TableCell>
                <TableCell>
                  {mobileItem ? renderBoolean(mobileItem.value) : null}{' '}
                </TableCell>
                <TableCell>
                  {desktopItem ? renderBoolean(desktopItem.value) : null}{' '}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Details>
  );
}
