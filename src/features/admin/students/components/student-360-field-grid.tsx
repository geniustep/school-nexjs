'use client';

import type { ReactNode } from 'react';

function isEmptyDisplayValue(value: ReactNode): boolean {
  if (value == null || value === false) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' || trimmed === '—' || trimmed === '-';
  }
  return false;
}

export function Student360FieldGrid({
  items,
  columns = 3,
  compact = false,
  hideEmpty = false,
  emptyMessage,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2 | 3;
  compact?: boolean;
  hideEmpty?: boolean;
  emptyMessage?: string;
}) {
  const visible = hideEmpty ? items.filter((item) => !isEmptyDisplayValue(item.value)) : items;

  if (visible.length === 0) {
    return emptyMessage ? <p className="student-360-field-grid__empty">{emptyMessage}</p> : null;
  }

  return (
    <dl
      className={[
        'student-360-fields',
        `student-360-fields--cols-${columns}`,
        compact ? 'student-360-fields--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {visible.map((item, index) => {
        const empty = isEmptyDisplayValue(item.value);
        return (
          <div key={`${item.label}-${index}`} className="student-360-field">
            <dt className="student-360-field__label">{item.label}</dt>
            <dd
              className={[
                'student-360-field__value',
                empty ? 'student-360-field__value--empty' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.value ?? '—'}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
