import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeProvider } from '../ThemeContext';

const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
};

function renderBoundary(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    renderBoundary(
      <ErrorBoundary><p>ok</p></ErrorBoundary>
    );
    expect(screen.getByText('ok')).toBeDefined();
  });

  it('renders fallback UI on error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderBoundary(
      <ErrorBoundary><ThrowError message="test error" /></ErrorBoundary>
    );
    expect(screen.getByText('Algo deu errado')).toBeDefined();
    expect(screen.getByText('test error')).toBeDefined();
    expect(screen.getByText('Tentar novamente')).toBeDefined();
    vi.restoreAllMocks();
  });

  it('renders custom fallback when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderBoundary(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowError message="err" />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom fallback')).toBeDefined();
    vi.restoreAllMocks();
  });
});
