'use client';

import { useMemo } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { SiblingsFormFields } from '@/features/admin/admissions/components/siblings-form-fields';
import { StudentNationalitySelect } from '@/features/admin/students/components/student-form-fields';
import {
  localizeStudentGenderOptions,
  requiresPreviousSchool,
  resolveDefaultAcademicYearId,
  syncActualJoinDateFromAdmission,
  todayIsoDate,
} from '@/features/admin/students/utils/student-profile';
import { registrationTypeLabel } from '@/features/admin/students/utils/enrollment-labels';
import { normalizeMassarCodeInput } from '@/features/admin/students/utils/massar-code';
import type { StudentNationalityOption } from '@/types/student-360';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { EnrollmentClassSummaryPanel } from '@/features/admin/students/components/enrollment-class-summary-panel';
import type { EnrollmentIntakeFieldErrors, EnrollmentIntakePatch, EnrollmentIntakeValues } from './types';

function CreateField({
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
      <label className="student-create-field">
        <span className="student-create-field__label">{label}</span>
        {children}
        {hint ? <span className="student-create-field__hint">{hint}</span> : null}
        {error ? <span className="student-create-field__error">{error}</span> : null}
      </label>
    </div>
  );
}

function CreateFieldGroup({
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

export type EnrollmentIntakeCycleOption =
  | { mode: 'code'; code: string; name: string }
  | { mode: 'id'; id: number; name: string };

export interface EnrollmentIntakeAcademicOptions {
  cycleMode: 'code' | 'id';
  years: { id: number; name: string }[];
  cycles: EnrollmentIntakeCycleOption[];
  levels: { id: number; name: string; display_alias?: string | null; code?: string | null }[];
  streams: { id: number; name: string }[];
  classes: { id: number; name: string; display_name?: string | null; display_alias?: string | null }[];
  registrationTypes: { value: string; label: string }[];
  levelRequiresStream: boolean;
  optionsLoading: boolean;
  cyclesLoading?: boolean;
  optionsError?: boolean;
  onRetryOptions?: () => void;
  levelPlaceholder?: string;
  classPlaceholder?: string;
  streamRequired?: boolean;
  activeSchoolId?: number | null;
  showClassSummary?: boolean;
}

export interface EnrollmentIntakeGuardianOptions {
  relationships: { value?: string | number; id?: string | number; label: string }[];
  relationshipsLoading?: boolean;
  relationshipLoadFailed?: boolean;
}

export interface EnrollmentIntakeFollowUpOptions {
  sources: { id?: number; label: string }[];
  sourcesLoading?: boolean;
}

type IntakeProps = {
  values: EnrollmentIntakeValues;
  errors?: EnrollmentIntakeFieldErrors;
  fieldHints?: Partial<Record<'massarCode' | 'schoolNumber' | 'code', string>>;
  onPatch: (patch: EnrollmentIntakePatch) => void;
  optionsLoading?: boolean;
  genders: { value: string; label: string }[];
  nationalities: StudentNationalityOption[];
  requireArabicNames?: boolean;
  variant?: 'default' | 'studentCreate';
};

export function EnrollmentIntakeIdentityFields({
  values,
  errors = {},
  fieldHints,
  onPatch,
  optionsLoading = false,
  genders,
  nationalities,
  requireArabicNames = false,
  variant = 'default',
}: IntakeProps) {
  const t = useT();
  const isStudentCreate = variant === 'studentCreate';
  const fullNameAr = [values.firstNameAr.trim(), values.lastNameAr.trim()].filter(Boolean).join(' ');
  const fullNameFr = [values.firstNameFr.trim(), values.lastNameFr.trim()].filter(Boolean).join(' ');
  const localizedGenders = useMemo(
    () => localizeStudentGenderOptions(genders, t),
    [genders, t],
  );
  const birthDateMax = useMemo(() => todayIsoDate(), []);

  return (
    <div className="student-create-identity">
      <CreateFieldGroup title={t('admin.enrollmentIntake.groups.names')} icon="أ">
        <CreateField
          field="firstName"
          label={t('admin.student360.create.firstNameAr')}
          error={errors.firstNameAr}
        >
          <input
            className="input"
            value={values.firstNameAr}
            onChange={(e) => onPatch({ firstNameAr: e.target.value })}
            autoComplete="off"
            required={requireArabicNames}
          />
        </CreateField>
        <CreateField
          field="lastName"
          label={t('admin.student360.create.lastNameAr')}
          error={errors.lastNameAr}
        >
          <input
            className="input"
            value={values.lastNameAr}
            onChange={(e) => onPatch({ lastNameAr: e.target.value })}
            autoComplete="off"
            required={requireArabicNames}
          />
        </CreateField>
        <CreateField label={t('admin.student360.create.firstNameLatin')}>
          <input
            className="input"
            value={values.firstNameFr}
            onChange={(e) => onPatch({ firstNameFr: e.target.value })}
            dir="ltr"
            autoComplete="off"
          />
        </CreateField>
        <CreateField label={t('admin.student360.create.lastNameLatin')}>
          <input
            className="input"
            value={values.lastNameFr}
            onChange={(e) => onPatch({ lastNameFr: e.target.value })}
            dir="ltr"
            autoComplete="off"
          />
        </CreateField>
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
      </CreateFieldGroup>

      <CreateFieldGroup title={t('admin.enrollmentIntake.groups.personal')} icon="◉">
        <CreateField label={t('admin.gender')}>
          <select
            className="input"
            value={values.gender}
            onChange={(e) => onPatch({ gender: e.target.value })}
            disabled={optionsLoading}
          >
            <option value="">{t('common.dash')}</option>
            {localizedGenders.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </CreateField>
        <CreateField field="dateOfBirth" label={t('admin.dateOfBirth')} error={errors.birthDate}>
          <DatePickerInput
            value={values.birthDate}
            onChange={(birthDate) => onPatch({ birthDate })}
            max={birthDateMax}
            presets={false}
          />
        </CreateField>
        <CreateField label={t('admin.student360.birthPlace')}>
          <input
            className="input"
            value={values.birthPlace}
            onChange={(e) => onPatch({ birthPlace: e.target.value })}
          />
        </CreateField>
        <CreateField label={t('admin.student360.nationality')}>
          <StudentNationalitySelect
            value={values.nationalityId}
            options={nationalities}
            disabled={optionsLoading}
            onChange={(nationalityId) => onPatch({ nationalityId })}
          />
        </CreateField>
      </CreateFieldGroup>

      {isStudentCreate ? (
        <CreateFieldGroup title={t('admin.enrollmentIntake.groups.address')} icon="⌂">
          <CreateField layout="full" label={t('admin.student360.admissionData.residenceAddress')}>
            <input
              className="input"
              value={values.residenceAddress}
              onChange={(e) => onPatch({ residenceAddress: e.target.value })}
              placeholder={t('admin.enrollmentIntake.residenceAddressHint')}
            />
          </CreateField>
        </CreateFieldGroup>
      ) : null}

      {isStudentCreate ? (
        <CreateFieldGroup title={t('admin.enrollmentIntake.groups.admissionContext')} icon="◇">
          <CreateField
            label={t('admin.admissionDate')}
            hint={t('admin.student360.create.admissionDateHint')}
          >
            <DatePickerInput
              value={values.admissionDate}
              onChange={(admissionDate) => onPatch({ admissionDate })}
            />
          </CreateField>
          <CreateField
            field="massarCode"
            label={t('admin.massarCode')}
            error={errors.massarCode}
            hint={fieldHints?.massarCode ?? t('admin.student360.create.massarCodeHint')}
          >
            <input
              className="input"
              value={values.massarCode}
              onChange={(e) => onPatch({ massarCode: e.target.value })}
              onBlur={() => {
                const normalized = normalizeMassarCodeInput(values.massarCode);
                if (normalized !== values.massarCode) onPatch({ massarCode: normalized });
              }}
              dir="ltr"
              autoComplete="off"
            />
          </CreateField>
          <CreateField label={t('admin.student360.admissionData.previousSchool')}>
            <input
              className="input"
              value={values.previousSchool}
              onChange={(e) => onPatch({ previousSchool: e.target.value })}
            />
          </CreateField>
        </CreateFieldGroup>
      ) : null}

      {isStudentCreate ? (
        <CreateFieldGroup title={t('admin.student360.create.additionalInfo')} icon="✎">
          <CreateField layout="full" label={t('admin.enrollmentIntake.admissionNotes')}>
            <textarea
              className="input"
              rows={2}
              value={values.admissionNotes}
              onChange={(e) => onPatch({ admissionNotes: e.target.value })}
            />
          </CreateField>
        </CreateFieldGroup>
      ) : null}

      {!isStudentCreate ? (
      <CreateFieldGroup
        title={t('admin.enrollmentIntake.groups.identifiers')}
        icon="#"
      >
        <CreateField
          field="massarCode"
          label={t('admin.massarCode')}
          error={errors.massarCode}
          hint={fieldHints?.massarCode ?? t('admin.student360.create.massarCodeHint')}
        >
          <input
            className="input"
            value={values.massarCode}
            onChange={(e) => onPatch({ massarCode: e.target.value })}
            onBlur={() => {
              const normalized = normalizeMassarCodeInput(values.massarCode);
              if (normalized !== values.massarCode) onPatch({ massarCode: normalized });
            }}
            dir="ltr"
            autoComplete="off"
          />
        </CreateField>
        <CreateField
          field="schoolNumber"
          label={t('admin.student360.schoolNumber')}
          error={errors.schoolNumber}
          hint={fieldHints?.schoolNumber ?? t('admin.student360.create.schoolNumberOptionalHint')}
        >
          <input
            className="input"
            value={values.schoolNumber}
            onChange={(e) => onPatch({ schoolNumber: e.target.value })}
            dir="ltr"
          />
        </CreateField>
        <CreateField
          field="code"
          label={t('admin.studentCode')}
          error={errors.code}
          hint={fieldHints?.code ?? t('admin.student360.create.internalCodeHint')}
        >
          <input
            className="input"
            value={values.code}
            onChange={(e) => onPatch({ code: e.target.value })}
            dir="ltr"
          />
        </CreateField>
      </CreateFieldGroup>
      ) : null}

      {!isStudentCreate ? (
      <CreateFieldGroup title={t('admin.enrollmentIntake.groups.adminDates')} icon="ت">
        <CreateField
          label={t('admin.admissionDate')}
          hint={t('admin.student360.create.admissionDateHint')}
        >
          <DatePickerInput
            value={values.admissionDate}
            onChange={(admissionDate) => onPatch({ admissionDate })}
          />
        </CreateField>
      </CreateFieldGroup>
      ) : null}
    </div>
  );
}

export function EnrollmentIntakeAdmissionExtrasFields({
  values,
  onPatch,
  variant = 'default',
}: Pick<IntakeProps, 'values' | 'onPatch' | 'variant'>) {
  const t = useT();
  const isStudentCreate = variant === 'studentCreate';

  if (isStudentCreate) {
    return null;
  }

  return (
    <>
      <CreateFieldGroup title={t('admin.student360.admissionData.sectionTitle')} icon="◇">
        <CreateField layout="half" label={t('admin.student360.admissionData.externalReference')}>
          <input
            className="input"
            dir="ltr"
            value={values.externalReference}
            onChange={(e) => onPatch({ externalReference: e.target.value })}
          />
        </CreateField>
      </CreateFieldGroup>
      <CreateFieldGroup title={t('admin.enrollmentIntake.groups.address')} icon="⌂">
        <CreateField layout="full" label={t('admin.student360.admissionData.residenceAddress')}>
          <input
            className="input"
            value={values.residenceAddress}
            onChange={(e) => onPatch({ residenceAddress: e.target.value })}
            placeholder={t('admin.enrollmentIntake.residenceAddressHint')}
          />
        </CreateField>
        <CreateField label={t('admin.student360.street')}>
          <input
            className="input"
            value={values.street}
            onChange={(e) => onPatch({ street: e.target.value })}
          />
        </CreateField>
        <CreateField label={t('admin.student360.city')}>
          <input
            className="input"
            value={values.city}
            onChange={(e) => onPatch({ city: e.target.value })}
          />
        </CreateField>
        <CreateField label={t('admin.student360.zip')}>
          <input
            className="input"
            value={values.zip}
            onChange={(e) => onPatch({ zip: e.target.value })}
            dir="ltr"
          />
        </CreateField>
      </CreateFieldGroup>
      <CreateFieldGroup title={t('admin.enrollmentIntake.groups.admissionContext')} icon="◇">
        <CreateField label={t('admin.student360.admissionData.previousSchool')}>
          <input
            className="input"
            value={values.previousSchool}
            onChange={(e) => onPatch({ previousSchool: e.target.value })}
          />
        </CreateField>
        <CreateField layout="full" label={t('admin.enrollmentIntake.admissionNotes')}>
          <textarea
            className="input"
            rows={2}
            value={values.admissionNotes}
            onChange={(e) => onPatch({ admissionNotes: e.target.value })}
          />
        </CreateField>
      </CreateFieldGroup>
    </>
  );
}

export function EnrollmentIntakeSiblingsFields({
  values,
  onPatch,
  errors = {},
}: Pick<IntakeProps, 'values' | 'onPatch'> & { errors?: EnrollmentIntakeFieldErrors }) {
  return (
    <div className="enrollment-intake-siblings">
      {errors.siblingLines ? (
        <div className="alert alert--error siblings-form__error" role="alert">
          {errors.siblingLines}
        </div>
      ) : null}
      <SiblingsFormFields
        hasSiblings={values.hasSiblings}
        siblingsRawText={values.siblingsRawText}
        siblingsLevels={values.siblingsLevels}
        siblingLines={values.siblingLines}
        onChange={(patch) => onPatch(patch)}
      />
    </div>
  );
}

export function EnrollmentIntakeAcademicFields({
  values,
  errors = {},
  onPatch,
  academic,
  variant = 'default',
}: {
  values: EnrollmentIntakeValues;
  errors?: EnrollmentIntakeFieldErrors;
  onPatch: (patch: EnrollmentIntakePatch) => void;
  academic: EnrollmentIntakeAcademicOptions;
  variant?: 'default' | 'studentCreate';
}) {
  const t = useT();
  const cycleValue = academic.cycleMode === 'code' ? values.cycleCode : values.cycleId;
  const showStream = academic.levelRequiresStream;
  const fieldLayout = variant === 'studentCreate' ? 'half' : 'default';

  const content = (
    <CreateFieldGroup title={t('admin.enrollmentIntake.groups.academicStructure')} icon="◈">
        <CreateField
          field="academicYearId"
          layout={fieldLayout}
          label={t('admin.academicYearId')}
          error={errors.academicYearId}
        >
          {academic.optionsLoading && academic.years.length === 0 ? (
            <p className="student-create-field__hint">{t('admin.student360.create.loadingYears')}</p>
          ) : academic.optionsError ? (
            <div className="col" style={{ gap: 6 }}>
              <p className="student-create-field__error">{t('admin.student360.create.optionsLoadError')}</p>
              {academic.onRetryOptions ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={academic.onRetryOptions}>
                  {t('common.retry')}
                </button>
              ) : null}
            </div>
          ) : (
            <select
              className="input"
              value={values.academicYearId}
              onChange={(e) => onPatch({ academicYearId: e.target.value })}
              disabled={academic.optionsLoading}
            >
              <option value="">{t('common.dash')}</option>
              {academic.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          )}
        </CreateField>
        <CreateField
          field="cycleId"
          layout={fieldLayout}
          label={t('admin.student360.create.cycle')}
          error={academic.cycleMode === 'code' ? errors.cycleCode : errors.cycleId}
        >
          {academic.cyclesLoading && academic.cycles.length === 0 ? (
            <p className="student-create-field__hint">{t('admin.student360.create.loadingCycles')}</p>
          ) : (
            <select
              className="input"
              value={cycleValue}
              onChange={(e) =>
                onPatch(
                  academic.cycleMode === 'code'
                    ? { cycleCode: e.target.value, levelId: '', streamId: '', classId: '' }
                    : { cycleId: e.target.value, levelId: '', streamId: '', classId: '' },
                )
              }
              disabled={academic.optionsLoading || academic.cyclesLoading}
            >
              <option value="">
                {academic.cycleMode === 'code'
                  ? t('admin.admissions.create.selectCycle')
                  : t('admin.student360.create.selectCycle')}
              </option>
              {academic.cycles.map((cycle) =>
                cycle.mode === 'code' ? (
                  <option key={cycle.code} value={cycle.code}>
                    {cycle.name}
                  </option>
                ) : (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ),
              )}
            </select>
          )}
        </CreateField>
        <CreateField field="levelId" layout={fieldLayout} label={t('nav.levels')} error={errors.levelId}>
          <select
            className="input"
            value={values.levelId}
            onChange={(e) => onPatch({ levelId: e.target.value, streamId: '', classId: '' })}
            disabled={
              academic.optionsLoading ||
              academic.cyclesLoading ||
              (academic.cycleMode === 'code' ? !values.cycleCode : !values.cycleId)
            }
          >
            <option value="">{academic.levelPlaceholder ?? t('admin.selectLevel')}</option>
            {academic.levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.display_alias ?? l.name ?? l.code}
              </option>
            ))}
          </select>
        </CreateField>
        {showStream ? (
          <CreateField
            layout={fieldLayout}
            label={t('admin.admissions.fields.stream')}
            error={errors.streamId}
            hint={academic.streamRequired ? t('admin.admissions.create.streamRequiredHint') : undefined}
          >
            <select
              className="input"
              value={values.streamId}
              onChange={(e) => onPatch({ streamId: e.target.value, classId: '' })}
              disabled={academic.optionsLoading || !values.levelId}
              required={academic.streamRequired}
            >
              <option value="">{t('admin.admissions.create.selectStream')}</option>
              {academic.streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </CreateField>
        ) : null}
        <CreateField
          field="classId"
          layout={fieldLayout}
          label={t('nav.classes')}
          error={errors.classId}
          hint={!values.classId && values.levelId ? t('admin.student360.create.classOptionalHint') : undefined}
        >
          <select
            className="input"
            value={values.classId}
            onChange={(e) => onPatch({ classId: e.target.value })}
            disabled={academic.optionsLoading || !values.levelId}
          >
            <option value="">{academic.classPlaceholder ?? t('admin.selectClass')}</option>
            {academic.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name ?? c.display_alias ?? c.name ?? c.id}
              </option>
            ))}
          </select>
        </CreateField>
        {academic.showClassSummary && values.classId.trim() ? (
          <div className="student-create-form__cell student-create-form__cell--full">
            <EnrollmentClassSummaryPanel
              classId={values.classId}
              activeSchoolId={academic.activeSchoolId}
            />
          </div>
        ) : null}
      </CreateFieldGroup>
  );

  if (variant === 'studentCreate') {
    return content;
  }

  return <div className="student-create-form__grid">{content}</div>;
}

