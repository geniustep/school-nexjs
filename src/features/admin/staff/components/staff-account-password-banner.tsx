'use client';

import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { staffNeedsPasswordSetup } from '@/features/admin/staff/utils/staff-center-present';
import type { StaffMember } from '@/types/academic-setup';

export function StaffAccountPasswordBanner({
  member,
  onSetPassword,
}: {
  member: StaffMember;
  onSetPassword?: () => void;
}) {
  const t = useT();
  if (!staffNeedsPasswordSetup(member)) return null;

  return (
    <div className="staff-center-password-banner">
      <InfoBanner
        tone="amber"
        icon="🔑"
        title={t('admin.staffCenter.noPasswordTitle')}
        description={t('admin.staffCenter.noPasswordDesc')}
      />
      {onSetPassword ? (
        <button type="button" className="btn btn--primary btn--sm mt-2" onClick={onSetPassword}>
          {t('admin.staffCenter.setPasswordAction')}
        </button>
      ) : null}
    </div>
  );
}
