'use client';

import type { ReactNode } from 'react';

export function Student360FieldGrid({
  items,
  columns = 3,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 2 | 3;
}) {
  return (
    <dl className={`student-360-fields student-360-fields--cols-${columns}`}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="student-360-field">
          <dt className="student-360-field__label">{item.label}</dt>
          <dd className="student-360-field__value">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
