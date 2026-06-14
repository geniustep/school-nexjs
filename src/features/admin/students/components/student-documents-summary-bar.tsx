'use client';

import { useT } from '@/features/i18n/locale-context';

export function StudentDocumentsSummaryBar({
  total,
  valid,
  expired,
  missing,
  emphasizeMissing,
}: {
  total: number;
  valid: number;
  expired: number;
  missing: number;
  emphasizeMissing?: boolean;
}) {
  const t = useT();
  const allZero = total === 0 && valid === 0 && expired === 0 && missing === 0;

  return (
    <div
      className={`student-doc-summary-bar card${emphasizeMissing && missing > 0 ? ' student-doc-summary-bar--highlight-missing' : ''}${allZero ? ' student-doc-summary-bar--zero' : ''}`}
      aria-label={t('admin.student360.documents.summaryAria')}
    >
      <div className="student-doc-summary-bar__item">
        <span className="student-doc-summary-bar__value">{total}</span>
        <span className="student-doc-summary-bar__label">{t('admin.student360.documents.summaryTotal')}</span>
      </div>
      <span className="student-doc-summary-bar__sep" aria-hidden="true">
        |
      </span>
      <div className="student-doc-summary-bar__item">
        <span className="student-doc-summary-bar__value">{valid}</span>
        <span className="student-doc-summary-bar__label">{t('admin.student360.documents.summaryValid')}</span>
      </div>
      <span className="student-doc-summary-bar__sep" aria-hidden="true">
        |
      </span>
      <div className="student-doc-summary-bar__item">
        <span className="student-doc-summary-bar__value">{expired}</span>
        <span className="student-doc-summary-bar__label">{t('admin.student360.documents.summaryExpired')}</span>
      </div>
      <span className="student-doc-summary-bar__sep" aria-hidden="true">
        |
      </span>
      <div
        className={`student-doc-summary-bar__item${missing > 0 ? ' student-doc-summary-bar__item--missing' : ''}`}
      >
        <span className="student-doc-summary-bar__value">{missing}</span>
        <span className="student-doc-summary-bar__label">{t('admin.student360.documents.summaryMissing')}</span>
      </div>
    </div>
  );
}
