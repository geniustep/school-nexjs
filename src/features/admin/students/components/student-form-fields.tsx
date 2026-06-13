'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { StudentNationalityOption } from '@/types/student-360';
import type { StudentProfileFieldErrors, StudentProfileFormState } from '../utils/student-profile';

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
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    return options
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          (n.code?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 80);
  }, [options, query]);

  return (
    <div className="col" style={{ gap: 6 }}>
      <input
        className="input"
        type="search"
        placeholder={t('admin.student360.searchNationality')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{t('common.dash')}</option>
        {filtered.map((n) => (
          <option key={n.id} value={n.id}>
            {n.code ? `${n.name} (${n.code})` : n.name}
          </option>
        ))}
      </select>
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
          {genders.map((g) => (
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
