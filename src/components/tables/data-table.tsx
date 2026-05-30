'use client';

// Generic table. Columns render from a typed config; optional row click.

import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string;
}

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
}) {
  return (
    <div className="table-wrap card" style={{ padding: 0 }}>
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'row-link' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize = 20,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPage: (page: number) => void;
}) {
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  if (totalPages <= 1) {
    return (
      <div className="pagination">
        <span>{total} {total === 1 ? 'record' : 'records'}</span>
      </div>
    );
  }
  return (
    <div className="pagination">
      <span>
        Showing {from}–{to} of {total} records
      </span>
      <button
        className="btn btn--ghost btn--sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ‹ Previous
      </button>
      <button
        className="btn btn--ghost btn--sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next ›
      </button>
    </div>
  );
}
