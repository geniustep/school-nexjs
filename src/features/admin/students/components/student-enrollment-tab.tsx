'use client';

import { DataTable, type Column } from '@/components/tables/data-table';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { refOrStringLabel, studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import { CurrentEnrollmentCard } from './current-enrollment-card';
import type { StudentDetailsData, StudentEnrollment } from '@/types/student-360';

export function StudentEnrollmentTab({
  details,
  canManage,
  onCreateEnrollment,
}: {
  details: StudentDetailsData;
  canManage?: boolean;
  onCreateEnrollment?: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const current = details.current_enrollment;
  const history = [...details.enrollment_history].sort((a, b) => {
    const da = a.date_start ?? '';
    const db = b.date_start ?? '';
    return db.localeCompare(da);
  });

  const columns: Column<StudentEnrollment>[] = [
    {
      key: 'year',
      header: t('admin.academicYearId'),
      render: (row) => refOrStringLabel(row.academic_year),
    },
    {
      key: 'level',
      header: t('nav.levels'),
      render: (row) => studentLevelLabel(row.level),
    },
    {
      key: 'class',
      header: t('nav.classes'),
      render: (row) => studentClassLabel(row.class),
    },
    {
      key: 'state',
      header: t('academic.status'),
      render: (row) => statusLabel(t, row.state),
    },
    {
      key: 'start',
      header: t('admin.student360.dateStart'),
      render: (row) => formatDate(row.date_start) || t('common.dash'),
    },
    {
      key: 'current',
      header: t('admin.student360.isCurrent'),
      render: (row) => (row.is_current ? t('common.yes') : t('common.no')),
    },
  ];

  return (
    <div className="student-360-tab-panel">
      {current ? (
        <CurrentEnrollmentCard enrollment={current} />
      ) : (
        <div className="student-360-enrollment-empty">
          <p className="student-360-enrollment-empty__title">{t('admin.student360.noCurrentEnrollmentTitle')}</p>
          <p className="student-360-enrollment-empty__desc">{t('admin.student360.enrollmentEmptyDesc')}</p>
          {canManage && onCreateEnrollment ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={onCreateEnrollment}>
              {t('admin.student360.statusSummary.createEnrollment')}
            </button>
          ) : null}
        </div>
      )}

      <section className="student-360-section">
        <h3 className="student-360-section__title">{t('admin.student360.enrollmentHistory')}</h3>
        {history.length > 0 ? (
          <div className="student-360-table-wrap">
            <DataTable columns={columns} rows={history} rowKey={(r) => r.id} />
          </div>
        ) : (
          <p className="tiny muted">{t('admin.student360.noEnrollmentHistoryDesc')}</p>
        )}
      </section>
    </div>
  );
}
