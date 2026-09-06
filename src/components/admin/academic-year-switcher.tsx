'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useAllSchoolsCopy } from '@/features/admin/all-schools/all-schools-i18n';
import { useT } from '@/features/i18n/locale-context';
import { isAllSchoolsReadMode } from '@/lib/admin/all-schools-read-mode';

export function AcademicYearSwitcher({ hideLabel = false }: { hideLabel?: boolean }) {
  const t = useT();
  const copy = useAllSchoolsCopy();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    activeAcademicYearId,
    academicYears,
    academicYearLoading,
    academicYearError,
    setActiveAcademicYear,
  } = useAdminSession();

  const allSchools = isAllSchoolsReadMode(pathname, searchParams);
  const label = t('academicContext.fields.academicYear');
  const placeholder = academicYearLoading
    ? t('academicContext.loading')
    : t('academicContext.placeholders.academicYear');

  return (
    <label
      className={`school-switcher${hideLabel ? ' school-switcher--no-label' : ''}`}
      title={allSchools ? copy.currentYearPerSchool : academicYearError?.message}
    >
      {!hideLabel && <span className="school-switcher__label">{label}</span>}
      <select
        className="input input--sm school-switcher__select"
        value={allSchools ? 'all-schools-current' : activeAcademicYearId ?? ''}
        disabled={
          !allSchools &&
          (academicYearLoading || Boolean(academicYearError) || academicYears.length === 0)
        }
        aria-disabled={allSchools || undefined}
        onChange={(event) => {
          if (allSchools) return;
          const id = Number(event.target.value);
          if (id > 0) setActiveAcademicYear(id);
        }}
        aria-label={label}
        aria-busy={!allSchools && academicYearLoading}
        aria-invalid={!allSchools && academicYearError ? true : undefined}
      >
        {allSchools ? (
          <option value="all-schools-current">{copy.currentYearPerSchool}</option>
        ) : (
          <>
            <option value="" disabled>
              {placeholder}
            </option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id} dir="auto">
                {year.name}
              </option>
            ))}
          </>
        )}
      </select>
      {!hideLabel && !allSchools && academicYearError ? (
        <span className="muted" role="alert">
          {academicYearError.message}
        </span>
      ) : null}
    </label>
  );
}