export function EnrollmentIntakeRegistrationFields({
  values,
  errors = {},
  onPatch,
  registrationTypes,
  optionsLoading = false,
  variant = 'default',
}: {
  values: EnrollmentIntakeValues;
  errors?: EnrollmentIntakeFieldErrors;
  onPatch: (patch: EnrollmentIntakePatch) => void;
  registrationTypes: { value: string; label: string }[];
  optionsLoading?: boolean;
  variant?: 'default' | 'studentCreate';
}) {
  const t = useT();
  const showPrevious = requiresPreviousSchool(values.registrationType);
  const fieldLayout = variant === 'studentCreate' ? 'half' : 'default';

  const content = (
    <CreateFieldGroup title={t('admin.enrollmentIntake.groups.registrationDetails')} icon="✎">
        <CreateField layout={fieldLayout} label={t('admin.student360.registrationType')}>
          <select
            className="input"
            value={values.registrationType}
            onChange={(e) => onPatch({ registrationType: e.target.value })}
            disabled={optionsLoading}
          >
            {registrationTypes.map((r) => (
              <option key={r.value} value={r.value}>
                {registrationTypeLabel(t, r.value, registrationTypes)}
              </option>
            ))}
          </select>
        </CreateField>
        <CreateField layout={fieldLayout} label={t('admin.student360.actualJoinDate')} error={errors.actualJoinDate}>
          <DatePickerInput
            value={values.actualJoinDate}
            onChange={(actualJoinDate) => onPatch({ actualJoinDate })}
          />
        </CreateField>
        <div className="student-create-form__cell student-create-form__cell--full">
          <label className="student-create-form__checkbox">
            <input
              type="checkbox"
              checked={values.isRepeating}
              onChange={(e) => onPatch({ isRepeating: e.target.checked })}
            />
            <span className="student-create-form__checkbox-text">
              <span>{t('admin.student360.isRepeating')}</span>
              <span className="student-create-field__hint">{t('admin.student360.create.repeatingHint')}</span>
            </span>
          </label>
        </div>
        {showPrevious ? (
          <CreateField label={t('admin.student360.previousSchool')} error={errors.previousSchool}>
            <input
              className="input"
              value={values.previousSchool}
              onChange={(e) => onPatch({ previousSchool: e.target.value })}
            />
          </CreateField>
        ) : null}
        <CreateField layout="full" label={t('admin.student360.registrationNotes')}>
          <textarea
            className="input"
            rows={2}
            value={values.registrationNotes}
            onChange={(e) => onPatch({ registrationNotes: e.target.value })}
          />
        </CreateField>
      </CreateFieldGroup>
  );

  if (variant === 'studentCreate') {
    return content;
  }

  return <div className="student-create-form__grid">{content}</div>;
}

