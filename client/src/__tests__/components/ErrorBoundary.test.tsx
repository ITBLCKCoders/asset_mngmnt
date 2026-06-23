import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const MockChild = () => <div data-testid="child">OK</div>;
const ThrowingChild = () => { throw new Error('Test crash'); };

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <MockChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('should catch error and show fallback UI', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeDefined();
    expect(screen.getByText(/Try Again/i)).toBeDefined();
    (console.error as any).mockRestore();
  });
});
