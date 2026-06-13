'use client';

import type { TeacherOption, TeacherOptions, TeacherProfileFieldErrors, TeacherProfileFormState } from '@/types/teacher';
import { useT } from '@/features/i18n/locale-context';

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
}: {
  state: TeacherProfileFormState;
  options: TeacherOptions | null;
  errors: TeacherProfileFieldErrors;
  creating: boolean;
  saving: boolean;
  onChange: (patch: Partial<TeacherProfileFormState>) => void;
  showEmailField?: boolean;
}) {
  const t = useT();
  const hoursUnit = t('admin.academicSetup.teacherForm.units.hours');
  const minutesUnit = t('admin.academicSetup.teacherForm.units.minutes');
  const minHours = options?.constraints.weeklyHours?.min ?? 0;
  const minContinuous = options?.constraints.maxContinuousMinutes?.min ?? 1;
  const showSchoolPicker = (options?.schools.length ?? 0) > 1;

  return (
    <>
      <FieldGroup title={t('admin.academicSetup.teacherForm.groups.account')}>
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
            <span className="teacher-setup-field__label">{t('admin.phone')}</span>
            <input
              className="input"
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              disabled={saving}
            />
          </label>
        </div>

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
      </FieldGroup>

      <FieldGroup title={t('admin.academicSetup.teacherForm.groups.professional')}>
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
