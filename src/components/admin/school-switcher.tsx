'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useAllSchoolsCopy } from '@/features/admin/all-schools/all-schools-i18n';
import { shouldShowSchoolSwitcher } from '@/lib/admin/admin-ux';
import {
  ALL_SCHOOLS_SCOPE_VALUE,
  isAllSchoolsEligiblePath,
  isAllSchoolsReadMode,
  setAllSchoolsScope,
} from '@/lib/admin/all-schools-read-mode';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { useT } from '@/features/i18n/locale-context';

export function SchoolSwitcher({ hideLabel = false }: { hideLabel?: boolean }) {
  const t = useT();
  const copy = useAllSchoolsCopy();
  const user = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { schools, activeSchoolId, switching, setActiveSchool } = useAdminSession();

  if (!shouldShowSchoolSwitcher(user) || schools.length <= 1) return null;

  const allSchoolsEligible = isAllSchoolsEligiblePath(pathname);
  const allSchools = isAllSchoolsReadMode(pathname, searchParams);

  function replaceScope(enabled: boolean) {
    const next = setAllSchoolsScope(searchParams, enabled);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function handleChange(raw: string) {
    if (raw === ALL_SCHOOLS_SCOPE_VALUE && allSchoolsEligible) {
      replaceScope(true);
      return;
    }

    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    if (id === activeSchoolId) {
      replaceScope(false);
      return;
    }

    const switched = await setActiveSchool(id);
    if (switched) replaceScope(false);
  }

  return (
    <label className={`school-switcher${hideLabel ? ' school-switcher--no-label' : ''}`}>
      {!hideLabel && <span className="school-switcher__label">{t('admin.activeSchool')}</span>}
      <select
        className="input input--sm school-switcher__select"
        value={allSchools ? ALL_SCHOOLS_SCOPE_VALUE : activeSchoolId != null ? String(activeSchoolId) : ''}
        disabled={switching}
        onChange={(event) => void handleChange(event.target.value)}
        aria-label={t('admin.activeSchool')}
      >
        <option value="" disabled>
          {t('admin.chooseSchool')}
        </option>
        {allSchoolsEligible ? (
          <option value={ALL_SCHOOLS_SCOPE_VALUE}>{copy.allSchools}</option>
        ) : null}
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {formatSchoolLabel(school, t)}
          </option>
        ))}
      </select>
    </label>
  );
}
