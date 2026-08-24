'use client';

import type { ReactNode } from 'react';
import { useT } from '@/features/i18n/locale-context';
import {
  EnrollmentIntakeGuardianFields,
  EnrollmentIntakeSiblingsFields,
  type EnrollmentIntakeGuardianOptions,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import type { EnrollmentIntakeFieldErrors, EnrollmentIntakePatch, EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';
import type { BillingResponsibilityFieldErrors } from '@/features/admin/students/utils/student-create-billing-responsibility';
import {
  guardianEntryBillingOptionLabel,
  guardianEntryLabel,
} from '@/features/admin/students/utils/student-create-guardian-payload';
import { isCompleteStudentCreateGuardianEntry } from '@/features/admin/students/utils/student-create-additional-guardians';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
} from '@/types/student-enrollment-finance';
import type { AdmissionGuardianPrefillText } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import type { PersonSearchResult } from '@/types/student-360';
import { StudentCreateGuardianSourcePanel } from './student-create-guardian-source-panel';
import { StudentCreateGuardianProvisionSection } from './student-create-guardian-provision-section';
import { StudentCreateAdditionalGuardiansSection } from './student-create-additional-guardians-section';
import { StudentCreateGuardiansSummary } from './student-create-guardians-summary';
import { StudentCreateStyledSection } from './student-create-section-header';

function GuardiansSection({
  title,
  lead,
  children,
  className,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`student-create-guardians-block${className ? ` ${className}` : ''}`}>
      <div className="student-create-guardians-block__head">
        <h3 className="student-create-guardians-block__title">{title}</h3>
        {lead ? <p className="student-create-guardians-block__lead">{lead}</p> : null}
      </div>
      <div className="student-create-guardians-block__body">{children}</div>
    </div>
  );
}

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
  onProvisionAccessChange,
  onAddAdditionalGuardian,
  onAdditionalGuardianSourceModeChange,
  onUpdateAdditionalGuardian,
  onLinkAdditionalGuardian,
  onClearAdditionalGuardian,
  onRemoveAdditionalGuardian,
  usedGuardianIds,
  linkedGuardianPersonsByEntryKey,
  guardian,
  allowCreateNewGuardian = true,
  canManageBillingProfile = true,
  admissionGuardianSnapshot = null,
  admissionSelectionRequired = false,
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
  onProvisionAccessChange: (entryKey: string, enabled: boolean) => void;
  onAddAdditionalGuardian: () => void;
  onAdditionalGuardianSourceModeChange: (
    entryKey: string,
    mode: StudentCreateBillingFormState['guardianSourceMode'],
  ) => void;
  onUpdateAdditionalGuardian: (entryKey: string, next: StudentCreateGuardianEntry) => void;
  onLinkAdditionalGuardian: (entryKey: string, person: PersonSearchResult) => void;
  onClearAdditionalGuardian: (entryKey: string) => void;
  onRemoveAdditionalGuardian: (entryKey: string) => void;
  usedGuardianIds: Set<number>;
  linkedGuardianPersonsByEntryKey: Record<string, PersonSearchResult>;
  guardian: EnrollmentIntakeGuardianOptions;
  allowCreateNewGuardian?: boolean;
  canManageBillingProfile?: boolean;
  admissionGuardianSnapshot?: AdmissionGuardianPrefillText | null;
  admissionSelectionRequired?: boolean;
}) {
  const t = useT();
  const guardianName = intakeValues.guardianName.trim();
  const linkedExisting =
    billingState.guardianSourceMode === 'existing' && billingState.linkedGuardianId != null;
  const studentMode = billingState.responsibilitySelection === 'student';
  const showGuardianFlow = !studentMode || billingState.addGuardianForStudent;
  const guardianBillingMode = billingState.responsibilitySelection === 'guardian';
  const billingGuardianOptions = guardianEntries.filter(isCompleteStudentCreateGuardianEntry);
  const canAddAdditionalGuardian = guardianEntries.some(
    (entry) => entry.is_primary_contact && isCompleteStudentCreateGuardianEntry(entry),
  );
  const multipleGuardians = billingGuardianOptions.length > 1;
  const selectedBillingGuardian = billingGuardianOptions.find(
    (entry) => entry.entryKey === billingState.billingGuardianEntryKey,
  );

  function handleResponsibilityChange(value: string) {
    const selection = value as StudentCreateBillingFormState['responsibilitySelection'];
    onBillingChange({
      responsibilitySelection: selection,
      addGuardianForStudent:
        selection === 'student' ? billingState.addGuardianForStudent : false,
      studentBillingConfirmed: selection === 'student' ? billingState.studentBillingConfirmed : false,
      studentBillingReason: selection === 'student' ? billingState.studentBillingReason : '',
      billingGuardianEntryKey:
        selection === 'guardian' && billingGuardianOptions.length === 1
          ? billingGuardianOptions[0].entryKey
          : selection === 'guardian'
            ? billingState.billingGuardianEntryKey
            : null,
    });
  }

  return (
    <StudentCreateStyledSection
      icon="guardian"
      lead={t('admin.student360.create.billing.desc')}
      className="student-create-form__section--billing student-create-form__section--guardians-quiet"
    >
      {showGuardianFlow ? (
        <StudentCreateGuardiansSummary
          entries={guardianEntries}
          billingGuardianEntryKey={billingState.billingGuardianEntryKey}
        />
      ) : null}

      {showGuardianFlow ? <GuardiansSection
        title={t('admin.student360.create.billing.primarySectionTitle')}
        lead={t('admin.student360.create.billing.primarySectionLead')}
      >
        <StudentCreateGuardianSourcePanel
          intakeValues={intakeValues}
          sourceMode={billingState.guardianSourceMode}
          linkedGuardianId={billingState.linkedGuardianId}
          linkedGuardianPerson={linkedGuardianPerson}
          onSourceModeChange={onGuardianSourceModeChange}
          onLinkExisting={onLinkExistingGuardian}
          onClearLink={onClearLinkedGuardian}
          allowCreateNewGuardian={allowCreateNewGuardian}
          admissionGuardianSnapshot={admissionGuardianSnapshot}
          admissionSelectionRequired={admissionSelectionRequired}
        />

        {billingState.guardianSourceMode === 'new' &&
        admissionGuardianSnapshot &&
        (admissionGuardianSnapshot.name || admissionGuardianSnapshot.phone) ? (
          <p className="student-create-form__notice" role="note">
            {t('admin.admissions.registration.guardianSnapshotNewModeHint')}
          </p>
        ) : null}

        {billingState.guardianSourceMode === 'new' ? (
          <EnrollmentIntakeGuardianFields
            embedded
            values={intakeValues}
            onPatch={onIntakePatch}
            guardian={guardian}
          />
        ) : null}

        {linkedExisting ? (
          <div className="student-create-guardian-relation">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.relationship')}
              </span>
              <select
                className="input"
                value={intakeValues.guardianRelationship}
                onChange={(e) => onIntakePatch({ guardianRelationship: e.target.value })}
                disabled={guardian.relationshipsLoading}
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
            </label>
          </div>
        ) : null}
      </GuardiansSection> : null}

      {showGuardianFlow ? <GuardiansSection
        title={t('admin.student360.create.billing.additionalSectionTitle')}
        lead={t('admin.student360.create.billing.additionalSectionLead')}
      >
        <StudentCreateAdditionalGuardiansSection
          billingState={billingState}
          billingErrors={billingErrors}
          guardian={guardian}
          usedGuardianIds={usedGuardianIds}
          linkedGuardianPersonsByEntryKey={linkedGuardianPersonsByEntryKey}
          canAddGuardian={canAddAdditionalGuardian}
          addGuardianHint={t('admin.student360.create.billing.additionalRequiresPrimary')}
          onAddGuardian={onAddAdditionalGuardian}
          onSourceModeChange={onAdditionalGuardianSourceModeChange}
          onUpdateEntry={onUpdateAdditionalGuardian}
          onLinkExisting={onLinkAdditionalGuardian}
          onClearLink={onClearAdditionalGuardian}
          onRemove={onRemoveAdditionalGuardian}
        />
      </GuardiansSection> : null}

      {showGuardianFlow && billingErrors?.guardianRequired ? (
        <p className="student-create-field__error" role="alert">
          {billingErrors.guardianRequired}
        </p>
      ) : null}

      <GuardiansSection
        title={t('admin.student360.create.billingResponsibility.title')}
        lead={t('admin.student360.create.billingResponsibility.lead')}
        className="student-create-guardians-block--responsibility"
      >
        {!canManageBillingProfile ? (
          <p className="student-create-form__notice" role="status">
            {t('admin.student360.create.billingResponsibility.viewOnlyHint')}
          </p>
        ) : null}
        <div className="student-create-form__grid student-create-guardian-billing">
          <div className="student-create-form__cell student-create-form__cell--half">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.student360.create.billingResponsibility.partnerTypeLabel')}
              </span>
              <select
                className="input"
                value={billingState.responsibilitySelection}
                onChange={(e) => handleResponsibilityChange(e.target.value)}
                disabled={!canManageBillingProfile}
                aria-invalid={billingErrors?.billingResponsibilitySelection ? true : undefined}
              >
                <option value="needs_selection">
                  {t('admin.student360.create.billingResponsibility.selectionPlaceholder')}
                </option>
                <option value="guardian">
                  {t('admin.student360.create.billingResponsibility.partnerGuardian')}
                </option>
                <option value="student">
                  {t('admin.student360.create.billingResponsibility.partnerStudent')}
                </option>
              </select>
              {billingErrors?.billingResponsibilitySelection ? (
                <span className="student-create-field__error" role="alert">
                  {billingErrors.billingResponsibilitySelection}
                </span>
              ) : (
                <span className="student-create-field__hint">
                  {t('admin.student360.create.billingResponsibility.selectionHint')}
                </span>
              )}
            </label>
          </div>
          {guardianBillingMode && billingGuardianOptions.length === 0 ? (
            <div className="student-create-form__cell student-create-form__cell--full">
              <p className="student-create-form__notice" role="status">
                {t('admin.student360.create.billingResponsibility.incompleteFamilyMessage')}
              </p>
            </div>
          ) : null}
          {guardianBillingMode && !multipleGuardians && billingGuardianOptions.length === 1 ? (
            <div className="student-create-form__cell student-create-form__cell--full">
              <p
                className="student-create-guardian-billing__link"
                role="status"
                data-testid="billing-auto-single-guardian"
              >
                {t('admin.student360.create.billingResponsibility.autoSingleGuardian', {
                  name:
                    guardianName ||
                    guardianEntryLabel(billingGuardianOptions[0]) ||
                    t('common.dash'),
                })}
              </p>
            </div>
          ) : null}
          {guardianBillingMode && multipleGuardians ? (
            <div className="student-create-form__cell student-create-form__cell--full">
              <fieldset className="student-create-guardians-billing-choice" disabled={!canManageBillingProfile}>
                <legend className="student-create-field__label">
                  {t('admin.student360.create.billingResponsibility.billingGuardianLabel')}
                </legend>
                <p className="student-create-field__hint">
                  {t('admin.student360.create.billingResponsibility.billingGuardianSelectionHint')}
                </p>
                <div
                  className="student-create-guardians-billing-choice__options"
                  role="radiogroup"
                  aria-label={t('admin.student360.create.billingResponsibility.billingGuardianLabel')}
                >
                  {billingGuardianOptions.map((entry) => {
                    const checked = billingState.billingGuardianEntryKey === entry.entryKey;
                    return (
                      <label
                        key={entry.entryKey}
                        className={`student-create-guardians-billing-choice__option${
                          checked ? ' student-create-guardians-billing-choice__option--active' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="student-create-billing-guardian"
                          value={entry.entryKey}
                          checked={checked}
                          onChange={() =>
                            onBillingChange({
                              billingGuardianEntryKey: entry.entryKey,
                            })
                          }
                        />
                        <span className="student-create-guardians-billing-choice__mark" aria-hidden="true">
                          {checked ? '●' : '○'}
                        </span>
                        <span className="student-create-guardians-billing-choice__text">
                          {guardianEntryBillingOptionLabel(entry, t)}
                        </span>
                      </label>
                    );
                  })}
                </div>
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
                  <span className="student-create-field__error" role="status">
                    {t('admin.student360.create.billingResponsibility.explicitChoiceRequired')}
                  </span>
                )}
              </fieldset>
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
                  checked={billingState.addGuardianForStudent}
                  onChange={(e) => onBillingChange({ addGuardianForStudent: e.target.checked })}
                />
                <span>{t('admin.student360.create.billingResponsibility.studentAddGuardianOptional')}</span>
              </label>
              {billingState.addGuardianForStudent ? (
                <label className="student-create-field student-create-field--checkbox">
                <input
                  type="checkbox"
                  checked={billingState.studentBillingConfirmed}
                  onChange={(e) => onBillingChange({ studentBillingConfirmed: e.target.checked })}
                  aria-invalid={billingErrors?.billingStudentConfirmed ? true : undefined}
                />
                <span>{t('admin.student360.create.billingResponsibility.studentConfirmLabel')}</span>
                </label>
              ) : null}
              {billingErrors?.billingStudentConfirmed ? (
                <span className="student-create-field__error" role="alert">
                  {billingErrors.billingStudentConfirmed}
                </span>
              ) : null}
              {billingState.addGuardianForStudent ? <label className="student-create-field">
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
              </label> : null}
            </div>
          ) : null}
        </div>
      </GuardiansSection>

      {showGuardianFlow ? <StudentCreateGuardianProvisionSection
        guardianEntries={guardianEntries}
        provisionAccessByEntryKey={billingState.provisionAccessByEntryKey}
        linkedGuardianPerson={linkedGuardianPerson}
        linkedGuardianPersonsByEntryKey={linkedGuardianPersonsByEntryKey}
        onProvisionAccessChange={onProvisionAccessChange}
      /> : null}

      <GuardiansSection title={t('admin.siblings.sectionTitle')}>
        <div className="student-create-form__subsection student-create-form__subsection--siblings">
          <EnrollmentIntakeSiblingsFields
            values={intakeValues}
            onPatch={onIntakePatch}
            errors={intakeErrors}
          />
        </div>
      </GuardiansSection>
    </StudentCreateStyledSection>
  );
}
