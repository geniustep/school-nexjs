'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { StudentFamilyPaymentChoice } from '@/features/admin/student-finance/utils/resolve-student-family-payment-choice';
import './finance-ui.css';

export function StudentPaymentFamilyChoiceDialog({
  open,
  onContinue,
  onClose,
}: {
  open: boolean;
  onContinue: (choice: StudentFamilyPaymentChoice) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [choice, setChoice] = useState<StudentFamilyPaymentChoice>('student');

  if (!open) return null;

  function handleContinue() {
    onContinue(choice);
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal-panel confirmation-dialog finance-family-payment-choice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-payment-choice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="family-payment-choice-title">{t('admin.finance.quickPayment.familyChoice.title')}</h3>
        <div className="confirmation-dialog__body">
          <p className="finance-family-payment-choice__description">
            {t('admin.finance.quickPayment.familyChoice.description')}
          </p>
          <div className="finance-family-payment-choice__options" role="radiogroup">
            <label className="finance-family-payment-choice__option">
              <input
                type="radio"
                name="family-payment-choice"
                value="student"
                checked={choice === 'student'}
                onChange={() => setChoice('student')}
              />
              <span className="finance-family-payment-choice__option-body">
                <span className="finance-family-payment-choice__option-title">
                  {t('admin.finance.quickPayment.familyChoice.student')}
                </span>
                <span className="finance-family-payment-choice__option-desc muted tiny">
                  {t('admin.finance.quickPayment.familyChoice.studentDescription')}
                </span>
              </span>
            </label>
            <label className="finance-family-payment-choice__option">
              <input
                type="radio"
                name="family-payment-choice"
                value="family"
                checked={choice === 'family'}
                onChange={() => setChoice('family')}
              />
              <span className="finance-family-payment-choice__option-body">
                <span className="finance-family-payment-choice__option-title">
                  {t('admin.finance.quickPayment.familyChoice.family')}
                </span>
                <span className="finance-family-payment-choice__option-desc muted tiny">
                  {t('admin.finance.quickPayment.familyChoice.familyDescription')}
                </span>
              </span>
            </label>
          </div>
        </div>
        <div className="row confirmation-dialog__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={handleContinue}>
            {t('admin.finance.quickPayment.familyChoice.continue')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
