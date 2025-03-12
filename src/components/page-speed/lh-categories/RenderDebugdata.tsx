import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DebugData } from '@/lib/schema';
import { renderBoolean } from "./renderBoolean";

export function RenderDebugData({
  mobileDebugData,
  desktopDebugData,
}: {
  mobileDebugData?: DebugData;
  desktopDebugData?: DebugData;
}) {
  if (
    !mobileDebugData?.items?.length  &&
    !desktopDebugData?.items?.length 
  ) {
    return null;
  }
  const mobileItems = (mobileDebugData?.items || []).reduce(
    (acc: Record<string, unknown>, i: Record<string, unknown>) => ({
      ...acc,
      ...i,
    }),
    {},
  );
  const desktopItems = (desktopDebugData?.items || []).reduce(
    (acc: Record<string, unknown>, i: Record<string, unknown>) => ({
      ...acc,
      ...i,
    }),
    {},
  );

  const keys = [
    ...new Set([...Object.keys(mobileItems), ...Object.keys(desktopItems)]),
  ].filter((k) => k !== 'type');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          {mobileDebugData?.items.length ? (
            <TableHead>Mobile Value</TableHead>
          ) : null}
          {desktopDebugData?.items.length ? (
            <TableHead>Desktop Value </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key, i) => {
          return (
            <TableRow key={`${i}-${key}`}>
              <TableCell rowSpan={1}>
                {' '}
                {camelCaseToSentenceCase(key)}{' '}
              </TableCell>
              {mobileDebugData?.items.length ? (
                <TableCell rowSpan={1}>
                  {renderItem(desktopItems?.[key])}
                </TableCell>
              ) : null}
              {desktopDebugData?.items.length ? (
                <TableCell rowSpan={1}>
                  {renderItem(desktopItems?.[key])}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function renderItem(item: unknown) {
  if (typeof item === 'string') {
    return item;
  }
  if (typeof item === 'number') {
    return item.toFixed(2);
  }
  if (typeof item === 'boolean') {
    return renderBoolean(item);
  }
  return '';
}

function camelCaseToSentenceCase(str: string) {
  if (!str) {
    return '';
  }
  const result = str
    .split(/(?=[A-Z])/)
    .join(' ')
    .toLowerCase();
  return result.charAt(0).toUpperCase() + result.slice(1);
}
