'use client';

import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';

export function SchoolSwitcher() {
  const t = useT();
  const { schools, activeSchoolId, requiresActiveSchool, switching, setActiveSchool } =
    useAdminSession();

  if (!requiresActiveSchool || schools.length <= 1) return null;

  return (
    <label className="school-switcher">
      <span className="school-switcher__label">{t('admin.activeSchool')}</span>
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
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