export function EnrollmentIntakeGuardianFields({
  values,
  onPatch,
  guardian,
  embedded = false,
  lockProfileFields = false,
  profileReadOnly = false,
}: {
  values: EnrollmentIntakeValues;
  onPatch: (patch: EnrollmentIntakePatch) => void;
  guardian: EnrollmentIntakeGuardianOptions;
  embedded?: boolean;
  /** Disables name/phone/email until an existing guardian is selected. */
  lockProfileFields?: boolean;
  /** Read-only name/phone/email after linking an existing guardian. */
  profileReadOnly?: boolean;
}) {
  const t = useT();
  const profileDisabled = lockProfileFields || profileReadOnly;
  const fields = (
    <>
      <CreateField label={t('admin.admissions.fields.guardianName')}>
        <input
          className="input"
          value={values.guardianName}
          onChange={(e) => onPatch({ guardianName: e.target.value })}
          disabled={lockProfileFields}
          readOnly={profileReadOnly}
          aria-disabled={profileDisabled || undefined}
        />
      </CreateField>
      <CreateField label={t('admin.admissions.fields.guardianPhone')}>
        <input
          className="input"
          dir="ltr"
          value={values.guardianPhone}
          onChange={(e) => onPatch({ guardianPhone: e.target.value })}
          disabled={lockProfileFields}
          readOnly={profileReadOnly}
          aria-disabled={profileDisabled || undefined}
        />
      </CreateField>
      <CreateField label={t('admin.admissions.fields.relationship')}>
        {guardian.relationshipLoadFailed ? (
          <p className="student-create-field__hint">{t('admin.admissions.create.relationshipLoadError')}</p>
        ) : (
          <select
            className="input"
            value={values.guardianRelationship}
            onChange={(e) => onPatch({ guardianRelationship: e.target.value })}
            disabled={lockProfileFields || guardian.relationshipsLoading}
          >
            <option value="">{t('admin.admissions.create.selectRelationship')}</option>
            {guardian.relationships.map((rel) => {
              const value = String(rel.value ?? rel.id ?? '');
              return (
                <option key={value} value={value}>
                  {rel.label}
                </option>
              );
            })}
          </select>
        )}
      </CreateField>
      <CreateField label={t('admin.admissions.fields.guardianEmail')} error={undefined}>
        <input
          className="input"
          type="email"
          dir="ltr"
          value={values.guardianEmail}
          onChange={(e) => onPatch({ guardianEmail: e.target.value })}
          disabled={lockProfileFields}
          readOnly={profileReadOnly}
          aria-disabled={profileDisabled || undefined}
        />
      </CreateField>
    </>
  );

  if (embedded) {
    return <div className="student-create-form__grid">{fields}</div>;
  }

  return (
    <div className="student-create-form__grid">
      <CreateFieldGroup title={t('admin.enrollmentIntake.groups.guardian')} icon="◉">
        {fields}
      </CreateFieldGroup>
    </div>
  );
}

