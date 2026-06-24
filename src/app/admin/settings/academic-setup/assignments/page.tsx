'use client';

import { useMemo } from 'react';
import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AssignmentBoard } from '@/features/admin/academic-setup/components/assignment-board';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useSetupReadiness } from '@/features/admin/academic-setup/hooks/use-setup-readiness';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupAssignmentsPage() {
  const t = useT();
  const user = useSession();
  const canManage = canManageTeachingAssignments(user);
  const lists = useAcademicSetupLists();
  const readinessState = useSetupReadiness();

  const assignmentStats = useMemo(() => {
    const summary = readinessState.data?.domains.assignments?.summary ?? {};
    return {
      assigned: Number(summary.assigned ?? 0),
      missing: Number(summary.missing ?? 0),
    };
  }, [readinessState.data]);

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
        stats={t('admin.academicSetup.assignmentsPageStats', assignmentStats)}
      />
      <AssignmentBoard classes={lists.classes} canManage={canManage} />
    </>
  );
}
