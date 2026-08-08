'use client';

import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AssignmentBoard } from '@/features/admin/academic-setup/components/assignment-board';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useStudentOptions } from '@/features/admin/students/hooks/use-student-options';

export default function AcademicSetupAssignmentsPage() {
  const t = useT();
  const user = useSession();
  const canManage = canManageTeachingAssignments(user);
  const lists = useAcademicSetupLists();
  const optionsState = useStudentOptions();

  if (lists.initialLoading) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.assignments')} skeleton />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.assignments')} />
        <ErrorState error={lists.error} onRetry={lists.reload} />
      </>
    );
  }

  return (
    <>
      <AcademicPageHeader
        title={t('admin.academicSetup.nav.assignments')}
        subtitle={t('admin.academicSetup.assignmentsPageSubtitle')}
      />
      <AssignmentBoard
        classes={lists.classes}
        subjects={lists.subjects}
        academicYears={optionsState.options?.academicYears ?? []}
        canManage={canManage}
      />
    </>
  );
}
