'use client';

import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { shouldShowSchoolSwitcher } from '@/lib/admin/admin-ux';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { useT } from '@/features/i18n/locale-context';

export function SchoolSwitcher({ hideLabel = false }: { hideLabel?: boolean }) {
  const t = useT();
  const user = useSession();
  const { schools, activeSchoolId, switching, setActiveSchool } = useAdminSession();

  if (!shouldShowSchoolSwitcher(user) || schools.length <= 1) return null;

  return (
    <label className={`school-switcher${hideLabel ? ' school-switcher--no-label' : ''}`}>
      {!hideLabel && <span className="school-switcher__label">{t('admin.activeSchool')}</span>}
      <select
        className="input input--sm school-switcher__select"
        value={activeSchoolId ?? ''}
        disabled={switching}
        onChange={(e) => {
          const id = Number(e.target.value);
          if (id > 0) void setActiveSchool(id);
        }}
        aria-label={t('admin.activeSchool')}
      >
        <option value="" disabled>
          {t('admin.chooseSchool')}
        </option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {formatSchoolLabel(s, t)}
          </option>
        ))}
      </select>
    </label>
  );
}
