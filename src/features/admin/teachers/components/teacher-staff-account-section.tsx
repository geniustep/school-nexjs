'use client';

import Link from 'next/link';
import { Card, DefinitionList, SectionHead } from '@/components/ui/primitives';
import { AccountStatusBadge } from '@/features/admin/account/account-status-badge';
import { useT } from '@/features/i18n/locale-context';
import type { Teacher } from '@/types/teacher';

export function TeacherStaffAccountSection({ teacher }: { teacher: Teacher }) {
  const t = useT();
  const userId = teacher.user_id;
  if (userId == null || userId <= 0) return null;

  const accountStatus = teacher.account?.status ?? 'active';

  return (
    <Card>
      <SectionHead
        title={t('admin.staffCenter.teacherAccountCardTitle')}
        action={
          <Link href={`/admin/staff/${userId}`} className="btn btn--ghost btn--sm">
            {t('admin.staffCenter.manageStaffAccount')}
          </Link>
        }
      />
      <p className="muted mb-2">{t('admin.staffCenter.teacherAccountCardDesc')}</p>
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
  );
}
