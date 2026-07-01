'use client';

import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { SiblingsFormFields } from '@/features/admin/admissions/components/siblings-form-fields';
import type { StudentNationalityOption, StudentSummary } from '@/types/student-360';
import type { StudentProfileFieldErrors, StudentProfileFormState } from '../utils/student-profile';
import {
  localizeStudentGenderOptions,
  requiresDepartureReason,
  sortNationalityOptions,
  todayIsoDate,
  displayCountryState,
} from '../utils/student-profile';
import { normalizeMassarCodeInput } from '../utils/massar-code';

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="tiny muted">{label}</span>
      {children}
      {hint ? <span className="tiny muted">{hint}</span> : null}
      {error ? (
        <span className="tiny" style={{ color: 'var(--danger)' }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** Field layout aligned with student create / enrollment intake forms. */
function EditField({
  label,
  error,
  hint,
  layout = 'default',
  field,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  layout?: 'default' | 'half' | 'full';
  field?: string;
  children: React.ReactNode;
}) {
  const cellClass =
    layout === 'full'
      ? 'student-create-form__cell student-create-form__cell--full'
      : layout === 'half'
        ? 'student-create-form__cell student-create-form__cell--half'
        : 'student-create-form__cell';

  return (
    <div className={cellClass} {...(field ? { 'data-field': field } : {})}>
      <label className={`student-create-field${error ? ' student-create-field--invalid' : ''}`}>
        <span className="student-create-field__label">{label}</span>
        {children}
        {hint ? <span className="student-create-field__hint">{hint}</span> : null}
        {error ? <span className="student-create-field__error">{error}</span> : null}
      </label>
    </div>
  );
}

function EditFieldGroup({
  title,
  icon,
  layout = 'grid',
  children,
}: {
  title: string;
  icon: string;
  layout?: 'grid' | 'stack';
  children: React.ReactNode;
}) {
  return (
    <div className="student-create-form__group">
      <div className="student-create-form__group-head">
        <span className="student-create-form__group-icon" aria-hidden="true">
          {icon}
        </span>
        <h3 className="student-create-form__group-title">{title}</h3>
      </div>
      {layout === 'stack' ? (
        <div className="student-create-form__group-stack">{children}</div>
      ) : (
        <div className="student-create-form__grid">{children}</div>
      )}
    </div>
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
  const showDeparture = requiresDepartureReason(state.status);
  const localizedGenders = useMemo(
    () => localizeStudentGenderOptions(genders, t),
    [genders, t],
  );
  const birthDateMax = useMemo(() => todayIsoDate(), []);

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
        <DatePickerInput
          value={state.dateOfBirth}
          onChange={(dateOfBirth) => onChange({ dateOfBirth })}
          max={birthDateMax}
          presets={false}
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
      <Field
        label={t('admin.massarCode')}
        error={errors.massarCode}
        hint={t('admin.student360.create.massarCodeHint')}
      >
        <input
          className="input"
          value={state.massarCode}
          onChange={(e) => onChange({ massarCode: e.target.value })}
          onBlur={() => {
            const normalized = normalizeMassarCodeInput(state.massarCode);
            if (normalized !== state.massarCode) onChange({ massarCode: normalized });
          }}
          dir="ltr"
          autoComplete="off"
        />
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
        <DatePickerInput
          value={state.admissionDate}
          onChange={(admissionDate) => onChange({ admissionDate })}
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
    <>
      <EditFieldGroup title={t('admin.student360.sections.contact')} icon="☎">
        <EditField label={t('admin.phone')}>
          <input
            className="input"
            value={state.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            dir="ltr"
            autoComplete="off"
          />
        </EditField>
        <EditField label={t('admin.student360.mobile')}>
          <input
            className="input"
            value={state.mobile}
            onChange={(e) => onChange({ mobile: e.target.value })}
            dir="ltr"
            autoComplete="off"
          />
        </EditField>
        <EditField field="email" label={t('admin.email')} error={errors.email}>
          <input
            className="input"
            type="email"
            value={state.email}
            onChange={(e) => onChange({ email: e.target.value })}
            dir="ltr"
            autoComplete="off"
          />
        </EditField>
      </EditFieldGroup>

      <EditFieldGroup title={t('admin.enrollmentIntake.groups.address')} icon="⌂">
        <EditField layout="full" label={t('admin.student360.admissionData.residenceAddress')}>
          <input
            className="input"
            value={state.residenceAddress}
            onChange={(e) => onChange({ residenceAddress: e.target.value })}
            placeholder={t('admin.enrollmentIntake.residenceAddressHint')}
          />
        </EditField>
        <EditField label={t('admin.student360.street')}>
          <input className="input" value={state.street} onChange={(e) => onChange({ street: e.target.value })} />
        </EditField>
        <EditField label={t('admin.student360.district')}>
          <input className="input" value={state.district} onChange={(e) => onChange({ district: e.target.value })} />
        </EditField>
        <EditField label={t('admin.student360.city')}>
          <input className="input" value={state.city} onChange={(e) => onChange({ city: e.target.value })} />
        </EditField>
        <EditField label={t('admin.student360.zip')}>
          <input
            className="input"
            value={state.zip}
            onChange={(e) => onChange({ zip: e.target.value })}
            dir="ltr"
          />
        </EditField>
      </EditFieldGroup>
    </>
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
    <EditFieldGroup title={t('admin.student360.editPage.tabs.emergency')} icon="⚠" layout="stack">
      {canFillFromPrimary && onFillFromPrimary ? (
        <div className="student-create-form__notice">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onFillFromPrimary}>
            {t('admin.student360.usePrimaryGuardianEmergency')}
          </button>
        </div>
      ) : null}
      <div className="student-create-form__grid">
        <EditField label={t('admin.student360.emergencyContactName')}>
          <input
            className="input"
            value={state.emergencyContactName}
            onChange={(e) => onChange({ emergencyContactName: e.target.value })}
          />
        </EditField>
        <EditField label={t('admin.student360.emergencyRelationship')}>
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
        </EditField>
        <EditField field="emergencyPhone" label={t('admin.student360.emergencyPhone')} error={errors.emergencyPhone}>
          <input
            className="input"
            value={state.emergencyPhone}
            onChange={(e) => onChange({ emergencyPhone: e.target.value })}
            dir="ltr"
          />
        </EditField>
        <EditField label={t('admin.student360.emergencyPhoneAlt')}>
          <input
            className="input"
            value={state.emergencyPhoneAlt}
            onChange={(e) => onChange({ emergencyPhoneAlt: e.target.value })}
            dir="ltr"
          />
        </EditField>
        <EditField layout="full" label={t('admin.student360.emergencyNotes')}>
          <textarea
            className="input"
            rows={2}
            value={state.emergencyNotes}
            onChange={(e) => onChange({ emergencyNotes: e.target.value })}
          />
        </EditField>
      </div>
    </EditFieldGroup>
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
  const birthDateMax = useMemo(() => todayIsoDate(), []);

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
        <DatePickerInput
          value={state.dateOfBirth}
          onChange={(dateOfBirth) => onChange({ dateOfBirth })}
          max={birthDateMax}
          presets={false}
        />
      </Field>
      <div data-field="massarCode">
        <Field
          label={t('admin.massarCode')}
          error={errors.massarCode}
          hint={fieldHints?.massarCode ?? t('admin.student360.create.massarCodeHint')}
        >
          <input
            className="input"
            value={state.massarCode}
            onChange={(e) => onChange({ massarCode: e.target.value })}
            onBlur={() => {
              const normalized = normalizeMassarCodeInput(state.massarCode);
              if (normalized !== state.massarCode) onChange({ massarCode: normalized });
            }}
            dir="ltr"
            autoComplete="off"
          />
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
        <DatePickerInput
          value={state.admissionDate}
          onChange={(admissionDate) => onChange({ admissionDate })}
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

export function StudentPersonalNameFields({
  state,
  errors,
  optionsLoading,
  genders,
  nationalities,
  onChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  optionsLoading: boolean;
  genders: { value: string; label: string }[];
  nationalities: StudentNationalityOption[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();
  const localizedGenders = useMemo(
    () => localizeStudentGenderOptions(genders, t),
    [genders, t],
  );
  const birthDateMax = useMemo(() => todayIsoDate(), []);
  const fullNameAr = [state.firstName.trim(), state.lastName.trim()].filter(Boolean).join(' ');
  const fullNameFr = [state.firstNameLatin.trim(), state.lastNameLatin.trim()].filter(Boolean).join(' ');

  return (
    <>
      <EditFieldGroup title={t('admin.enrollmentIntake.groups.names')} icon="أ">
        <EditField
          field="firstName"
          label={t('admin.student360.create.firstNameAr')}
          error={errors.firstName}
        >
          <input
            className="input"
            value={state.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            autoComplete="off"
            required
          />
        </EditField>
        <EditField
          field="lastName"
          label={t('admin.student360.create.lastNameAr')}
          error={errors.lastName}
        >
          <input
            className="input"
            value={state.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            autoComplete="off"
            required
          />
        </EditField>
        <EditField label={t('admin.student360.create.firstNameLatin')}>
          <input
            className="input"
            value={state.firstNameLatin}
            onChange={(e) => onChange({ firstNameLatin: e.target.value })}
            dir="ltr"
            autoComplete="off"
          />
        </EditField>
        <EditField label={t('admin.student360.create.lastNameLatin')}>
          <input
            className="input"
            value={state.lastNameLatin}
            onChange={(e) => onChange({ lastNameLatin: e.target.value })}
            dir="ltr"
            autoComplete="off"
          />
        </EditField>
        {fullNameAr || fullNameFr ? (
          <div className="student-create-form__name-preview student-create-form__cell--full">
            {fullNameAr ? (
              <div className="student-create-form__name-preview-row">
                <span className="student-create-form__name-preview-tag">عربي</span>
                <span className="student-create-form__name-preview-value" dir="auto">
                  {fullNameAr}
                </span>
              </div>
            ) : null}
            {fullNameFr ? (
              <div className="student-create-form__name-preview-row">
                <span className="student-create-form__name-preview-tag">FR</span>
                <span className="student-create-form__name-preview-value" dir="ltr">
                  {fullNameFr}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </EditFieldGroup>

      <EditFieldGroup title={t('admin.enrollmentIntake.groups.personal')} icon="◉">
        <EditField label={t('admin.gender')}>
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
        </EditField>
        <EditField field="dateOfBirth" label={t('admin.dateOfBirth')} error={errors.dateOfBirth}>
          <DatePickerInput
            value={state.dateOfBirth}
            onChange={(dateOfBirth) => onChange({ dateOfBirth })}
            max={birthDateMax}
            presets={false}
          />
        </EditField>
        <EditField label={t('admin.student360.birthPlace')}>
          <input
            className="input"
            value={state.birthPlace}
            onChange={(e) => onChange({ birthPlace: e.target.value })}
          />
        </EditField>
        <EditField label={t('admin.student360.nationality')}>
          <StudentNationalitySelect
            value={state.nationalityId}
            options={nationalities}
            disabled={optionsLoading}
            onChange={(nationalityId) => onChange({ nationalityId })}
          />
        </EditField>
      </EditFieldGroup>
    </>
  );
}

export function StudentIdentityCodeFields({
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
    <EditFieldGroup title={t('admin.enrollmentIntake.groups.identifiers')} icon="#">
      <EditField
        field="massarCode"
        label={t('admin.massarCode')}
        error={errors.massarCode}
        hint={t('admin.student360.create.massarCodeHint')}
      >
        <input
          className="input"
          value={state.massarCode}
          onChange={(e) => onChange({ massarCode: e.target.value })}
          onBlur={() => {
            const normalized = normalizeMassarCodeInput(state.massarCode);
            if (normalized !== state.massarCode) onChange({ massarCode: normalized });
          }}
          dir="ltr"
          autoComplete="off"
        />
      </EditField>
      <EditField
        label={t('admin.studentCode')}
        hint={t('admin.student360.create.internalCodeHint')}
      >
        <input
          className="input"
          value={state.code}
          onChange={(e) => onChange({ code: e.target.value })}
          dir="ltr"
        />
      </EditField>
      <EditField label={t('admin.student360.schoolNumber')} error={errors.schoolNumber}>
        <input
          className="input"
          value={state.schoolNumber}
          onChange={(e) => onChange({ schoolNumber: e.target.value })}
          dir="ltr"
        />
      </EditField>
      <EditField label={t('admin.student360.admissionData.externalReference')}>
        <input
          className="input"
          dir="ltr"
          value={state.externalReference}
          onChange={(e) => onChange({ externalReference: e.target.value })}
        />
      </EditField>
    </EditFieldGroup>
  );
}

export function StudentAdminStatusFields({
  state,
  errors,
  optionsLoading,
  statuses,
  onChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  optionsLoading: boolean;
  statuses: { value: string; label: string }[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();
  const showDeparture = requiresDepartureReason(state.status);

  return (
    <EditFieldGroup title={t('admin.student360.editPage.tabs.admin')} icon="◇" layout="stack">
      <div className="student-create-form__grid">
        <EditField label={t('admin.student360.studentStatus')}>
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
        </EditField>
        <EditField label={t('admin.student360.editPage.active')}>
          <label className="student-create-form__checkbox">
            <input
              type="checkbox"
              checked={state.active}
              onChange={(e) => onChange({ active: e.target.checked })}
            />
            <span className="student-create-form__checkbox-text">
              {t('admin.student360.editPage.activeHint')}
            </span>
          </label>
        </EditField>
        {showDeparture ? (
          <EditField label={t('admin.student360.departureReason')} error={errors.departureReason}>
            <input
              className="input"
              value={state.departureReason}
              onChange={(e) => onChange({ departureReason: e.target.value })}
            />
          </EditField>
        ) : null}
        <EditField layout="full" label={t('admin.student360.editPage.adminNotes')}>
          <textarea
            className="input"
            rows={3}
            value={state.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </EditField>
        <EditField layout="full" label={t('admin.student360.admissionData.admissionNotes')}>
          <textarea
            className="input"
            rows={2}
            value={state.admissionNotes}
            onChange={(e) => onChange({ admissionNotes: e.target.value })}
          />
        </EditField>
      </div>
    </EditFieldGroup>
  );
}

export function StudentEnrollmentEditFields({
  state,
  errors,
  optionsLoading,
  schoolName,
  levelName,
  academicYearName,
  classes,
  registrationTypes,
  onChange,
}: {
  state: StudentProfileFormState;
  errors: StudentProfileFieldErrors;
  optionsLoading: boolean;
  schoolName: string;
  levelName: string;
  academicYearName: string;
  classes: { id: number; name: string; display_name?: string | null; display_alias?: string | null }[];
  registrationTypes: { value: string; label: string }[];
  onChange: (patch: Partial<StudentProfileFormState>) => void;
}) {
  const t = useT();
  const showPrevious = state.registrationType === 'transfer';
  const showRepeating = state.registrationType === 're_enrollment';

  return (
    <>
      <EditFieldGroup title={t('admin.enrollmentIntake.groups.academicStructure')} icon="◈">
        <EditField label={t('admin.finance.activeSchool')}>
          <input className="input" value={schoolName} readOnly disabled />
        </EditField>
        <EditField label={t('admin.academicYearId')}>
          <input className="input" value={academicYearName} readOnly disabled />
        </EditField>
        <EditField label={t('nav.levels')}>
          <input className="input" value={levelName} readOnly disabled />
        </EditField>
        <EditField label={t('nav.classes')} error={errors.classId}>
          <select
            className="input"
            value={state.classId}
            onChange={(e) => onChange({ classId: e.target.value })}
            disabled={optionsLoading}
          >
            <option value="">{t('admin.selectClass')}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name ?? c.display_alias ?? c.name ?? c.id}
              </option>
            ))}
          </select>
        </EditField>
      </EditFieldGroup>

      <EditFieldGroup title={t('admin.enrollmentIntake.groups.registrationDetails')} icon="✎" layout="stack">
        <div className="student-create-form__grid">
          <EditField label={t('admin.admissionDate')}>
            <DatePickerInput
              value={state.admissionDate}
              onChange={(admissionDate) => onChange({ admissionDate })}
            />
          </EditField>
          <EditField label={t('admin.student360.registrationType')}>
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
          </EditField>
          <EditField label={t('admin.student360.actualJoinDate')} error={errors.actualJoinDate}>
            <input
              className="input"
              type="date"
              value={state.actualJoinDate}
              onChange={(e) => onChange({ actualJoinDate: e.target.value })}
            />
          </EditField>
          {showPrevious ? (
            <EditField label={t('admin.student360.previousSchool')} error={errors.previousSchool}>
              <input
                className="input"
                value={state.previousSchool}
                onChange={(e) => onChange({ previousSchool: e.target.value })}
              />
            </EditField>
          ) : null}
          {showRepeating ? (
            <EditField label={t('admin.student360.isRepeating')}>
              <label className="student-create-form__checkbox">
                <input
                  type="checkbox"
                  checked={state.isRepeating}
                  onChange={(e) => onChange({ isRepeating: e.target.checked })}
                />
                <span className="student-create-form__checkbox-text">
                  {t('admin.student360.isRepeatingHint')}
                </span>
              </label>
            </EditField>
          ) : (
            <EditField label={t('admin.student360.isRepeating')}>
              <label className="student-create-form__checkbox">
                <input
                  type="checkbox"
                  checked={state.isRepeating}
                  onChange={(e) => onChange({ isRepeating: e.target.checked })}
                />
                <span className="student-create-form__checkbox-text">
                  {t('admin.student360.isRepeatingOptional')}
                </span>
              </label>
            </EditField>
          )}
          <EditField layout="full" label={t('admin.student360.registrationNotes')}>
            <textarea
              className="input"
              rows={2}
              value={state.registrationNotes}
              onChange={(e) => onChange({ registrationNotes: e.target.value })}
            />
          </EditField>
        </div>
        <p className="student-create-form__footnote">{t('admin.student360.admissionVsJoinHint')}</p>
      </EditFieldGroup>
    </>
  );
}

export function StudentEditReadonlyLocationFields({
  stateLabel,
  countryLabel,
  displayAge,
}: {
  stateLabel: string;
  countryLabel: string;
  displayAge?: string | null;
}) {
  const t = useT();
  const hasLocation = Boolean(stateLabel.trim() || countryLabel.trim());

  return (
    <EditFieldGroup
      title={t('admin.student360.editPage.locationReadonly')}
      icon="⌖"
      layout="stack"
    >
      <p className="student-create-form__footnote student-edit-location-meta__hint">
        {t('admin.student360.editPage.locationDerivedHint')}
      </p>
      {hasLocation ? (
        <dl className="student-edit-location-meta__list">
          <div className="student-edit-location-meta__item">
            <dt>{t('admin.student360.state')}</dt>
            <dd>{stateLabel || t('common.dash')}</dd>
          </div>
          <div className="student-edit-location-meta__item">
            <dt>{t('admin.student360.country')}</dt>
            <dd>{countryLabel || t('common.dash')}</dd>
          </div>
        </dl>
      ) : null}
      {displayAge ? (
        <div className="student-edit-location-meta__age">
          <span className="student-edit-location-meta__age-label">{t('admin.student360.header.age')}</span>
          <span className="student-edit-location-meta__age-value">{displayAge}</span>
          <span className="student-edit-location-meta__age-hint">{t('admin.student360.editPage.readonlyHint')}</span>
        </div>
      ) : null}
    </EditFieldGroup>
  );
}

export function studentLocationLabels(
  student: Pick<StudentSummary, 'state' | 'country'>,
): { stateLabel: string; countryLabel: string } {
  return {
    stateLabel: displayCountryState(student.state),
    countryLabel: displayCountryState(student.country),
  };
}
