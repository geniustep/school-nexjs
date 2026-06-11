'use client';

import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { AssignmentBoard } from '@/features/admin/academic-setup/components/assignment-board';
import { useAcademicSetupData } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { parseNumericFilter } from '@/features/admin/academic-setup/utils/search';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupAssignmentsPage() {
  const t = useT();
  const user = useSession();
  const searchParams = useSearchParams();
  const data = useAcademicSetupData(t);
  const canManage = canManageTeachingAssignments(user);
  const classId = parseNumericFilter(searchParams, 'class');
  const subjectId = parseNumericFilter(searchParams, 'subject');

  if (data.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.assignments')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (data.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.assignments')} />
        <ErrorState
          error={{ code: 'server_error', message: t('admin.academicSetup.loadError'), details: {} }}
          onRetry={data.reload}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('admin.academicSetup.nav.assignments')}
        subtitle={t('admin.academicSetup.assignmentsDesc')}
      />
      <AssignmentBoard
        classes={data.classes}
        teachers={data.teachers}
        assignments={data.assignments}
        canManage={canManage}
        initialClassId={classId}
        initialSubjectId={subjectId}
      />
    </>
  );
}
