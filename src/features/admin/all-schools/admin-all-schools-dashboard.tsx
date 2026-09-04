'use client';

import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/tables/data-table';
import { ResourceView } from '@/components/states/resource';
import { Card, PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import type {
  AllSchoolsDashboard,
  AllSchoolsDashboardSchool,
} from './all-schools-contract';
import { ALL_SCHOOLS_ENDPOINTS } from './all-schools-contract';
import { useAllSchoolsCopy } from './all-schools-i18n';

function academicYearLabel(value: AllSchoolsDashboardSchool['academic_year']): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.name ?? '—';
}

export function AdminAllSchoolsDashboardView() {
  const t = useT();
  const copy = useAllSchoolsCopy();
  const state = useResource<AllSchoolsDashboard>(ALL_SCHOOLS_ENDPOINTS.dashboard);

  const columns = useMemo<Column<AllSchoolsDashboardSchool>[]>(
    () => [
      {
        key: 'school',
        header: copy.school,
        render: (row) => <strong dir="auto">{row.school.name}</strong>,
      },
      {
        key: 'year',
        header: t('academicContext.fields.academicYear'),
        render: (row) => <span dir="auto">{academicYearLabel(row.academic_year)}</span>,
      },
      { key: 'students', header: t('nav.students'), render: (row) => row.summary.total_students ?? 0 },
      { key: 'teachers', header: t('nav.teachers'), render: (row) => row.summary.total_teachers ?? 0 },
      { key: 'parents', header: t('nav.parents'), render: (row) => row.summary.total_parents ?? 0 },
      { key: 'classes', header: t('nav.classes'), render: (row) => row.summary.total_classes ?? 0 },
    ],
    [copy.school, t],
  );

  return (
    <div className="admin-workspace admin-workspace--dashboard">
      <PageHeader title={t('nav.dashboard')} subtitle={copy.readOnly} />
      <ResourceView state={state} loadingLabel={t('common.loading')}>
        {(data) => (
          <div className="col" style={{ gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              <Card><div className="col" style={{ gap: 4 }}><span className="muted tiny">{t('nav.students')}</span><strong className="mono" dir="ltr">{data.summary.total_students ?? 0}</strong></div></Card>
              <Card><div className="col" style={{ gap: 4 }}><span className="muted tiny">{t('nav.teachers')}</span><strong className="mono" dir="ltr">{data.summary.total_teachers ?? 0}</strong></div></Card>
              <Card><div className="col" style={{ gap: 4 }}><span className="muted tiny">{t('nav.parents')}</span><strong className="mono" dir="ltr">{data.summary.total_parents ?? 0}</strong></div></Card>
              <Card><div className="col" style={{ gap: 4 }}><span className="muted tiny">{t('nav.classes')}</span><strong className="mono" dir="ltr">{data.summary.total_classes ?? 0}</strong></div></Card>
            </div>

            {data.summary.attendance_today ? (
              <Card>
                <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
                  <strong>{copy.attendanceToday}</strong>
                  <span>{copy.present}: <bdi dir="ltr">{data.summary.attendance_today.present ?? 0}</bdi></span>
                  <span>{copy.absent}: <bdi dir="ltr">{data.summary.attendance_today.absent ?? 0}</bdi></span>
                  <span>{copy.late}: <bdi dir="ltr">{data.summary.attendance_today.late ?? 0}</bdi></span>
                </div>
              </Card>
            ) : null}

            <Card>
              <div className="col" style={{ gap: 12 }}>
                <strong>{copy.bySchool}</strong>
                <DataTable
                  columns={columns}
                  rows={data.schools ?? []}
                  rowKey={(row) => row.school.id}
                />
              </div>
            </Card>
          </div>
        )}
      </ResourceView>
    </div>
  );
}
