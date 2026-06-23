'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { SiblingsFormFields } from '@/features/admin/admissions/components/siblings-form-fields';
import type { StudentNationalityOption } from '@/types/student-360';
import type { StudentProfileFieldErrors, StudentProfileFormState } from '../utils/student-profile';
import {
  localizeStudentGenderOptions,
  sortNationalityOptions,
} from '../utils/student-profile';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
      {error ? (
        <span className="tiny" style={{ color: 'var(--danger)' }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function StudentNationalitySelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: StudentNationalityOption[];
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const orderedOptions = useMemo(() => sortNationalityOptions(options), [options]);

  const selected = useMemo(
    () => orderedOptions.find((n) => String(n.id) === value) ?? null,
    [orderedOptions, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searching || !q) return orderedOptions.slice(0, 60);
    return orderedOptions
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          (n.code?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 60);
  }, [orderedOptions, query, searching]);

  const displayValue = open
    ? searching
      ? query
      : selected?.name ?? ''
    : selected?.name ?? '';

  return (
    <div className="nationality-combobox">
      <input
        className="input nationality-combobox__input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={t('admin.student360.searchNationality')}
        value={displayValue}
        onChange={(e) => {
          setSearching(true);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearching(false);
          setQuery('');
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            setSearching(false);
            setQuery('');
          }, 150);
        }}
        disabled={disabled}
      />
      {open && !disabled ? (
        <ul className="nationality-combobox__list" role="listbox">
          <li
            role="option"
            className="nationality-combobox__option"
            onMouseDown={() => {
              onChange('');
              setSearching(false);
              setQuery('');
              setOpen(false);
            }}
          >
            {t('common.dash')}
          </li>
          {filtered.map((n) => (
            <li
              key={n.id}
              role="option"
              aria-selected={String(n.id) === value}
              className={`nationality-combobox__option${String(n.id) === value ? ' nationality-combobox__option--selected' : ''}`}
              onMouseDown={() => {
                onChange(String(n.id));
                setSearching(false);
                setQuery('');
                setOpen(false);
              }}
            >
              {n.name}
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="nationality-combobox__empty">{t('admin.student360.create.noNationalityMatch')}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function StudentIdentityFields({
  state,
  errors,
  optionsLoading,
  genders,
  statuses,
  nationalities,
  onChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  optionsLoading: boolean;
  genders: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  nationalities: StudentNationalityOption[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();
  const showDeparture = state.status === 'withdrawn' || state.status === 'transferred';
  const localizedGenders = useMemo(
    () => localizeStudentGenderOptions(genders, t),
    [genders, t],
  );

  return (
    <div className="student-360-form__grid">
      <Field label={t('admin.firstName')} error={errors.firstName}>
        <input
          className="input"
          value={state.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          required
        />
      </Field>
      <Field label={t('admin.lastName')} error={errors.lastName}>
        <input
          className="input"
          value={state.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
          required
        />
      </Field>
      <Field label={t('admin.student360.nameAr')}>
        <input className="input" value={state.nameAr} onChange={(e) => onChange({ nameAr: e.target.value })} />
      </Field>
      <Field label={t('admin.student360.nameLatin')}>
        <input className="input" value={state.nameLatin} onChange={(e) => onChange({ nameLatin: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('admin.gender')}>
        <select
          className="input"
          value={state.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
          disabled={optionsLoading}
        >
          <option value="">{t('common.dash')}</option>
          {localizedGenders.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('admin.dateOfBirth')} error={errors.dateOfBirth}>
        <input
          className="input"
          type="date"
          value={state.dateOfBirth}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        />
      </Field>
      <Field label={t('admin.student360.birthPlace')}>
        <input className="input" value={state.birthPlace} onChange={(e) => onChange({ birthPlace: e.target.value })} />
      </Field>
      <Field label={t('admin.student360.nationality')}>
        <StudentNationalitySelect
          value={state.nationalityId}
          options={nationalities}
          disabled={optionsLoading}
          onChange={(nationalityId) => onChange({ nationalityId })}
        />
      </Field>
      <Field label={t('admin.massarCode')} error={errors.massarCode}>
        <input className="input" value={state.massarCode} onChange={(e) => onChange({ massarCode: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('admin.studentCode')}>
        <input className="input" value={state.code} onChange={(e) => onChange({ code: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('admin.student360.schoolNumber')} error={errors.schoolNumber}>
        <input className="input" value={state.schoolNumber} onChange={(e) => onChange({ schoolNumber: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('admin.student360.studentStatus')}>
        <select
          className="input"
          value={state.status}
          onChange={(e) => onChange({ status: e.target.value })}
          disabled={optionsLoading}
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('admin.admissionDate')}>
        <input
          className="input"
          type="date"
          value={state.admissionDate}
          onChange={(e) => onChange({ admissionDate: e.target.value })}
        />
      </Field>
      {showDeparture ? (
        <Field label={t('admin.student360.departureReason')} error={errors.departureReason}>
          <input
            className="input"
            value={state.departureReason}
            onChange={(e) => onChange({ departureReason: e.target.value })}
          />
        </Field>
      ) : null}
    </div>
  );
}

export function StudentEnrollmentFields({
  state,
  errors,
  optionsLoading,
  schools,
  years,
  levels,
  classes,
  registrationTypes,
  onChange,
  onLevelChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  optionsLoading: boolean;
  schools: { id: number; name: string }[];
  years: { id: number; name: string }[];
  levels: { id: number; name: string; display_alias?: string | null; code?: string | null }[];
  classes: { id: number; name: string; display_name?: string | null; display_alias?: string | null }[];
  registrationTypes: { value: string; label: string }[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
  onLevelChange: (levelId: string) => void;
}) {
  const t = useT();
  const showPrevious = state.registrationType === 'transfer';
  const showRepeating = state.registrationType === 're_enrollment';

  return (
    <div className="student-360-form__grid">
      {schools.length > 1 ? (
        <Field label={t('admin.finance.activeSchool')}>
          <select
            className="input"
            value={state.schoolId}
            onChange={(e) => onChange({ schoolId: e.target.value })}
            disabled={optionsLoading}
          >
            <option value="">{t('common.dash')}</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label={t('admin.academicYearId')}>
        <select
          className="input"
          value={state.academicYearId}
          onChange={(e) => onChange({ academicYearId: e.target.value })}
          disabled={optionsLoading}
        >
          <option value="">{t('common.dash')}</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('nav.levels')}>
        <select
          className="input"
          value={state.levelId}
          onChange={(e) => onLevelChange(e.target.value)}
          disabled={optionsLoading}
        >
          <option value="">{t('admin.selectLevel')}</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.display_alias ?? l.name ?? l.code}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('nav.classes')} error={errors.classId}>
        <select
          className="input"
          value={state.classId}
          onChange={(e) => onChange({ classId: e.target.value })}
          disabled={optionsLoading || !state.levelId}
        >
          <option value="">{t('admin.selectClass')}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name ?? c.display_alias ?? c.name ?? c.id}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('admin.student360.registrationType')}>
        <select
          className="input"
          value={state.registrationType}
          onChange={(e) => onChange({ registrationType: e.target.value })}
          disabled={optionsLoading}
        >
          {registrationTypes.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('admin.student360.actualJoinDate')} error={errors.actualJoinDate}>
        <input
          className="input"
          type="date"
          value={state.actualJoinDate}
          onChange={(e) => onChange({ actualJoinDate: e.target.value })}
        />
      </Field>
      {showPrevious ? (
        <Field label={t('admin.student360.previousSchool')} error={errors.previousSchool}>
          <input
            className="input"
            value={state.previousSchool}
            onChange={(e) => onChange({ previousSchool: e.target.value })}
          />
        </Field>
      ) : null}
      {showRepeating ? (
        <Field label={t('admin.student360.isRepeating')}>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={state.isRepeating}
              onChange={(e) => onChange({ isRepeating: e.target.checked })}
            />
            <span className="tiny">{t('admin.student360.isRepeatingHint')}</span>
          </label>
        </Field>
      ) : (
        <Field label={t('admin.student360.isRepeating')}>
          <label className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={state.isRepeating}
              onChange={(e) => onChange({ isRepeating: e.target.checked })}
            />
            <span className="tiny">{t('admin.student360.isRepeatingOptional')}</span>
          </label>
        </Field>
      )}
      <Field label={t('admin.student360.registrationNotes')}>
        <textarea
          className="input"
          rows={2}
          value={state.registrationNotes}
          onChange={(e) => onChange({ registrationNotes: e.target.value })}
        />
      </Field>
      <p className="tiny muted student-360-form__hint">
        {t('admin.student360.admissionVsJoinHint')}
      </p>
    </div>
  );
}

export function StudentContactFields({
  state,
  errors,
  onChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();

  return (
    <div className="student-360-form__grid">
      <Field label={t('admin.phone')}>
        <input className="input" value={state.phone} onChange={(e) => onChange({ phone: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('admin.student360.mobile')}>
        <input className="input" value={state.mobile} onChange={(e) => onChange({ mobile: e.target.value })} dir="ltr" />
      </Field>
      <Field label={t('admin.email')} error={errors.email}>
        <input
          className="input"
          type="email"
          value={state.email}
          onChange={(e) => onChange({ email: e.target.value })}
          dir="ltr"
        />
      </Field>
      <Field label={t('admin.student360.street')}>
        <input className="input" value={state.street} onChange={(e) => onChange({ street: e.target.value })} />
      </Field>
      <Field label={t('admin.student360.district')}>
        <input className="input" value={state.district} onChange={(e) => onChange({ district: e.target.value })} />
      </Field>
      <Field label={t('admin.student360.city')}>
        <input className="input" value={state.city} onChange={(e) => onChange({ city: e.target.value })} />
      </Field>
      <Field label={t('admin.student360.zip')}>
        <input className="input" value={state.zip} onChange={(e) => onChange({ zip: e.target.value })} dir="ltr" />
      </Field>
    </div>
  );
}

export function StudentEmergencyFields({
  state,
  errors,
  emergencyRelationships,
  optionsLoading,
  onChange,
  onFillFromPrimary,
  canFillFromPrimary,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  emergencyRelationships: { value: string; label: string }[];
  optionsLoading: boolean;
  onChange: (patch: Partial<StudentProfileFormState>) => void;
  onFillFromPrimary?: () => void;
  canFillFromPrimary?: boolean;
}) {
  const t = useT();

  return (
    <div className="col" style={{ gap: 12 }}>
      {canFillFromPrimary && onFillFromPrimary ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onFillFromPrimary}>
          {t('admin.student360.usePrimaryGuardianEmergency')}
        </button>
      ) : null}
      <div className="student-360-form__grid">
        <Field label={t('admin.student360.emergencyContactName')}>
          <input
            className="input"
            value={state.emergencyContactName}
            onChange={(e) => onChange({ emergencyContactName: e.target.value })}
          />
        </Field>
        <Field label={t('admin.student360.emergencyRelationship')}>
          <select
            className="input"
            value={state.emergencyRelationship}
            onChange={(e) => onChange({ emergencyRelationship: e.target.value })}
            disabled={optionsLoading}
          >
            <option value="">{t('common.dash')}</option>
            {emergencyRelationships.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('admin.student360.emergencyPhone')} error={errors.emergencyPhone}>
          <input
            className="input"
            value={state.emergencyPhone}
            onChange={(e) => onChange({ emergencyPhone: e.target.value })}
            dir="ltr"
          />
        </Field>
        <Field label={t('admin.student360.emergencyPhoneAlt')}>
          <input
            className="input"
            value={state.emergencyPhoneAlt}
            onChange={(e) => onChange({ emergencyPhoneAlt: e.target.value })}
            dir="ltr"
          />
        </Field>
        <Field label={t('admin.student360.emergencyNotes')}>
          <textarea
            className="input"
            rows={2}
            value={state.emergencyNotes}
            onChange={(e) => onChange({ emergencyNotes: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

export function StudentCreateIdentityFields({
  state,
  errors,
  fieldHints,
  optionsLoading,
  genders,
  onChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  fieldHints?: Partial<Record<'massarCode', string>>;
  optionsLoading: boolean;
  genders: { value: string; label: string }[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();
  const fullName = [state.firstName.trim(), state.lastName.trim()].filter(Boolean).join(' ');
  const localizedGenders = useMemo(
    () => localizeStudentGenderOptions(genders, t),
    [genders, t],
  );

  return (
    <div className="student-create-form__grid">
      <Field label={t('admin.student360.create.firstNameAr')} error={errors.firstName}>
        <input
          className="input"
          value={state.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          autoComplete="off"
          required
        />
      </Field>
      <Field label={t('admin.student360.create.lastNameAr')} error={errors.lastName}>
        <input
          className="input"
          value={state.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
          autoComplete="off"
          required
        />
      </Field>
      {fullName ? (
        <div className="student-create-form__name-preview">
          <span className="tiny muted">{t('admin.student360.create.fullNamePreview')}</span>
          <span className="student-create-form__name-preview-value" dir="auto">
            {fullName}
          </span>
        </div>
      ) : null}
      <Field label={t('admin.gender')}>
        <select
          className="input"
          value={state.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
          disabled={optionsLoading}
        >
          <option value="">{t('common.dash')}</option>
          {localizedGenders.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('admin.dateOfBirth')} error={errors.dateOfBirth}>
        <input
          className="input"
          type="date"
          value={state.dateOfBirth}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
        />
      </Field>
      <div data-field="massarCode">
        <Field label={t('admin.massarCode')} error={errors.massarCode}>
          <input
            className="input"
            value={state.massarCode}
            onChange={(e) => onChange({ massarCode: e.target.value.replace(/\s/g, '') })}
            dir="ltr"
            inputMode="numeric"
          />
          <span className="tiny muted">
            {fieldHints?.massarCode ?? t('admin.student360.create.identityIdentifierHint')}
          </span>
        </Field>
      </div>
    </div>
  );
}

export function StudentCreateAdditionalFields({
  state,
  errors,
  fieldHints,
  optionsLoading,
  nationalities,
  onChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  fieldHints?: Partial<Record<'schoolNumber' | 'code', string>>;
  optionsLoading: boolean;
  nationalities: StudentNationalityOption[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();

  return (
    <div className="student-create-form__grid">
      <Field label={t('admin.student360.create.firstNameLatin')}>
        <input
          className="input"
          value={state.firstNameLatin}
          onChange={(e) => onChange({ firstNameLatin: e.target.value })}
          dir="ltr"
          autoComplete="off"
        />
      </Field>
      <Field label={t('admin.student360.create.lastNameLatin')}>
        <input
          className="input"
          value={state.lastNameLatin}
          onChange={(e) => onChange({ lastNameLatin: e.target.value })}
          dir="ltr"
          autoComplete="off"
        />
      </Field>
      <Field label={t('admin.student360.birthPlace')}>
        <input className="input" value={state.birthPlace} onChange={(e) => onChange({ birthPlace: e.target.value })} />
      </Field>
      <Field label={t('admin.student360.nationality')}>
        <StudentNationalitySelect
          value={state.nationalityId}
          options={nationalities}
          disabled={optionsLoading}
          onChange={(nationalityId) => onChange({ nationalityId })}
        />
      </Field>
      <div data-field="schoolNumber">
        <Field label={t('admin.student360.schoolNumber')} error={errors.schoolNumber}>
          <input
            className="input"
            value={state.schoolNumber}
            onChange={(e) => onChange({ schoolNumber: e.target.value })}
            dir="ltr"
          />
          {fieldHints?.schoolNumber ? (
            <span className="tiny muted">{fieldHints.schoolNumber}</span>
          ) : null}
        </Field>
      </div>
      <div data-field="code">
        <Field label={t('admin.studentCode')} error={errors.code}>
          <input className="input" value={state.code} onChange={(e) => onChange({ code: e.target.value })} dir="ltr" />
          <span className="tiny muted">
            {fieldHints?.code ?? t('admin.student360.create.internalCodeHint')}
          </span>
        </Field>
      </div>
      <Field label={t('admin.admissionDate')}>
        <input
          className="input"
          type="date"
          value={state.admissionDate}
          onChange={(e) => onChange({ admissionDate: e.target.value })}
        />
        <span className="tiny muted">{t('admin.student360.create.admissionDateHint')}</span>
      </Field>
    </div>
  );
}

export function StudentCreateEnrollmentFields({
  state,
  errors,
  optionsLoading,
  optionsError,
  years,
  cycles,
  cyclesLoading,
  levels,
  classes,
  registrationTypes,
  onChange,
  onCycleChange,
  onLevelChange,
  onRetryOptions,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  optionsLoading: boolean;
  optionsError: boolean;
  years: { id: number; name: string }[];
  cycles: { id: number; name: string }[];
  cyclesLoading: boolean;
  levels: { id: number; name: string; display_alias?: string | null; code?: string | null }[];
  classes: { id: number; name: string; display_name?: string | null; display_alias?: string | null }[];
  registrationTypes: { value: string; label: string }[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
  onCycleChange: (cycleId: string) => void;
  onLevelChange: (levelId: string) => void;
  onRetryOptions?: () => void;
}) {
  const t = useT();
  const showPrevious = state.registrationType === 'transfer';

  const levelPlaceholder = !state.cycleId
    ? t('admin.student360.create.selectCycleFirst')
    : optionsLoading || cyclesLoading
      ? t('admin.student360.create.loadingLevels')
      : levels.length === 0
        ? t('admin.student360.create.noLevelsForCycle')
        : t('admin.selectLevel');

  const classPlaceholder = !state.levelId
    ? t('admin.student360.create.selectLevelFirst')
    : optionsLoading
      ? t('admin.student360.create.loadingClasses')
      : classes.length === 0
        ? t('admin.student360.create.noClassesForLevel')
        : t('admin.selectClass');

  return (
    <div className="student-create-form__grid">
      <Field label={t('admin.academicYearId')} error={errors.academicYearId}>
        {optionsLoading && years.length === 0 ? (
          <p className="tiny muted">{t('admin.student360.create.loadingYears')}</p>
        ) : optionsError ? (
          <div className="col" style={{ gap: 6 }}>
            <p className="tiny" style={{ color: 'var(--danger)' }}>
              {t('admin.student360.create.optionsLoadError')}
            </p>
            {onRetryOptions ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onRetryOptions}>
                {t('common.retry')}
              </button>
            ) : null}
          </div>
        ) : (
          <select
            className="input"
            value={state.academicYearId}
            onChange={(e) => onChange({ academicYearId: e.target.value })}
            disabled={optionsLoading}
          >
            <option value="">{t('common.dash')}</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('admin.student360.create.cycle')} error={errors.cycleId}>
        {cyclesLoading && cycles.length === 0 ? (
          <p className="tiny muted">{t('admin.student360.create.loadingCycles')}</p>
        ) : (
          <select
            className="input"
            value={state.cycleId}
            onChange={(e) => onCycleChange(e.target.value)}
            disabled={optionsLoading || cyclesLoading}
          >
            <option value="">{t('admin.student360.create.selectCycle')}</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t('nav.levels')} error={errors.levelId}>
        <select
          className="input"
          value={state.levelId}
          onChange={(e) => onLevelChange(e.target.value)}
          disabled={optionsLoading || cyclesLoading || !state.cycleId}
        >
          <option value="">{levelPlaceholder}</option>
          {state.cycleId && !optionsLoading
            ? levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.display_alias ?? l.name ?? l.code}
                </option>
              ))
            : null}
        </select>
      </Field>
      <Field label={t('nav.classes')} error={errors.classId}>
        <select
          className="input"
          value={state.classId}
          onChange={(e) => onChange({ classId: e.target.value })}
          disabled={optionsLoading || !state.levelId || (state.levelId !== '' && !optionsLoading && classes.length === 0)}
        >
          <option value="">{classPlaceholder}</option>
          {state.levelId && !optionsLoading
            ? classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name ?? c.display_alias ?? c.name ?? c.id}
                </option>
              ))
            : null}
        </select>
        {!state.classId && state.levelId ? (
          <span className="tiny muted">{t('admin.student360.create.classOptionalHint')}</span>
        ) : null}
      </Field>
      <Field label={t('admin.student360.registrationType')}>
        <select
          className="input"
          value={state.registrationType}
          onChange={(e) => onChange({ registrationType: e.target.value })}
          disabled={optionsLoading}
        >
          {registrationTypes.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('admin.student360.actualJoinDate')} error={errors.actualJoinDate}>
        <input
          className="input"
          type="date"
          value={state.actualJoinDate}
          onChange={(e) => onChange({ actualJoinDate: e.target.value })}
        />
      </Field>
      <Field label={t('admin.student360.isRepeating')}>
        <label className="student-create-form__checkbox">
          <input
            type="checkbox"
            checked={state.isRepeating}
            onChange={(e) => onChange({ isRepeating: e.target.checked })}
          />
          <span className="student-create-form__checkbox-text">
            <span>{t('admin.student360.isRepeating')}</span>
            <span className="tiny muted">{t('admin.student360.create.repeatingHint')}</span>
          </span>
        </label>
      </Field>
      {showPrevious ? (
        <Field label={t('admin.student360.previousSchool')} error={errors.previousSchool}>
          <input
            className="input"
            value={state.previousSchool}
            onChange={(e) => onChange({ previousSchool: e.target.value })}
          />
        </Field>
      ) : null}
      <Field label={t('admin.student360.registrationNotes')}>
        <textarea
          className="input"
          rows={2}
          value={state.registrationNotes}
          onChange={(e) => onChange({ registrationNotes: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function StudentAdmissionDataFields({
  state,
  onChange,
}: {
  state: StudentProfileFormState;
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();

  return (
    <div className="student-360-form__grid">
      <Field label={t('admin.student360.admissionData.externalReference')}>
        <input
          className="input"
          dir="ltr"
          value={state.externalReference}
          onChange={(e) => onChange({ externalReference: e.target.value })}
        />
      </Field>
      <Field label={t('admin.student360.admissionData.residenceAddress')}>
        <input
          className="input"
          value={state.residenceAddress}
          onChange={(e) => onChange({ residenceAddress: e.target.value })}
        />
      </Field>
      <Field label={t('admin.student360.admissionData.previousSchool')}>
        <input
          className="input"
          value={state.previousSchool}
          onChange={(e) => onChange({ previousSchool: e.target.value })}
        />
      </Field>
      <Field label={t('admin.student360.admissionData.admissionNotes')}>
        <textarea
          className="input"
          rows={2}
          value={state.admissionNotes}
          onChange={(e) => onChange({ admissionNotes: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function StudentAdmissionAndSiblingsFields({
  state,
  onChange,
}: {
  state: StudentProfileFormState;
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();

  return (
    <div className="col" style={{ gap: 16 }}>
      <div>
        <h3 className="student-create-form__subsection-title">
          {t('admin.student360.admissionData.registrationSectionTitle')}
        </h3>
        <StudentAdmissionDataFields state={state} onChange={onChange} />
      </div>
      <div>
        <h3 className="student-create-form__subsection-title">{t('admin.siblings.sectionTitle')}</h3>
        <SiblingsFormFields
          hasSiblings={state.hasSiblings}
          siblingsRawText={state.siblingsRawText}
          siblingsLevels={state.siblingsLevels}
          siblingLines={state.siblingLines}
          onChange={(patch) => {
            const next: Partial<StudentProfileFormState> = {};
            if (patch.hasSiblings != null) next.hasSiblings = patch.hasSiblings;
            if (patch.siblingsRawText != null) next.siblingsRawText = patch.siblingsRawText;
            if (patch.siblingsLevels != null) next.siblingsLevels = patch.siblingsLevels;
            if (patch.siblingLines != null) next.siblingLines = patch.siblingLines;
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}
