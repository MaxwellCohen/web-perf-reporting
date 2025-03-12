import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuditDetailChecklistSchema, AuditResultsRecord } from "@/lib/schema";
import { renderBoolean } from "./renderBoolean";

export function RenderChecklist({
    desktopAuditData,
    mobileAuditData,
  }: {
    desktopAuditData: AuditResultsRecord[string];
    mobileAuditData: AuditResultsRecord[string];
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
                  {mobileItem ? renderBoolean(mobileItem.value): null}{' '}
                </TableCell>
                <TableCell>
                  {desktopItem ?  renderBoolean(desktopItem.value) : null}{' '}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

