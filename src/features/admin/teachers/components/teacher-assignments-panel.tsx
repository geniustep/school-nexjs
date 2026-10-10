'use client';

import Link from 'next/link';
import { ErrorState, LoadingState } from '@/components/states/states';
import { TeacherFocusedAssignments } from '@/features/admin/academic-setup/components/teacher-focused-assignments';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { hasAllowedAction } from '@/features/admin/teachers/utils/teacher-domain-allowed-actions';
import { canManageTeachingAssignments } from '@/lib/permissions/academic-setup';
import type { Teacher } from '@/types/teacher';
import type { TeacherDetail } from '@/types/teacher-domain';
import '@/features/admin/academic-setup/academic-setup-ui.css';

export function TeacherAssignmentsPanel({ teacher }: { teacher: TeacherDetail }) {
  const t = useT();
  const user = useSession();
  const {
    activeAcademicYearId,
    academicYearLoading,
    academicYearError,
  } = useAdminSession();

  if (academicYearLoading || (activeAcademicYearId == null && academicYearError == null)) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (academicYearError) {
    return <ErrorState error={academicYearError} />;
  }

  if (activeAcademicYearId == null) return null;

  const canManage =
    canManageTeachingAssignments(user) &&
    hasAllowedAction(teacher.allowed_actions, 'manage_assignments');

  const workspaceHref =
    `/admin/teaching-assignments?teacher_id=${teacher.id}` +
    `&academic_year_id=${activeAcademicYearId}`;

  return (
    <div className="teacher-assignments-panel">
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
        <Link href={workspaceHref} className="btn btn--ghost btn--sm">
          {t('admin.teacherDomain.detail.openAssignments')}
        </Link>
      </div>

      <TeacherFocusedAssignments
        teacher={teacher as unknown as Teacher}
        academicYearId={activeAcademicYearId}
        canManage={canManage}
      />
    </div>
  );
}
