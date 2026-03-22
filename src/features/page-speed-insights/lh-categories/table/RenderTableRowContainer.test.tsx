import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  RenderTableRowContainer,
  renderTableRowContainerCss,
} from '@/features/page-speed-insights/lh-categories/table/RenderTableRowContainer';

describe('RenderTableRowContainer', () => {
  it('renders children', () => {
    const { container } = render(
      <RenderTableRowContainer>
        <span>Row content</span>
      </RenderTableRowContainer>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('applies base grid and border styles', () => {
    const { container } = render(
      <RenderTableRowContainer>
        <span>Child</span>
      </RenderTableRowContainer>,
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('grid');
    expect(div.className).toContain('border-b-2');
    expect(renderTableRowContainerCss).toContain('grid');
  });

  it('merges custom className', () => {
    const { container } = render(
      <RenderTableRowContainer className="my-class">
        <span>Child</span>
      </RenderTableRowContainer>,
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('my-class');
  });
});
