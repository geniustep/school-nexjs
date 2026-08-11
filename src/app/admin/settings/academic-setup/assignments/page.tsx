'use client';

import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AssignmentBoard } from '@/features/admin/academic-setup/components/assignment-board';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupAssignmentsPage() {
  const t = useT();
  const user = useSession();
  const { activeAcademicYearId, academicYearError } = useAdminSession();
  const canManage = canManageTeachingAssignments(user);
  const lists = useAcademicSetupLists();

  if (lists.initialLoading || (activeAcademicYearId == null && academicYearError == null)) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.assignments')} skeleton />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (academicYearError) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.assignments')} />
        <ErrorState error={academicYearError} />
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

  if (activeAcademicYearId == null) return null;

  return (
    <>
      <AcademicPageHeader
        title={t('admin.academicSetup.nav.assignments')}
        subtitle={t('admin.academicSetup.assignmentsPageSubtitle')}
      />
      <AssignmentBoard
        classes={lists.classes}
        subjects={lists.subjects}
        academicYearId={activeAcademicYearId}
        canManage={canManage}
      />
    </>
  );
}
