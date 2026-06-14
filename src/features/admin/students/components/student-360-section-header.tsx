'use client';

import type { ReactNode } from 'react';

export function Student360SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="student-360-section-header">
      <div className="student-360-section-header__text">
        <h2 className="student-360-section-header__title">{title}</h2>
        {description ? (
          <p className="student-360-section-header__desc">{description}</p>
        ) : null}
      </div>
      {action ? <div className="student-360-section-header__actions">{action}</div> : null}
    </header>
  );
}
