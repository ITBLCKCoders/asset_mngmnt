import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/dataTable';

interface TestItem {
  id: string;
  name: string;
}

const columns: ColumnDef<TestItem>[] = [
  { id: 'id', header: 'ID', accessorKey: 'id' },
  { id: 'name', header: 'Name', accessorKey: 'name' },
];

const data: TestItem[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
];

describe('DataTable', () => {
  it('should render with title', () => {
    render(<DataTable data={data} columns={columns} title="Test Table" />);
    expect(screen.getByText('Test Table')).toBeDefined();
  });

  it('should render title badge text', () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        title="Assets"
        titleBadge="2 items"
      />
    );
    expect(screen.getByText('2 items')).toBeDefined();
  });

  it('should render custom empty state when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        emptyState={<div>Custom Empty State</div>}
      />
    );
    expect(screen.getByText('Custom Empty State')).toBeDefined();
  });

  it('should render default empty state when no data', () => {
    render(<DataTable data={[]} columns={columns} />);
    expect(screen.getByText('No records found')).toBeDefined();
  });

  it('should render loading skeleton when isLoading is true', () => {
    const { container } = render(
      <DataTable data={data} columns={columns} isLoading />
    );
    const shimmerElements = container.querySelectorAll('.animate-shimmer');
    expect(shimmerElements.length).toBeGreaterThanOrEqual(5);
  });

  it('should render search input by default', () => {
    render(<DataTable data={data} columns={columns} />);
    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toBeDefined();
  });

  it('should not render search input when showSearch is false', () => {
    render(<DataTable data={data} columns={columns} showSearch={false} />);
    expect(screen.queryByPlaceholderText('Search...')).toBeNull();
  });

  it('should render custom search placeholder', () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Find items..."
      />
    );
    expect(screen.getByPlaceholderText('Find items...')).toBeDefined();
  });

  it('should render pagination footer with correct counts', () => {
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText(/Showing/)).toBeDefined();
  });

  it('should render children in the controls area', () => {
    render(
      <DataTable data={data} columns={columns}>
        <button>Custom Button</button>
      </DataTable>
    );
    expect(screen.getByText('Custom Button')).toBeDefined();
  });
});
