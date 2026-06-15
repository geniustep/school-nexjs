'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { canCollectPayments } from '@/lib/permissions/finance';
import { useFinanceJournalsAvailable } from '@/features/admin/finance/use-finance-lookups';
import type { AcademicYearOption } from '@/lib/utils/academic-years';

export function FinanceHubHeader({
  currentYear,
  onRefresh,
  refreshing,
}: {
  currentYear?: AcademicYearOption | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const t = useT();
  const user = useSession();
  const { schools, activeSchoolId } = useAdminSession();
  const activeSchool = schools.find((s) => s.id === activeSchoolId);
  const { available: journalsAvailable } = useFinanceJournalsAvailable();
  const canRecord = canCollectPayments(user) && journalsAvailable;

  return (
    <header className="finance-hub-header card">
      <div className="finance-hub-header__main">
        <div className="finance-hub-header__titles">
          <h1 className="finance-hub-header__title">{t('admin.finance.hub.title')}</h1>
          <p className="finance-hub-header__desc">{t('admin.finance.hub.dashboardDescription')}</p>
        </div>
        <div className="finance-hub-header__meta">
          {activeSchool ? (
            <span className="finance-hub-header__meta-item">
              <span className="muted">{t('admin.finance.activeSchool')}</span>
              <strong>{activeSchool.name}</strong>
            </span>
          ) : null}
          {currentYear ? (
            <span className="finance-hub-header__meta-item">
              <span className="muted">{t('admin.finance.hub.currentAcademicYear')}</span>
              <strong>{currentYear.name}</strong>
            </span>
          ) : null}
        </div>
      </div>
      <div className="finance-hub-header__actions">
        {onRefresh ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? t('admin.finance.hub.refreshing') : t('admin.finance.hub.refresh')}
          </button>
        ) : null}
        {canRecord ? (
          <Link href="/admin/finance/collections/new" className="btn btn--primary btn--sm">
            {t('admin.finance.recordCollection')}
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function FinanceHubSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `finance-hub-section ${className}` : 'finance-hub-section'}>
      <div className="finance-hub-section__head">
        <h2 className="finance-hub-section__title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
