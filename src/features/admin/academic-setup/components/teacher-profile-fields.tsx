'use client';

import type { TeacherOption, TeacherOptions, TeacherProfileFieldErrors, TeacherProfileFormState } from '@/types/teacher';
import { useT } from '@/features/i18n/locale-context';
import { SPECIALIZATION_DEFAULT_MAX, hasTeacherGenderOptions, resolveGenderLabel } from '../utils/teacher-profile';

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="teacher-setup-field-group">
      <h3 className="teacher-setup-field-group__title">{title}</h3>
      <div className="teacher-setup-field-group__body">{children}</div>
    </section>
  );
}

function OptionField({
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  allowEmpty,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: TeacherOption[];
  disabled?: boolean;
  error?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <label className="teacher-setup-field">
      <span className="teacher-setup-field__label">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {allowEmpty ? <option value="">{emptyLabel ?? label}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="teacher-setup-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TeacherProfileFields({
  state,
  options,
  errors,
  creating,
  saving,
  onChange,
  showEmailField = true,
  legacyGender = null,
}: {
  state: TeacherProfileFormState;
  options: TeacherOptions | null;
  errors: TeacherProfileFieldErrors;
  creating: boolean;
  saving: boolean;
  onChange: (patch: Partial<TeacherProfileFormState>) => void;
  showEmailField?: boolean;
  /** Existing gender not in official options — read-only display only. */
  legacyGender?: string | null;
}) {
  const t = useT();
  const hoursUnit = t('admin.academicSetup.teacherForm.units.hours');
  const minutesUnit = t('admin.academicSetup.teacherForm.units.minutes');
  const minHours = options?.constraints.weeklyHours?.min ?? 0;
  const minContinuous = options?.constraints.maxContinuousMinutes?.min ?? 1;
  const specializationMax =
    options?.constraints.specialization?.max && options.constraints.specialization.max > 0
      ? options.constraints.specialization.max
      : SPECIALIZATION_DEFAULT_MAX;
  const showSchoolPicker = (options?.schools.length ?? 0) > 1;
  const genderOptionsAvailable = hasTeacherGenderOptions(options);
  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  return (
    <>
      <FieldGroup title={t('admin.academicSetup.teacherForm.groups.personal')}>
        <label className="teacher-setup-field">
          <span className="teacher-setup-field__label">
            {t('admin.fullName')} <span aria-hidden="true">*</span>
          </span>
          <input
            className="input"
            value={state.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            disabled={saving}
            autoFocus
          />
          {errors.name ? (
            <span className="teacher-setup-field__error" role="alert">
              {errors.name}
            </span>
          ) : null}
        </label>

        <div className="teacher-setup-form__grid">
          {genderOptionsAvailable ? (
            <OptionField
              label={t('admin.academicSetup.teacherForm.gender')}
              value={state.gender}
              onChange={(gender) => onChange({ gender })}
              options={options?.genders ?? []}
              disabled={saving || !options}
              error={errors.gender}
              allowEmpty
              emptyLabel={t('admin.academicSetup.teacherForm.genderEmpty')}
            />
          ) : (
            <div className="teacher-setup-field">
              <span className="teacher-setup-field__label">{t('admin.academicSetup.teacherForm.gender')}</span>
              {legacyGender ? (
                <p className="teacher-setup-field__readonly muted">
                  {resolveGenderLabel(legacyGender, options, t)}
                </p>
              ) : null}
              <p className="teacher-setup-form__hint muted" role="status">
                {t('admin.academicSetup.teacherForm.genderOptionsUnavailable')}
              </p>
            </div>
          )}
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">{t('admin.academicSetup.teacherForm.dateOfBirth')}</span>
            <input
              className="input"
              type="date"
              value={state.dateOfBirth}
              max={today}
              onChange={(e) => onChange({ dateOfBirth: e.target.value })}
              disabled={saving}
            />
            {errors.dateOfBirth ? (
              <span className="teacher-setup-field__error" role="alert">
                {errors.dateOfBirth}
              </span>
            ) : null}
          </label>
        </div>

        <div className="teacher-setup-form__grid">
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">{t('admin.phone')}</span>
            <input
              className="input"
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              disabled={saving}
            />
          </label>
          {showEmailField ? (
            <label className="teacher-setup-field">
              <span className="teacher-setup-field__label">{t('admin.email')}</span>
              <input
                className="input"
                type="text"
                autoComplete="email"
                value={state.email}
                onChange={(e) => onChange({ email: e.target.value })}
                disabled={saving}
              />
            </label>
          ) : null}
        </div>
      </FieldGroup>

      <FieldGroup title={t('admin.academicSetup.teacherForm.groups.professional')}>
        <div className="teacher-setup-form__grid">
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">{t('admin.code')}</span>
            <input
              className="input"
              value={state.code}
              onChange={(e) => onChange({ code: e.target.value })}
              disabled={saving}
            />
          </label>
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">{t('admin.academicSetup.teacherForm.specialization')}</span>
            <input
              className="input"
              value={state.specialization}
              maxLength={specializationMax}
              onChange={(e) => onChange({ specialization: e.target.value.trimStart() })}
              onBlur={(e) => onChange({ specialization: e.target.value.trim() })}
              disabled={saving}
            />
            {errors.specialization ? (
              <span className="teacher-setup-field__error" role="alert">
                {errors.specialization}
              </span>
            ) : null}
          </label>
        </div>

        <OptionField
          label={t('admin.academicSetup.teacherForm.teacherType')}
          value={state.teacherType}
          onChange={(teacherType) => onChange({ teacherType })}
          options={options?.teacherTypes ?? []}
          disabled={saving || !options}
          error={errors.teacherType}
        />

        <OptionField
          label={t('admin.academicSetup.teacherForm.qualification')}
          value={state.qualification}
          onChange={(qualification) => onChange({ qualification })}
          options={options?.qualifications ?? []}
          disabled={saving || !options}
          error={errors.qualification}
          allowEmpty
          emptyLabel={t('admin.academicSetup.teacherForm.qualificationEmpty')}
        />

        {showSchoolPicker ? (
          <OptionField
            label={t('admin.academicSetup.teacherForm.school')}
            value={state.schoolId}
            onChange={(schoolId) => onChange({ schoolId })}
            options={(options?.schools ?? []).map((school) => ({
              value: String(school.id),
              label: school.name,
            }))}
            disabled={saving || !options}
            error={errors.schoolId}
          />
        ) : null}

        {!creating ? (
          <>
            <OptionField
              label={t('admin.academicSetup.teacherForm.status')}
              value={state.status}
              onChange={(status) => onChange({ status })}
              options={options?.statuses ?? []}
              disabled={saving || !options}
              error={errors.status}
            />
            <label className="teacher-setup-field teacher-setup-field--checkbox row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={state.active}
                onChange={(e) => onChange({ active: e.target.checked })}
                disabled={saving}
              />
              <span>{t('admin.academicSetup.teacherForm.active')}</span>
            </label>
            {errors.active ? (
              <span className="teacher-setup-field__error" role="alert">
                {errors.active}
              </span>
            ) : null}
          </>
        ) : null}
      </FieldGroup>

      <FieldGroup title={t('admin.academicSetup.teacherForm.groups.workload')}>
        <div className="teacher-setup-form__grid">
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">
              {t('admin.academicSetup.teacherForm.weeklyHoursTarget')} ({hoursUnit})
            </span>
            <input
              className="input"
              type="number"
              min={minHours}
              value={state.weeklyHoursTarget}
              onChange={(e) => onChange({ weeklyHoursTarget: e.target.value })}
              disabled={saving}
            />
            {errors.weeklyHoursTarget ? (
              <span className="teacher-setup-field__error" role="alert">
                {errors.weeklyHoursTarget}
              </span>
            ) : null}
          </label>
          <label className="teacher-setup-field">
            <span className="teacher-setup-field__label">
              {t('admin.academicSetup.teacherForm.weeklyHoursMax')} ({hoursUnit})
            </span>
            <input
              className="input"
              type="number"
              min={minHours}
              value={state.weeklyHoursMax}
              onChange={(e) => onChange({ weeklyHoursMax: e.target.value })}
              disabled={saving}
            />
            {errors.weeklyHoursMax ? (
              <span className="teacher-setup-field__error" role="alert">
                {errors.weeklyHoursMax}
              </span>
            ) : null}
          </label>
        </div>

        <label className="teacher-setup-field">
          <span className="teacher-setup-field__label">
            {t('admin.academicSetup.teacherForm.maxContinuousMinutes')} ({minutesUnit})
          </span>
          <input
            className="input"
            type="number"
            min={minContinuous}
            value={state.maxContinuousMinutes}
            onChange={(e) => onChange({ maxContinuousMinutes: e.target.value })}
            disabled={saving}
          />
          {errors.maxContinuousMinutes ? (
            <span className="teacher-setup-field__error" role="alert">
              {errors.maxContinuousMinutes}
            </span>
          ) : null}
        </label>

        <label className="teacher-setup-field teacher-setup-field--checkbox row" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={state.preferCompactSchedule}
            onChange={(e) => onChange({ preferCompactSchedule: e.target.checked })}
            disabled={saving}
          />
          <span>{t('admin.academicSetup.teacherForm.preferCompactSchedule')}</span>
        </label>
        <p className="teacher-setup-form__hint">{t('admin.academicSetup.teacherForm.preferCompactScheduleHint')}</p>
      </FieldGroup>
    </>
  );
}
