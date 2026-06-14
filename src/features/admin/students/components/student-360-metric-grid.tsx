'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/primitives';
import type { StatTone } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';

export function Student360MetricGrid({
  items,
}: {
  items: { key: string; label: string; value: ReactNode; tone?: StatTone }[];
}) {
  return (
    <div className="student-360-metric-grid">
      {items.map((item) => (
        <Card
          key={item.key}
          className={cn('student-360-metric-card', item.tone && item.tone !== 'none' && `student-360-metric-card--${item.tone}`)}
        >
          <span className="student-360-metric-card__value">{item.value}</span>
          <span className="student-360-metric-card__label">{item.label}</span>
        </Card>
      ))}
    </div>
  );
}
