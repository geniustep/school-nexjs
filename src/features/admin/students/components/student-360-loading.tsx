'use client';

import { useT } from '@/features/i18n/locale-context';

function SkeletonBar({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return (
    <span
      className="student-360-skeleton-bar"
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function StudentInlineLoading({ label }: { label?: string }) {
  const t = useT();
  return (
    <p className="student-360-inline-loading" role="status">
      {label ?? t('admin.student360.loading.refreshing')}
    </p>
  );
}

export function StudentSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="student-360-section-skeleton" aria-hidden="true">
      <SkeletonBar width="40%" height={18} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} width={`${88 - i * 8}%`} />
      ))}
    </div>
  );
}

export function StudentAgreementSkeleton() {
  const t = useT();
  return (
    <div
      className="student-360-agreement-skeleton student-360-tab-content-skeleton"
      aria-busy="true"
      aria-label={t('common.loading')}
    >
      <div className="student-360-agreement-skeleton__toolbar">
        <SkeletonBar width={180} height={36} />
        <SkeletonBar width={120} height={32} />
      </div>
      <StudentSectionSkeleton rows={4} />
      <div className="student-360-agreement-skeleton__metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="student-360-agreement-skeleton__metric">
            <SkeletonBar width="60%" height={22} />
            <SkeletonBar width="80%" height={12} />
          </div>
        ))}
      </div>
      <StudentSectionSkeleton rows={3} />
    </div>
  );
}

export function StudentFinanceSkeleton() {
  const t = useT();
  return (
    <div
      className="student-360-finance-skeleton student-360-tab-content-skeleton"
      aria-busy="true"
      aria-label={t('common.loading')}
    >
      <div className="student-360-agreement-skeleton__toolbar">
        <SkeletonBar width={180} height={36} />
        <SkeletonBar width={140} height={32} />
      </div>
      <div className="student-360-agreement-skeleton__metrics">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="student-360-agreement-skeleton__metric">
            <SkeletonBar width="55%" height={20} />
            <SkeletonBar width="70%" height={11} />
          </div>
        ))}
      </div>
      <StudentSectionSkeleton rows={5} />
    </div>
  );
}

export function StudentYearSelectSkeleton() {
  const t = useT();
  return (
    <label className="student-finance-year-select student-finance-year-select--loading">
      <span className="tiny muted">{t('admin.student360.finance.academicYear')}</span>
      <SkeletonBar width={180} height={36} />
    </label>
  );
}
