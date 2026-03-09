import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SortingButton } from '@/components/page-speed/lh-categories/table/sortingButton';
import type { Header } from '@tanstack/react-table';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, title, type, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button type={type ?? 'button'} onClick={onClick} title={title} {...props}>
      {children}
    </button>
  ),
}));

function createMockHeader(overrides: Partial<{
  getCanSort: () => boolean;
  getToggleSortingHandler: () => () => void;
  getIsSorted: () => false | 'asc' | 'desc';
  getNextSortingOrder: () => 'asc' | 'desc' | false;
}> = {}): Header<unknown, unknown> {
  return {
    column: {
      id: 'col1',
      getCanSort: () => overrides.getCanSort?.() ?? true,
      getToggleSortingHandler: () => overrides.getToggleSortingHandler?.() ?? (() => {}),
      getIsSorted: () => overrides.getIsSorted?.() ?? false,
      getNextSortingOrder: () => overrides.getNextSortingOrder?.() ?? 'asc',
    },
  } as unknown as Header<unknown, unknown>;
}

describe('SortingButton', () => {
  it('returns null when column cannot sort', () => {
    const header = createMockHeader({ getCanSort: () => false });
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders button when column can sort', () => {
    const header = createMockHeader();
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows unsorted icon when not sorted', () => {
    const header = createMockHeader({ getIsSorted: () => false });
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows ascending icon when sorted asc', () => {
    const header = createMockHeader({ getIsSorted: () => 'asc' });
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows descending icon when sorted desc', () => {
    const header = createMockHeader({ getIsSorted: () => 'desc' });
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('calls toggle handler on click', () => {
    const toggle = vi.fn();
    const header = createMockHeader({ getToggleSortingHandler: () => toggle });
    const { container } = render(<SortingButton header={header} />);
    fireEvent.click(container.querySelector('button')!);
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('sets title to Sort ascending when next order is asc', () => {
    const header = createMockHeader({ getNextSortingOrder: () => 'asc' });
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('sets title to Sort descending when next order is desc', () => {
    const header = createMockHeader({ getNextSortingOrder: () => 'desc' });
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('sets title to Clear sort when next order is false', () => {
    const header = createMockHeader({ getNextSortingOrder: () => false });
    const { container } = render(<SortingButton header={header} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
