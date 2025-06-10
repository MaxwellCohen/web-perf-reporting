import { Button } from '@/components/ui/button';
import { Header } from '@tanstack/react-table';

const IconMap: Record<string, string> = {
  asc: '↑',
  desc: '↓',
};

export function SortingButton<T>({ header }: { header: Header<T, unknown> }) {
  if (!header.column.getCanSort()) {
    return null;
  }
  return (
    <Button
      type="button"
      variant={'ghost'}
      size={'icon'}
      onClick={header.column.getToggleSortingHandler()}
      title={
        header.column.getNextSortingOrder() === 'asc'
          ? 'Sort ascending'
          : header.column.getNextSortingOrder() === 'desc'
            ? 'Sort descending'
            : 'Clear sort'
      }
    >
      {IconMap[header.column.getIsSorted() as string] ?? '〰︎'}
    </Button>
  );
}
