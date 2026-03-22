import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NoResultsRow } from '@/features/page-speed-insights/JSUsage/NoResultsRow';

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children, className, ...props }: { children: React.ReactNode; className?: string }) => (
    <tr className={className} {...props}>{children}</tr>
  ),
  TableCell: ({ children, className, ...props }: { children: React.ReactNode; className?: string }) => (
    <td className={className} {...props}>{children}</td>
  ),
}));

describe('NoResultsRow', () => {
  it('renders the no-results cell', () => {
    const { container } = render(
      <table>
        <tbody>
          <NoResultsRow />
        </tbody>
      </table>,
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
