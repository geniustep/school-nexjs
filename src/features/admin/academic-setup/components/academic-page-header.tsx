import type { ReactNode } from 'react';

export function AcademicPageHeader({
  title,
  subtitle,
  stats,
  actions,
  skeleton,
}: {
  title: string;
  subtitle?: string;
  stats?: string;
  actions?: ReactNode;
  skeleton?: boolean;
}) {
  if (skeleton) {
    return (
      <header className="academic-page-header academic-page-header--skeleton" aria-busy="true">
        <div className="academic-setup-skeleton academic-setup-skeleton--title" />
      </header>
    );
  }

  return (
    <header className="academic-page-header">
      <div className="academic-page-header__row">
        <div className="academic-page-header__main">
          <h1 className="academic-page-header__title">{title}</h1>
          {subtitle && <p className="academic-page-header__subtitle">{subtitle}</p>}
          {stats && <p className="academic-page-header__stats">{stats}</p>}
        </div>
        {actions && <div className="academic-page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
