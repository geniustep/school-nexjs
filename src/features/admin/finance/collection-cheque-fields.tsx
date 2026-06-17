'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';

export type CollectionChequeFieldValues = {
  chequeNumber: string;
  chequeBank: string;
  chequeHolder: string;
  chequeWrittenDate: string;
  chequePostdated: boolean;
  chequeDueDate: string;
  chequeNotes: string;
  chequeBranch: string;
};

export function CollectionChequeFields({
  values,
  onChange,
  collectionDate,
}: {
  values: CollectionChequeFieldValues;
  onChange: (patch: Partial<CollectionChequeFieldValues>) => void;
  collectionDate: string;
}) {
  const t = useT();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="collection-cheque-form">
      <h5 className="collection-form-section__subtitle">{t('admin.finance.collectionWorkflow.chequeInfoSection')}</h5>
      <div className="finance-collection-workflow__fields finance-collection-workflow__fields--cheque">
        <label>
          {t('admin.finance.collectionWorkflow.chequeNumberLabel')}
          <input
            className="input"
            dir="ltr"
            required
            value={values.chequeNumber}
            onChange={(e) => onChange({ chequeNumber: e.target.value })}
          />
        </label>
        <label>
          {t('admin.finance.collectionWorkflow.chequeBankLabel')}
          <input
            className="input"
            required
            value={values.chequeBank}
            onChange={(e) => onChange({ chequeBank: e.target.value })}
          />
        </label>
        <label>
          {t('admin.finance.collectionWorkflow.chequeHolderLabel')}
          <input
            className="input"
            required
            value={values.chequeHolder}
            onChange={(e) => onChange({ chequeHolder: e.target.value })}
          />
        </label>
        <label>
          {t('admin.finance.collectionWorkflow.chequeWrittenDateLabel')}
          <input
            className="input"
            type="date"
            required
            value={values.chequeWrittenDate}
            onChange={(e) => onChange({ chequeWrittenDate: e.target.value })}
          />
        </label>
        <label className="collection-cheque-form__toggle">
          <input
            type="checkbox"
            checked={values.chequePostdated}
            onChange={(e) => onChange({ chequePostdated: e.target.checked, chequeDueDate: '' })}
          />
          <span>{t('admin.finance.collectionWorkflow.chequePostdatedLabel')}</span>
        </label>
        {values.chequePostdated ? (
          <label>
            {t('admin.finance.collectionWorkflow.chequeDueDateLabel')}
            <input
              className="input"
              type="date"
              required
              min={values.chequeWrittenDate || collectionDate || undefined}
              value={values.chequeDueDate}
              onChange={(e) => onChange({ chequeDueDate: e.target.value })}
            />
          </label>
        ) : null}
      </div>

      <h5 className="collection-form-section__subtitle">{t('admin.finance.collectionWorkflow.chequeNotesSection')}</h5>
      <label className="finance-collection-workflow__full-width">
        {t('admin.finance.collectionWorkflow.chequeNotesLabel')}
        <textarea
          className="input"
          rows={2}
          value={values.chequeNotes}
          onChange={(e) => onChange({ chequeNotes: e.target.value })}
        />
      </label>

      <button
        type="button"
        className="btn btn--ghost btn--sm collection-cheque-form__advanced-toggle"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced
          ? t('admin.finance.collectionWorkflow.hideChequeAdvanced')
          : t('admin.finance.collectionWorkflow.showChequeAdvanced')}
      </button>
      {showAdvanced ? (
        <div className="finance-collection-workflow__fields finance-collection-workflow__fields--cheque">
          <label>
            {t('admin.finance.collectionWorkflow.chequeBranch')}
            <input
              className="input"
              value={values.chequeBranch}
              onChange={(e) => onChange({ chequeBranch: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
