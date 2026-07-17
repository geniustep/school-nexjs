// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable, Pagination } from '@/components/tables/data-table';
import { LocaleProvider } from '@/features/i18n/locale-context';

afterEach(() => {
  cleanup();
});

type Row = { id: number; name: string };

const rows: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];

describe('DataTable (f04ca46 label / className contract)', () => {
  it('keeps legacy columns without label working (no data-label)', () => {
    render(
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => row.name,
          },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />,
    );

    const cell = screen.getByText('Alpha').closest('td');
    expect(cell).toBeTruthy();
    expect(cell?.getAttribute('data-label')).toBe('Name');
  });

  it('uses explicit label for data-label when header is not a plain string', () => {
    render(
      <DataTable
        columns={[
          {
            key: 'name',
            header: <span>Name node</span>,
            label: 'Display name',
            render: (row) => row.name,
          },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />,
    );

    const cell = screen.getByText('Alpha').closest('td');
    expect(cell?.getAttribute('data-label')).toBe('Display name');
  });

  it('applies optional className on wrap, th, and td without dropping base classes', () => {
    const { container } = render(
      <DataTable
        className="finance-table"
        columns={[
          {
            key: 'name',
            header: 'Name',
            className: 'col-name',
            render: (row) => row.name,
          },
        ]}
        rows={rows}
        rowKey={(row) => row.id}
      />,
    );

    const wrap = container.querySelector('.table-wrap.card.finance-table');
    expect(wrap).toBeTruthy();
    expect(container.querySelector('th.col-name')).toBeTruthy();
    expect(container.querySelector('td.col-name')).toBeTruthy();
  });

  it('keeps stable rowKey and basic row click behavior', () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => row.name,
          },
        ]}
        rows={rows}
        rowKey={(row) => `row-${row.id}`}
        onRowClick={onRowClick}
      />,
    );

    const tr = container.querySelector('tbody tr');
    expect(tr?.className).toContain('row-link');
    fireEvent.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]?.[0]).toEqual(rows[0]);
  });

  it('renders empty body when rows is empty (empty state host remains usable)', () => {
    const emptyRows: Row[] = [];
    const { container } = render(
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => row.name,
          },
        ]}
        rows={emptyRows}
        rowKey={(row) => row.id}
      />,
    );

    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(container.querySelector('table.data')).toBeTruthy();
  });
});

describe('Pagination (regression)', () => {
  it('does not change single-page pagination contract', () => {
    render(
      <LocaleProvider>
        <Pagination page={1} totalPages={1} total={3} onPage={() => undefined} />
      </LocaleProvider>,
    );

    expect(screen.getByText(/3/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps multi-page controls', () => {
    const onPage = vi.fn();
    render(
      <LocaleProvider>
        <Pagination page={2} totalPages={3} total={45} pageSize={20} onPage={onPage} />
      </LocaleProvider>,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[1]!);
    expect(onPage).toHaveBeenCalledWith(3);
  });
});
