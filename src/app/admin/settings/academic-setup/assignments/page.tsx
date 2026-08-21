'use client';

import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/states/states';
import { AcademicPageHeader } from '@/features/admin/academic-setup/components/academic-page-header';
import { AssignmentBoard } from '@/features/admin/academic-setup/components/assignment-board';
import { TeacherFocusedAssignments } from '@/features/admin/academic-setup/components/teacher-focused-assignments';
import { useAcademicSetupLists } from '@/features/admin/academic-setup/hooks/use-academic-setup-data';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import type { Teacher } from '@/types/teacher';

function positiveTeacherId(value: string | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function GeneralAssignmentsPage() {
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

function TeacherFocusPage({ teacherId }: { teacherId: number }) {
  const t = useT();
  const user = useSession();
  const { activeAcademicYearId, academicYearError } = useAdminSession();
  const canManage = canManageTeachingAssignments(user);
  const teacherState = useAdminResource<Teacher>(endpoints.admin.teacher(teacherId));

  if (teacherState.loading || (activeAcademicYearId == null && academicYearError == null)) {
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

  if (teacherState.error) {
    return (
      <>
        <AcademicPageHeader title={t('admin.academicSetup.nav.assignments')} />
        <ErrorState error={teacherState.error} onRetry={teacherState.reload} />
      </>
    );
  }

  if (activeAcademicYearId == null || !teacherState.data) return null;

  return (
    <>
      <AcademicPageHeader
        title={t('admin.academicSetup.nav.assignments')}
        subtitle={teacherState.data.name}
      />
      <TeacherFocusedAssignments
        teacher={teacherState.data}
        academicYearId={activeAcademicYearId}
        canManage={canManage}
        onSaved={teacherState.reload}
      />
    </>
  );
}

export default function AcademicSetupAssignmentsPage() {
  const searchParams = useSearchParams();
  const teacherId = positiveTeacherId(searchParams.get('teacher_id'));
  return teacherId ? <TeacherFocusPage teacherId={teacherId} /> : <GeneralAssignmentsPage />;
}