export function EnrollmentIntakeFollowUpFields({
  values,
  onPatch,
  followUp,
}: {
  values: EnrollmentIntakeValues;
  onPatch: (patch: EnrollmentIntakePatch) => void;
  followUp: EnrollmentIntakeFollowUpOptions;
}) {
  const t = useT();
  return (
    <div className="student-create-form__grid">
      <CreateFieldGroup title={t('admin.enrollmentIntake.groups.followUp')} icon="◎">
        <CreateField label={t('admin.admissions.fields.source')}>
          <select
            className="input"
            value={values.sourceId}
            onChange={(e) => onPatch({ sourceId: e.target.value })}
            disabled={followUp.sourcesLoading}
          >
            <option value="">{t('admin.admissions.create.selectSource')}</option>
            {followUp.sources.map((source) => {
              const id = source.id;
              if (id == null) return null;
              return (
                <option key={id} value={id}>
                  {source.label}
                </option>
              );
            })}
          </select>
        </CreateField>
        <CreateField label={t('admin.admissions.fields.firstVisitDate')}>
          <input
            className="input"
            type="date"
            value={values.firstContactDate}
            onChange={(e) => onPatch({ firstContactDate: e.target.value })}
          />
        </CreateField>
        <CreateField label={t('admin.admissions.fields.nextAction')}>
          <input
            className="input"
            value={values.nextAction}
            onChange={(e) => onPatch({ nextAction: e.target.value })}
          />
        </CreateField>
        <CreateField label={t('admin.admissions.fields.nextActionDate')}>
          <input
            className="input"
            type="date"
            value={values.nextActionDate}
            onChange={(e) => onPatch({ nextActionDate: e.target.value })}
          />
        </CreateField>
      </CreateFieldGroup>
    </div>
  );
}
