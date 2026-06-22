'use client';

import Link from 'next/link';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { StaffTemplateCreateResult } from '@/types/staff-templates';
import { resolveStaffTemplateCreateRedirect } from '@/features/admin/staff/utils/staff-center-present';
import type { StaffCreationTemplate } from '@/types/staff-templates';

export function StaffCreateSuccessPanel({
  result,
  template,
  onCreateAnother,
}: {
  result: StaffTemplateCreateResult;
  template: StaffCreationTemplate | null;
  onCreateAnother: () => void;
}) {
  const t = useT();
  const redirect = resolveStaffTemplateCreateRedirect(result, template);
  const displayName = result.name ?? result.staff?.name ?? t('admin.staffCenter.smartCreate.createSuccess');

  return (
    <Card className="staff-center-section staff-create-success">
      <SectionHead title={t('admin.staffCenter.smartCreate.successTitle')} />
      <p className="staff-create-success__lead">{displayName}</p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {redirect.primary === 'teacher' && redirect.teacherId != null ? (
          <Link href={`/admin/teachers/${redirect.teacherId}`} className="btn btn--primary">
            {t('admin.staffCenter.smartCreate.openTeacherProfile')}
          </Link>
        ) : redirect.userId != null ? (
          <Link href={`/admin/staff/${redirect.userId}`} className="btn btn--primary">
            {t('admin.staffCenter.smartCreate.openStaffProfile')}
          </Link>
        ) : null}
        {redirect.userId != null && redirect.primary === 'teacher' ? (
          <Link href={`/admin/staff/${redirect.userId}`} className="btn btn--ghost">
            {t('admin.staffCenter.smartCreate.manageAccountPermissions')}
          </Link>
        ) : null}
        <button type="button" className="btn btn--ghost" onClick={onCreateAnother}>
          {t('admin.staffCenter.smartCreate.createAnother')}
        </button>
      </div>
    </Card>
  );
}
