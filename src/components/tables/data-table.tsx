'use client';

// Generic table. Columns render from a typed config; optional row click.
// On finance mobile layouts, `data-label` drives the card-stack presentation.

import type { ReactNode } from 'react';
import { useT } from '@/features/i18n/locale-context';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Accessible/mobile label when `header` is not a plain string. */
  label?: string;
  render: (row: T) => ReactNode;
  width?: string;
  className?: string;
}

function resolveColumnLabel(column: Column<unknown>): string {
  if (typeof column.label === 'string' && column.label.trim()) return column.label.trim();
  if (typeof column.header === 'string') return column.header;
  return '';
}

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  rowKey,
  stickyHeader = false,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string | number;
  stickyHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        'table-wrap',
        'card',
        stickyHeader ? 'table-wrap--sticky-head' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ padding: 0 }}
    >
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
              {columns.map((c) => {
                const dataLabel = resolveColumnLabel(c as Column<unknown>);
                return (
                  <td
                    key={c.key}
                    className={c.className}
                    {...(dataLabel ? { 'data-label': dataLabel } : {})}
                  >
                    {c.render(row)}
                  </td>
                );
              })}
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
