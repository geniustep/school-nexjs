'use client';

import { InfoBanner } from '@/components/ui/primitives';
import { mapStaffWarning } from '@/features/admin/staff/utils/staff-warnings';
import { useT } from '@/features/i18n/locale-context';
import type { ApiWarning } from '@/types/academic-setup';

export function StaffWarningsPanel({ warnings }: { warnings?: ApiWarning[] }) {
  const t = useT();
  if (!warnings?.length) return null;

  return (
    <div className="staff-center-warnings">
      <InfoBanner
        tone="amber"
        icon="⚠"
        title={t('admin.staffCenter.warningsTitle', { count: warnings.length })}
      />
      <ul className="staff-center-warnings__list">
        {warnings.map((warning, index) => (
          <li key={`${warning.code}-${index}`} className="staff-center-warnings__item">
            {mapStaffWarning(warning, t)}
          </li>
        ))}
      </ul>
    </div>
  );
}
