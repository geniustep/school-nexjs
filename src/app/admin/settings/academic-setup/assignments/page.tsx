'use client';

import { ErrorState, LoadingState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { AssignmentBoard } from '@/features/admin/academic-setup/components/assignment-board';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';

export default function AcademicSetupAssignmentsPage() {
  const t = useT();
  const user = useSession();
  const canManage = canManageTeachingAssignments(user);
  const lists = useAcademicSetupLists();

  if (lists.loading) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.assignments')} />
        <LoadingState label={t('common.loading')} />
      </>
    );
  }

  if (lists.error) {
    return (
      <>
        <PageHeader title={t('admin.academicSetup.nav.assignments')} />
        <ErrorState error={lists.error} onRetry={lists.reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('admin.academicSetup.nav.assignments')}
        subtitle={t('admin.academicSetup.assignmentsDesc')}
      />
      <AssignmentBoard classes={lists.classes} canManage={canManage} />
    </>
  );
}
