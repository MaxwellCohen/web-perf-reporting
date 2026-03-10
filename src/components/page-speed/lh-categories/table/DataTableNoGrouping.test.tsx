
import { fireEvent, render } from '@testing-library/react';
import { createColumnHelper } from '@tanstack/react-table';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Accordion } from '@/components/ui/accordion';
import { DataTableNoGrouping } from '@/components/page-speed/lh-categories/table/DataTableNoGrouping';

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
}));

vi.mock('@/components/ui/accordion', () => {
  const ItemValueContext = React.createContext<string>('');
  const AccordionContext = React.createContext<{ value: string[]; onValueChange: (v: string[]) => void; type: string }>({ value: [], onValueChange: () => {}, type: 'single' });
  const AccordionRoot = ({ children, type = 'single', defaultValue }: { children?: React.ReactNode; type?: string; defaultValue?: string | string[] }) => {
    const [val, setVal] = React.useState<string[]>(() => (Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []));
    return (
      <AccordionContext.Provider value={{ value: val, onValueChange: setVal, type }}>
        <div>{children}</div>
      </AccordionContext.Provider>
    );
  };
  const AccordionItem = ({ children, value: v }: { children?: React.ReactNode; value: string }) => (
    <ItemValueContext.Provider value={v}><div>{children}</div></ItemValueContext.Provider>
  );
  const AccordionTrigger = ({ children }: { children?: React.ReactNode }) => {
    const ctx = React.useContext(AccordionContext);
    const v = React.useContext(ItemValueContext);
    return (
      <button type="button" onClick={() => ctx.onValueChange(ctx.value.includes(v) ? [] : [v])}>{children}</button>
    );
  };
  const AccordionContent = ({ children }: { children?: React.ReactNode }) => {
    const ctx = React.useContext(AccordionContext);
    const v = React.useContext(ItemValueContext);
    return ctx.value.includes(v) ? <div>{children}</div> : null;
  };
  return { Accordion: AccordionRoot, AccordionItem, AccordionTrigger, AccordionContent };
});

vi.mock('@/components/page-speed/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: ({ table }: { table: { getHeaderGroups: () => Array<{ id: string; headers: Array<{ id: string; column: { columnDef: { header: unknown } } }> }> } }) => (
    <thead>
      {table.getHeaderGroups().map((hg) => (
        <tr key={hg.id}>
          {hg.headers.map((h) => (
            <th key={h.id}>
              {typeof h.column.columnDef.header === 'string' ? h.column.columnDef.header : h.id}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableBody', () => ({
  DataTableBody: ({ table }: { table: { getRowModel: () => { rows: Array<{ id: string; getVisibleCells: () => Array<{ id: string; getValue: () => unknown }> }> } } }) => (
    <tbody>
      {table.getRowModel().rows.map((row) => (
        <tr key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id}>{String(cell.getValue())}</td>
          ))}
        </tr>
      ))}
    </tbody>
  ),
}));

type Row = { id: string; name: string };

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('name', { header: 'Name' }),
];

function wrapInAccordion(children: React.ReactNode) {
  return <Accordion type="single" collapsible>{children}</Accordion>;
}

describe('DataTableNoGrouping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders accordion with title', () => {
    const { container } = render(
      wrapInAccordion(
        <DataTableNoGrouping
          data={[]}
          columns={columns}
          title="test-section"
        />,
      ),
    );
    expect(container.textContent).toContain('Test-section');
  });

  it('renders table with header and body when data provided', () => {
    const data: Row[] = [{ id: '1', name: 'Alpha' }];
    const { container } = render(
      wrapInAccordion(
        <DataTableNoGrouping data={data} columns={columns} title="My Table" />,
      ),
    );
    const trigger = Array.from(container.querySelectorAll('button')).find(
      (b) => /my table/i.test(b.textContent ?? ''),
    );
    fireEvent.click(trigger!);
    expect(container.textContent).toContain('ID');
    expect(container.textContent).toContain('Alpha');
  });

  it('uses toTitleCase for trigger label', () => {
    const { container } = render(
      wrapInAccordion(
        <DataTableNoGrouping
          data={[{ id: 'a', name: 'b' }]}
          columns={columns}
          title="my_section"
        />,
      ),
    );
    expect(container.textContent).toContain('My_section');
  });
});
