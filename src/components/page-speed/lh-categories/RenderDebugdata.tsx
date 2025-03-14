import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DebugData } from '@/lib/schema';
import { renderBoolean } from './renderBoolean';
import { camelCaseToSentenceCase } from './camelCaseToSentenceCase';

export function RenderDebugData({
  mobileDebugData,
  desktopDebugData,
}: {
  mobileDebugData?: DebugData;
  desktopDebugData?: DebugData;
}) {
  const mobileItems = cleanDebugData(mobileDebugData);
  const mobileKeys = Object.keys(mobileItems);
  const desktopItems = cleanDebugData(desktopDebugData);
  const desktopKeys = Object.keys(desktopItems);

  const keys = [
    ...new Set([...mobileKeys, ...desktopKeys]),
  ].filter((k) => k !== 'type');

  if (!keys.length) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          {mobileKeys.length ? (
            <TableHead>Mobile Value</TableHead>
          ) : null}
          {desktopKeys?.length ? (
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
              {mobileKeys?.length ? (
                <TableCell rowSpan={1}>
                  {renderItem(mobileItems?.[key])}
                </TableCell>
              ) : null}
              {desktopKeys?.length ? (
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

function cleanDebugData(data: DebugData | undefined) {
  if (!data) {
    return {};
  }
  return [
    Object.fromEntries(
      Object.entries(data || {}).filter(
        (v) => !['type', 'items'].includes(v[0]),
      ),
    ),
    ...(data?.items || []),
  ].reduce(
    (acc: Record<string, unknown>, i: Record<string, unknown>) => ({
      ...acc,
      ...i,
    }),
    {},
  );
}
