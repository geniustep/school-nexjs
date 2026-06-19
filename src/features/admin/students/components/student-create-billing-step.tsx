'use client';

import { useT } from '@/features/i18n/locale-context';
import type { StudentCreateBillingFormState } from '@/types/student-enrollment-finance';

export function StudentCreateBillingStep({
  state,
  onChange,
}: {
  state: StudentCreateBillingFormState;
  onChange: (patch: Partial<StudentCreateBillingFormState>) => void;
}) {
  const t = useT();

  return (
    <section className="student-create-form__section">
      <h2 className="student-create-form__section-title">
        {t('admin.student360.create.billing.title')}
      </h2>
      <p className="student-create-form__notice">{t('admin.student360.create.billing.desc')}</p>
      <div className="student-create-form__grid">
        <label className="student-create-field">
          <span className="tiny muted">{t('admin.finance.billingPartnerType')}</span>
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
          <span className="tiny muted">{t('admin.student360.create.billing.partnerHint')}</span>
        </label>
      </div>
      <p className="tiny muted">{t('admin.student360.guardianAfterCreateHint')}</p>
    </section>
  );
}
