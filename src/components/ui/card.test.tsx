import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

describe('Card', () => {
  it('renders all card sections with their expected content', () => {
    render(
      <Card data-testid="card-root">
        <CardHeader>
          <CardTitle>Performance Report</CardTitle>
          <CardDescription>Summary for the latest run</CardDescription>
        </CardHeader>
        <CardContent>Main content</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>,
    );

    expect(screen.getByTestId('card-root')).toHaveClass('rounded-xl');
    expect(screen.getByText('Performance Report')).toHaveClass(
      'tracking-tight',
    );
    expect(screen.getByText('Summary for the latest run')).toHaveClass(
      'text-muted-foreground',
    );
    expect(screen.getByText('Main content')).toHaveClass('pt-0');
    expect(screen.getByText('Footer actions')).toHaveClass('items-center');
  });
});
