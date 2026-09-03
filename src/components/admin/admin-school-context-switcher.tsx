'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';

const ALL_SCHOOLS_PATHS = new Set([
  '/admin/dashboard',
  '/admin/students',
  '/admin/classes',
  '/admin/parents',
]);

export function supportsAllSchoolsView(pathname: string): boolean {
  return ALL_SCHOOLS_PATHS.has(pathname);
}

/** Global school selector. "All schools" is available only on audited read views. */
export function AdminSchoolContextSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLocale();
  const {
    activeSchoolId,
    schoolViewMode,
    setSchoolViewMode,
    schools,
    requiresActiveSchool,
    switching,
    setActiveSchool,
  } = useAdminSession();

  const supportsAll = supportsAllSchoolsView(pathname);
  const allLabel = locale === 'ar' ? 'كل المدارس' : 'Toutes les écoles';
  const label = locale === 'ar' ? 'المدرسة' : 'École';
  const value = supportsAll && schoolViewMode === 'all' ? 'all' : String(activeSchoolId ?? '');

  if (!requiresActiveSchool || schools.length < 2) {
    const school = schools.find((item) => item.id === activeSchoolId) ?? schools[0];
    return school ? <span className="focus-v2__school">{school.name}</span> : null;
  }

  async function onChange(next: string) {
    if (next === 'all') {
      setSchoolViewMode('all');
      router.refresh();
      return;
    }

    const schoolId = Number(next);
    if (!Number.isFinite(schoolId) || schoolId <= 0) return;
    await setActiveSchool(schoolId);
  }

  return (
    <label className="focus-v2__school" title={label}>
      <span className="focus-v2__sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={switching}
        onChange={(event) => void onChange(event.target.value)}
        style={{ width: '100%', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0 }}
      >
        {supportsAll ? <option value="all">{allLabel}</option> : null}
        {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
      </select>
    </label>
  );
}
