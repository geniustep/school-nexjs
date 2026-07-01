'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentCreateBillingFormState } from '@/types/student-enrollment-finance';
import { StudentCreateStyledSection } from './student-create-section-header';

export function StudentCreateBillingStep({
  state,
  onChange,
}: {
  state: StudentCreateBillingFormState;
  onChange: (patch: Partial<StudentCreateBillingFormState>) => void;
}) {
  const t = useT();

  return (
    <StudentCreateStyledSection
      icon="billing"
      title={t('admin.student360.create.billing.title')}
      lead={t('admin.student360.create.billing.desc')}
    >
      <div className="student-create-form__grid">
        <div className="student-create-form__cell student-create-form__cell--half">
          <label className="student-create-field">
            <span className="student-create-field__label">{t('admin.finance.billingPartnerType')}</span>
            <select
              className="input"
              value={state.billingPartnerType}
              onChange={(e) =>
                onChange({
                  billingPartnerType: e.target.value as StudentCreateBillingFormState['billingPartnerType'],
                })
              }
            >
              <option value="guardian">{t('admin.finance.partnerGuardian')}</option>
              <option value="student">{t('admin.finance.partnerStudent')}</option>
              <option value="other">{t('admin.student360.create.billing.partnerOther')}</option>
            </select>
            <span className="student-create-field__hint">
              {t('admin.student360.create.billing.partnerHint')}
            </span>
          </label>
        </div>
      </div>
      <p className="student-create-form__footnote">{t('admin.student360.guardianAfterCreateHint')}</p>
    </StudentCreateStyledSection>
  );
}
