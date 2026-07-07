'use client';

import { useT } from '@/features/i18n/locale-context';
import {
  EnrollmentIntakeGuardianFields,
  EnrollmentIntakeSiblingsFields,
  type EnrollmentIntakeGuardianOptions,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import type { EnrollmentIntakeFieldErrors, EnrollmentIntakePatch, EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';
import type { BillingResponsibilityFieldErrors } from '@/features/admin/students/utils/student-create-billing-responsibility';
import { guardianEntryLabel } from '@/features/admin/students/utils/student-create-guardian-payload';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import type { PersonSearchResult } from '@/types/student-360';
import { StudentCreateGuardianSourcePanel } from './student-create-guardian-source-panel';
import { StudentCreateStyledSection } from './student-create-section-header';

export function StudentCreateBillingStep({
  billingState,
  billingErrors,
  guardianEntries,
  linkedGuardianPerson,
  onBillingChange,
  intakeValues,
  intakeErrors,
  onIntakePatch,
  onLinkExistingGuardian,
  onClearLinkedGuardian,
  onGuardianSourceModeChange,
  guardian,
}: {
  billingState: StudentCreateBillingFormState;
  billingErrors?: BillingResponsibilityFieldErrors;
  guardianEntries: StudentCreateGuardianEntry[];
  linkedGuardianPerson: PersonSearchResult | null;
  onBillingChange: (patch: Partial<StudentCreateBillingFormState>) => void;
  intakeValues: EnrollmentIntakeValues;
  intakeErrors?: EnrollmentIntakeFieldErrors;
  onIntakePatch: (patch: EnrollmentIntakePatch) => void;
  onLinkExistingGuardian: (person: PersonSearchResult) => void;
  onClearLinkedGuardian: () => void;
  onGuardianSourceModeChange: (mode: StudentCreateBillingFormState['guardianSourceMode']) => void;
  guardian: EnrollmentIntakeGuardianOptions;
}) {
  const t = useT();
  const guardianName = intakeValues.guardianName.trim();
  const pendingExistingSearch =
    billingState.guardianSourceMode === 'existing' && billingState.linkedGuardianId == null;
  const linkedExisting =
    billingState.guardianSourceMode === 'existing' && billingState.linkedGuardianId != null;
  const studentMode = billingState.responsibilitySelection === 'student';
  const guardianBillingMode = billingState.responsibilitySelection === 'guardian';
  const multipleGuardians = guardianEntries.length > 1;
  const selectedBillingGuardian = guardianEntries.find(
    (entry) => entry.entryKey === billingState.billingGuardianEntryKey,
  );

  function handleResponsibilityChange(value: string) {
    const selection = value as StudentCreateBillingFormState['responsibilitySelection'];
    onBillingChange({
      responsibilitySelection: selection,
      studentBillingConfirmed: selection === 'student' ? billingState.studentBillingConfirmed : false,
      studentBillingReason: selection === 'student' ? billingState.studentBillingReason : '',
      billingGuardianEntryKey:
        selection === 'guardian' && guardianEntries.length === 1
          ? guardianEntries[0].entryKey
          : selection === 'guardian'
            ? billingState.billingGuardianEntryKey
            : null,
    });
  }

  return (
    <StudentCreateStyledSection
      icon="guardian"
      title={t('admin.student360.create.billing.title')}
      lead={t('admin.student360.create.billing.desc')}
    >
      <StudentCreateGuardianSourcePanel
        intakeValues={intakeValues}
        sourceMode={billingState.guardianSourceMode}
        linkedGuardianId={billingState.linkedGuardianId}
        linkedGuardianPerson={linkedGuardianPerson}
        onSourceModeChange={onGuardianSourceModeChange}
        onLinkExisting={onLinkExistingGuardian}
        onClearLink={onClearLinkedGuardian}
      />

      <EnrollmentIntakeGuardianFields
        embedded
        values={intakeValues}
        onPatch={onIntakePatch}
        guardian={guardian}
        lockProfileFields={pendingExistingSearch}
        profileReadOnly={linkedExisting}
      />

      {billingErrors?.guardianRequired ? (
        <p className="student-create-field__error" role="alert">
          {billingErrors.guardianRequired}
        </p>
      ) : null}

      <div className="student-create-form__grid student-create-guardian-billing">
        <div className="student-create-form__cell student-create-form__cell--full">
          <h4 className="student-create-form__group-title">{t('admin.student360.create.billingResponsibility.title')}</h4>
          <p className="student-create-field__hint">{t('admin.student360.create.billingResponsibility.lead')}</p>
        </div>
        <div className="student-create-form__cell student-create-form__cell--half">
          <label className="student-create-field">
            <span className="student-create-field__label">{t('admin.finance.billingPartnerType')}</span>
            <select
              className="input"
              value={billingState.responsibilitySelection}
              onChange={(e) => handleResponsibilityChange(e.target.value)}
              aria-invalid={billingErrors?.billingResponsibilitySelection ? true : undefined}
            >
              <option value="needs_selection">{t('admin.student360.create.billingResponsibility.selectionPlaceholder')}</option>
              <option value="guardian">{t('admin.finance.partnerGuardian')}</option>
              <option value="student">{t('admin.finance.partnerStudent')}</option>
            </select>
            {billingErrors?.billingResponsibilitySelection ? (
              <span className="student-create-field__error" role="alert">
                {billingErrors.billingResponsibilitySelection}
              </span>
            ) : (
              <span className="student-create-field__hint">{t('admin.student360.create.billingResponsibility.selectionHint')}</span>
            )}
          </label>
        </div>
        {guardianBillingMode && !multipleGuardians ? (
          <div className="student-create-form__cell student-create-form__cell--full">
            <p className="student-create-guardian-billing__link" role="status">
              {guardianName
                ? t('admin.student360.create.billing.guardianBillingLinked', { name: guardianName })
                : t('admin.student360.create.billingResponsibility.guardianRequiredHint')}
            </p>
          </div>
        ) : null}
        {guardianBillingMode && multipleGuardians ? (
          <div className="student-create-form__cell student-create-form__cell--full">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.student360.create.billingResponsibility.billingGuardianLabel')}
              </span>
              <select
                className="input"
                value={billingState.billingGuardianEntryKey ?? ''}
                onChange={(e) =>
                  onBillingChange({
                    billingGuardianEntryKey: e.target.value || null,
                  })
                }
                aria-invalid={billingErrors?.billingGuardianSelection ? true : undefined}
              >
                <option value="">
                  {t('admin.student360.create.billingResponsibility.billingGuardianPlaceholder')}
                </option>
                {guardianEntries.map((entry) => (
                  <option key={entry.entryKey} value={entry.entryKey}>
                    {guardianEntryLabel(entry)}
                  </option>
                ))}
              </select>
              {billingErrors?.billingGuardianSelection ? (
                <span className="student-create-field__error" role="alert">
                  {billingErrors.billingGuardianSelection}
                </span>
              ) : selectedBillingGuardian ? (
                <span className="student-create-field__hint" role="status">
                  {t('admin.student360.create.billing.guardianBillingLinked', {
                    name: guardianEntryLabel(selectedBillingGuardian),
                  })}
                </span>
              ) : (
                <span className="student-create-field__hint">
                  {t('admin.student360.create.billingResponsibility.billingGuardianSelectionHint')}
                </span>
              )}
            </label>
          </div>
        ) : null}
        {studentMode ? (
          <div className="student-create-form__cell student-create-form__cell--full student-create-billing-responsibility-student">
            <p className="student-create-form__notice" role="status">
              {t('admin.student360.create.billingResponsibility.studentWarning')}
            </p>
            <label className="student-create-field student-create-field--checkbox">
              <input
                type="checkbox"
                checked={billingState.studentBillingConfirmed}
                onChange={(e) => onBillingChange({ studentBillingConfirmed: e.target.checked })}
                aria-invalid={billingErrors?.billingStudentConfirmed ? true : undefined}
              />
              <span>{t('admin.student360.create.billingResponsibility.studentConfirmLabel')}</span>
            </label>
            {billingErrors?.billingStudentConfirmed ? (
              <span className="student-create-field__error" role="alert">
                {billingErrors.billingStudentConfirmed}
              </span>
            ) : null}
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.student360.create.billingResponsibility.studentReasonLabel')}
              </span>
              <textarea
                className="input"
                rows={3}
                value={billingState.studentBillingReason}
                onChange={(e) => onBillingChange({ studentBillingReason: e.target.value })}
                aria-invalid={billingErrors?.billingStudentReason ? true : undefined}
                placeholder={t('admin.student360.create.billingResponsibility.studentReasonPlaceholder')}
              />
              {billingErrors?.billingStudentReason ? (
                <span className="student-create-field__error" role="alert">
                  {billingErrors.billingStudentReason}
                </span>
              ) : (
                <span className="student-create-field__hint">
                  {t('admin.student360.create.billingResponsibility.studentReasonHint')}
                </span>
              )}
            </label>
          </div>
        ) : null}
      </div>

      <div className="student-create-form__subsection student-create-form__subsection--siblings">
        <EnrollmentIntakeSiblingsFields
          values={intakeValues}
          onPatch={onIntakePatch}
          errors={intakeErrors}
        />
      </div>
    </StudentCreateStyledSection>
  );
}
