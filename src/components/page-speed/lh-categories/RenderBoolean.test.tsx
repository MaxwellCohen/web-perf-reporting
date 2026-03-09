import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderBoolean } from '@/components/page-speed/lh-categories/renderBoolean';

describe('renderBoolean', () => {
  it('renders the true state', () => {
    render(renderBoolean(true));

    expect(screen.getByTitle('true')).toHaveTextContent('Yes');
  });

  it('renders the false state', () => {
    render(renderBoolean(false));

    expect(screen.getByTitle('false')).toHaveTextContent('No');
  });
});
