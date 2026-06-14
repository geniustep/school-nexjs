'use client';

import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { optionLabel } from '../utils/student-profile';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import { Student360CompactEmpty } from './student-360-compact-empty';
import type { StudentDetailsData, StudentEnrollment } from '@/types/student-360';

function dash(t: (k: string) => string, value: string | null | undefined): string {
  return value?.trim() ? value : t('common.dash');
}

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
        <Card className="student-360-section-card">
          <SectionHead title={t('admin.student360.currentEnrollment')} />
          <DefinitionList
            items={[
              { label: t('academic.status'), value: statusLabel(t, current.state) },
              { label: t('admin.finance.activeSchool'), value: refOrStringLabel(current.school) },
              { label: t('admin.academicYearId'), value: refOrStringLabel(current.academic_year) },
              { label: t('nav.levels'), value: studentLevelLabel(current.level) },
              { label: t('nav.classes'), value: studentClassLabel(current.class) },
              { label: t('admin.student360.dateStart'), value: formatDate(current.date_start) },
              {
                label: t('admin.student360.registrationType'),
                value: optionLabel(undefined, current.registration_type) || dash(t, current.registration_type),
              },
            ]}
          />
        </Card>
      ) : (
        <Student360CompactEmpty
          title={t('admin.student360.noCurrentEnrollmentTitle')}
          description={t('admin.student360.enrollmentEmptyDesc')}
          action={
            canManage && onCreateEnrollment ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={onCreateEnrollment}>
                {t('admin.student360.statusSummary.createEnrollment')}
              </button>
            ) : undefined
          }
        />
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
