'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/primitives';
import type { StatTone } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';

export function Student360MetricGrid({
  items,
  className,
  variant = 'default',
}: {
  items: { key: string; label: string; value: ReactNode; tone?: StatTone }[];
  className?: string;
  variant?: 'default' | 'docs' | 'finance';
}) {
  return (
    <div
      className={cn(
        'student-360-metric-grid',
        variant === 'docs' && 'student-360-metric-grid--docs',
        variant === 'finance' && 'student-360-metric-grid--finance',
        className,
      )}
    >
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
