'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/primitives';

export function Student360MetricGrid({
  items,
}: {
  items: { key: string; label: string; value: ReactNode }[];
}) {
  return (
    <div className="student-360-metric-grid">
      {items.map((item) => (
        <Card key={item.key} className="student-360-metric-card">
          <span className="student-360-metric-card__value">{item.value}</span>
          <span className="student-360-metric-card__label">{item.label}</span>
        </Card>
      ))}
    </div>
  );
}
