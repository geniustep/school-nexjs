'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { CreateFeeTypePayload, FeeType } from '@/types/finance';

export function FinanceFeeTypeForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('tuition');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const amount = defaultAmount.trim() ? Number(defaultAmount) : undefined;
    if (defaultAmount.trim() && (!amount || amount < 0)) {
      setError(t('admin.finance.invalidAmount'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: CreateFeeTypePayload = {
      name: name.trim(),
      code: code.trim(),
      category,
      default_amount: amount,
    };
    const res = await api.post<FeeType>(endpoints.admin.financeFeeTypes, payload);
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone();
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.addFeeType')}</h3>
      {error && <p className="form-error">{error}</p>}
      <label>
        {t('admin.finance.feeTypeName')}
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.feeTypeCode')}
        <input className="input" required value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.category')}
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="tuition">{t('admin.finance.categoryTuition')}</option>
          <option value="transport">{t('admin.finance.categoryTransport')}</option>
          <option value="meals">{t('admin.finance.categoryMeals')}</option>
          <option value="activities">{t('admin.finance.categoryActivities')}</option>
        </select>
      </label>
      <label>
        {t('admin.finance.defaultAmount')}
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={defaultAmount}
          onChange={(e) => setDefaultAmount(e.target.value)}
        />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
