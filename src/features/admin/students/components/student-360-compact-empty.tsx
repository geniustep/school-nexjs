'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/primitives';

export function Student360CompactEmpty({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`student-360-compact-empty${className ? ` ${className}` : ''}`}>
      <p className="student-360-compact-empty__title">{title}</p>
      {description ? <p className="student-360-compact-empty__desc">{description}</p> : null}
      {action ? <div className="student-360-compact-empty__action">{action}</div> : null}
    </Card>
  );
}
