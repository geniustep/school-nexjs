'use client';

import { useT } from '@/features/i18n/locale-context';
import {
  EnrollmentIntakeGuardianFields,
  EnrollmentIntakeSiblingsFields,
  type EnrollmentIntakeGuardianOptions,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import type { EnrollmentIntakeFieldErrors, EnrollmentIntakePatch, EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';
import type { StudentCreateBillingFormState } from '@/types/student-enrollment-finance';
import type { PersonSearchResult } from '@/types/student-360';
import { StudentCreateGuardianSourcePanel } from './student-create-guardian-source-panel';
import { StudentCreateStyledSection } from './student-create-section-header';

export function StudentCreateBillingStep({
  billingState,
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
    billingState.guardianSourceMode === 'existing' && billingState.linkedGuardianPartnerId == null;
  const linkedExisting =
    billingState.guardianSourceMode === 'existing' && billingState.linkedGuardianPartnerId != null;

  return (
    <StudentCreateStyledSection
      icon="guardian"
      title={t('admin.student360.create.billing.title')}
      lead={t('admin.student360.create.billing.desc')}
    >
      <StudentCreateGuardianSourcePanel
        intakeValues={intakeValues}
        sourceMode={billingState.guardianSourceMode}
        linkedGuardianPartnerId={billingState.linkedGuardianPartnerId}
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

      <div className="student-create-form__grid student-create-guardian-billing">
        <div className="student-create-form__cell student-create-form__cell--half">
          <label className="student-create-field">
            <span className="student-create-field__label">{t('admin.finance.billingPartnerType')}</span>
            <select
              className="input"
              value={billingState.billingPartnerType}
              onChange={(e) =>
                onBillingChange({
                  billingPartnerType: e.target.value as StudentCreateBillingFormState['billingPartnerType'],
                })
              }
            >
              <option value="guardian">{t('admin.finance.partnerGuardian')}</option>
              <option value="student">{t('admin.finance.partnerStudent')}</option>
              <option value="other">{t('admin.student360.create.billing.partnerOther')}</option>
            </select>
            <span className="student-create-field__hint">{t('admin.student360.create.billing.partnerHint')}</span>
          </label>
        </div>
        {billingState.billingPartnerType === 'guardian' ? (
          <div className="student-create-form__cell student-create-form__cell--full">
            <p className="student-create-guardian-billing__link" role="status">
              {guardianName
                ? t('admin.student360.create.billing.guardianBillingLinked', { name: guardianName })
                : t('admin.student360.create.billing.guardianBillingNeedsName')}
            </p>
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
