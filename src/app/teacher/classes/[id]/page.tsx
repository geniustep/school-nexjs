'use client';

import Link from 'next/link';
import { use, useMemo } from 'react';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { ClassActionGrid } from '@/features/teacher/class-actions';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentDisplayName, type StudentNameFields } from '@/lib/utils/student';

interface ClassStudent extends StudentNameFields {
  id: number;
  code?: string | null;
  status?: string;
}

function statusText(t: ReturnType<typeof useT>, status: string | undefined) {
  if (!status) return t('common.dash');
  const key = `states.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export default function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const state = useResource<ClassStudent[]>(endpoints.teacher.classStudents(id));

  const columns: Column<ClassStudent>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('actions.students'),
        render: (s) => <strong>{getStudentDisplayName(s)}</strong>,
      },
      {
        key: 'code',
        header: t('academic.type'),
        render: (s) => <span className="mono">{s.code ?? t('common.dash')}</span>,
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (s) =>
          s.status ? (
            <Badge tone={s.status === 'active' ? 'green' : 'slate'}>
              {statusText(t, s.status)}
            </Badge>
          ) : (
            t('common.dash')
          ),
      },
    ],
    [t],
  );

  return (
    <>
      <Link href="/teacher/classes" className="back-link">
        ‹ {t('academic.backToClasses')}
      </Link>
      <PageHeader
        title={t('academic.classStudents')}
        subtitle={`#${id}`}
        actions={
          <Link className="btn btn--primary btn--sm" href={`/teacher/attendance?class=${id}`}>
            {t('academic.takeAttendance')}
          </Link>
        }
      />
      <ClassActionGrid classId={Number(id)} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="🎓" title={t('empty.students')} description={t('empty.students')} />}
      >
        {(students) => <DataTable columns={columns} rows={students} rowKey={(s) => s.id} />}
      </ResourceView>
    </>
  );
}
