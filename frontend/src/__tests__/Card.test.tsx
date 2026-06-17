import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../components/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>conteudo</p></Card>);
    expect(screen.getByText('conteudo')).toBeDefined();
  });

  it('applies default md size class', () => {
    const { container } = render(<Card>test</Card>);
    expect((container.firstChild as HTMLElement)?.className).toContain('card');
  });

  it('applies sm size class', () => {
    const { container } = render(<Card size="sm">test</Card>);
    expect((container.firstChild as HTMLElement)?.className).toContain('card-sm');
  });

  it('applies lg size class', () => {
    const { container } = render(<Card size="lg">test</Card>);
    expect((container.firstChild as HTMLElement)?.className).toContain('card-lg');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="custom">test</Card>);
    expect((container.firstChild as HTMLElement)?.className).toContain('custom');
  });

  it('forwards HTML div props', () => {
    render(<Card data-testid="card-test" aria-label="card">test</Card>);
    expect(screen.getByTestId('card-test')).toBeDefined();
  });
});
