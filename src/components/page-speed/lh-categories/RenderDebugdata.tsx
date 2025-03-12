import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DebugData } from '@/lib/schema';

export function RenderDebugData({
  mobileDebugData,
  desktopDebugData,
}: {
  mobileDebugData?: DebugData;
  desktopDebugData?: DebugData;
}) {
    if (!mobileDebugData && !desktopDebugData) {
    return null;
  }
  if (mobileDebugData?.items.length === 0 && desktopDebugData?.items.length === 0) {
    return null;
  }
  const mobileItems = (mobileDebugData?.items || []).reduce((acc: Record<string, unknown>, i: Record<string, unknown>) => ({...acc, ...i}), {});
  const desktopItems = (desktopDebugData?.items || []).reduce((acc: Record<string, unknown>, i: Record<string, unknown>) => ({...acc, ...i}), {});

  const keys = [
    ...new Set([
      ...Object.keys(mobileItems),
      ...Object.keys(desktopItems),
    ]),
  ].filter((k) => k !== 'type');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          {mobileDebugData?.items.length ? <TableHead>Mobile Value</TableHead> : null}
          {desktopDebugData?.items.length ? <TableHead>Desktop Value </TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key, i) => {
          return (
            <TableRow key={`${i}-${key}`}>
              <TableCell rowSpan={1}> {camelCaseToSentenceCase(key)} </TableCell>
              {mobileDebugData?.items.length ? (
                <TableCell rowSpan={1}>
                  {mobileItems?.[key] !== undefined
                    ? `${mobileItems?.[key]}`
                    : ''}
                </TableCell>
              ) : null}
              {desktopDebugData?.items.length ? (
                <TableCell rowSpan={1}>
                  {desktopItems?.[key] !== undefined
                    ? `${desktopItems?.[key]}`
                    : ''}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}


function camelCaseToSentenceCase(str: string) {
  if (!str) {
    return "";
  }
  const result = str.split(/(?=[A-Z])/).join(' ').toLowerCase();
  return result.charAt(0).toUpperCase() + result.slice(1);
}