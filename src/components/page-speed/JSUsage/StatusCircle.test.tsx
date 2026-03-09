import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusCircle } from '@/components/page-speed/JSUsage/StatusCircle';

describe('StatusCircle', () => {
  it('renders gray circle when unusedBytes is not reported', () => {
    const { container } = render(
      <StatusCircle node={{ resourceBytes: 1000 } as any} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders green circle when unused percent is low (<= 25%)', () => {
    const { container } = render(
      <StatusCircle
        node={{ resourceBytes: 100, unusedBytes: 20 } as any}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders yellow circle when unused percent is between 25% and 90%', () => {
    const { container } = render(
      <StatusCircle
        node={{ resourceBytes: 100, unusedBytes: 50 } as any}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders red circle when unused percent is over 90%', () => {
    const { container } = render(
      <StatusCircle
        node={{ resourceBytes: 100, unusedBytes: 95 } as any}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('uses resourceBytes default of 1 when not provided to avoid division by zero', () => {
    const { container } = render(
      <StatusCircle node={{ unusedBytes: 1 } as any} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
