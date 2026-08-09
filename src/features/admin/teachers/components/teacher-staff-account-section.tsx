'use client';

import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { StaffCompensationPanel } from '@/features/admin/staff/components/staff-compensation-panel';
import { useT } from '@/features/i18n/locale-context';
import type { Teacher } from '@/types/teacher';

/**
 * Displays teacher-linked account status and the staff-first compensation bridge.
 * Compensation remains owned by Staff Compensation V1; the teacher profile does
 * not create a separate payroll domain.
 */
export function TeacherStaffAccountSection({ teacher }: { teacher: Teacher }) {
  const t = useT();
  const userId = teacher.user_id;
  if (userId == null || userId <= 0) return null;

  const accountStatus = teacher.account?.status ?? 'active';
  const needsPasswordSetup = accountStatus === 'password_setup_required';

  return (
    <div data-testid="teacher-account-status-card" className="teacher-staff-account-stack">
      <Card>
        <SectionHead title={t('admin.staffCenter.teacherAccountCardTitle')} />
        <p className="muted mb-2">{t('admin.staffCenter.teacherAccountCardDesc')}</p>
        {needsPasswordSetup ? (
          <p className="muted mb-2" data-testid="teacher-account-password-setup-hint">
            {t('admin.staffCenter.teacherAccountPasswordSetupHint')}
          </p>
        ) : null}
        <DefinitionList
          items={[
            {
              label: t('academic.status'),
              value: <AccountStatusBadge status={accountStatus} />,
            },
            {
              label: t('admin.account.loginName'),
              value: teacher.login ?? teacher.account?.login ?? teacher.email ?? t('common.dash'),
            },
          ]}
        />
      </Card>
      <StaffCompensationPanel teacherId={teacher.id} />
    </div>
  );
}
