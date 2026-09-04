'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { isAllSchoolsReadMode } from '@/lib/admin/all-schools-read-mode';

export function AcademicYearSwitcher({ hideLabel = false }: { hideLabel?: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    activeAcademicYearId,
    academicYears,
    academicYearLoading,
    academicYearError,
    setActiveAcademicYear,
  } = useAdminSession();

  if (isAllSchoolsReadMode(pathname, searchParams)) return null;

  const label = t('academicContext.fields.academicYear');
  const placeholder = academicYearLoading
    ? t('academicContext.loading')
    : t('academicContext.placeholders.academicYear');

  return (
    <label
      className={`school-switcher${hideLabel ? ' school-switcher--no-label' : ''}`}
      title={academicYearError?.message}
    >
      {!hideLabel && <span className="school-switcher__label">{label}</span>}
      <select
        className="input input--sm school-switcher__select"
        value={activeAcademicYearId ?? ''}
        disabled={academicYearLoading || Boolean(academicYearError) || academicYears.length === 0}
        onChange={(event) => {
          const id = Number(event.target.value);
          if (id > 0) setActiveAcademicYear(id);
        }}
        aria-label={label}
        aria-busy={academicYearLoading}
        aria-invalid={academicYearError ? true : undefined}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {academicYears.map((year) => (
          <option key={year.id} value={year.id} dir="auto">
            {year.name}
          </option>
        ))}
      </select>
      {!hideLabel && academicYearError ? (
        <span className="muted" role="alert">
          {academicYearError.message}
        </span>
      ) : null}
    </label>
  );
}
