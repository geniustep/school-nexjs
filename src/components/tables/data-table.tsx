'use client';

// Generic table. Columns render from a typed config; optional row click.

import type { ReactNode } from 'react';
import { useT } from '@/features/i18n/locale-context';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  rowKey,
  stickyHeader = false,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
  stickyHeader?: boolean;
}) {
  return (
    <div className={`table-wrap card${stickyHeader ? ' table-wrap--sticky-head' : ''}`} style={{ padding: 0 }}>
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={c.className}
              >
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
                <td key={c.key} className={c.className}>
                  {c.render(row)}
                </td>
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
  const t = useT();
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  if (totalPages <= 1) {
    return (
      <div className="pagination">
        <span>{t('common.pagination.totalRecords', { total })}</span>
      </div>
    );
  }
  return (
    <div className="pagination">
      <span>
        {t('common.pagination.range', { from, to, total })}
      </span>
      <button
        className="btn btn--ghost btn--sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t('common.pagination.previous')}
      </button>
      <button
        className="btn btn--ghost btn--sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t('common.pagination.next')}
      </button>
    </div>
  );
}
