'use client';

import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import type { StudentDetailsData, StudentEnrollment } from '@/types/student-360';

export function StudentEnrollmentTab({ details }: { details: StudentDetailsData }) {
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
      render: (row) => row.state,
    },
    {
      key: 'start',
      header: t('admin.student360.dateStart'),
      render: (row) => formatDate(row.date_start) || t('common.dash'),
    },
    {
      key: 'end',
      header: t('admin.student360.dateEnd'),
      render: (row) => formatDate(row.date_end) || t('common.dash'),
    },
    {
      key: 'current',
      header: t('admin.student360.isCurrent'),
      render: (row) => (row.is_current ? t('common.yes') : t('common.no')),
    },
  ];

  return (
    <div className="col" style={{ gap: 16 }}>
      <Card>
        <SectionHead title={t('admin.student360.currentEnrollment')} />
        {current ? (
          <DefinitionList
            items={[
              { label: t('academic.status'), value: current.state },
              { label: t('admin.student360.dateStart'), value: formatDate(current.date_start) },
              { label: t('admin.student360.dateEnd'), value: formatDate(current.date_end) },
              { label: t('admin.finance.activeSchool'), value: refOrStringLabel(current.school) },
              { label: t('admin.academicYearId'), value: refOrStringLabel(current.academic_year) },
              { label: t('nav.levels'), value: studentLevelLabel(current.level) },
              { label: t('nav.classes'), value: studentClassLabel(current.class) },
              { label: t('admin.student360.track'), value: refOrStringLabel(current.track) },
              {
                label: t('admin.student360.isCurrent'),
                value: current.is_current ? t('common.yes') : t('common.no'),
              },
            ]}
          />
        ) : (
          <EmptyState
            title={t('admin.student360.noCurrentEnrollmentTitle')}
            description={t('admin.student360.noCurrentEnrollmentDesc')}
          />
        )}
      </Card>

      <Card>
        <SectionHead title={t('admin.student360.enrollmentHistory')} />
        {history.length > 0 ? (
          <DataTable columns={columns} rows={history} rowKey={(r) => r.id} />
        ) : (
          <EmptyState
            title={t('admin.student360.noEnrollmentHistoryTitle')}
            description={t('admin.student360.noEnrollmentHistoryDesc')}
          />
        )}
      </Card>
    </div>
  );
}
