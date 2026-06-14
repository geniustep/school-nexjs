'use client';

import type { ReactNode } from 'react';

export function Student360TabHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="student-360-tab-header">
      <div className="student-360-tab-header__text">
        <h2 className="student-360-tab-header__title">{title}</h2>
        {description ? <p className="student-360-tab-header__desc">{description}</p> : null}
      </div>
      {action ? <div className="student-360-tab-header__action">{action}</div> : null}
    </header>
  );
}
