import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../components/Sidebar';
import { ThemeProvider } from '../ThemeContext';

const categories = [
  { name: 'Crise', count: 5 },
  { name: 'Eventos', count: 3 },
];

const fileTypes = [
  { extension: '.pdf', count: 10 },
  { extension: '.docx', count: 4 },
];

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  return render(
    <ThemeProvider>
      <Sidebar
        categories={categories}
        fileTypes={fileTypes}
        selectedCategory={null}
        selectedType={null}
        onSelectCategory={vi.fn()}
        onSelectType={vi.fn()}
        onClear={vi.fn()}
        {...props}
      />
    </ThemeProvider>
  );
}

describe('Sidebar', () => {
  it('renders categories section', () => {
    renderSidebar();
    expect(screen.getByText('Categorias')).toBeDefined();
    expect(screen.getByText('Crise')).toBeDefined();
    expect(screen.getByText('Eventos')).toBeDefined();
  });

  it('renders file types section', () => {
    renderSidebar();
    expect(screen.getByText('Tipos de Arquivo')).toBeDefined();
    expect(screen.getByText('.pdf')).toBeDefined();
    expect(screen.getByText('.docx')).toBeDefined();
  });

  it('does not show clear button when no filter active', () => {
    renderSidebar();
    expect(screen.queryByText('Limpar filtros')).toBeNull();
  });

  it('shows clear button when filter is active', () => {
    renderSidebar({ selectedCategory: 'Crise' });
    expect(screen.getByRole('button', { name: /limpar filtros/i })).toBeDefined();
  });

  it('calls onSelectCategory when category clicked', () => {
    const onSelectCategory = vi.fn();
    renderSidebar({ onSelectCategory });
    fireEvent.click(screen.getByText('Crise'));
    expect(onSelectCategory).toHaveBeenCalledWith('Crise');
  });

  it('calls onSelectType when file type clicked', () => {
    const onSelectType = vi.fn();
    renderSidebar({ onSelectType });
    fireEvent.click(screen.getByText('.pdf'));
    expect(onSelectType).toHaveBeenCalledWith('.pdf');
  });

  it('calls onClear when clear button clicked', () => {
    const onClear = vi.fn();
    renderSidebar({ selectedCategory: 'Crise', onClear });
    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
