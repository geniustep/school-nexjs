'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import { FEE_TYPE_CATEGORIES } from '@/features/admin/finance/fee-types/fee-type-options';
import type { CreateFeeTypePayload, FeeType } from '@/types/finance';

export function FinanceFeeTypeForm({
  onDone,
  onCancel,
  compact = false,
}: {
  onDone: () => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<string>(FEE_TYPE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [requiresUsageTracking, setRequiresUsageTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const payload: CreateFeeTypePayload = {
      name: name.trim(),
      code: code.trim(),
      category,
      description: description.trim() || undefined,
      requires_subscription: requiresSubscription || undefined,
      requires_usage_tracking: requiresUsageTracking || undefined,
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
    <form
      className={`card form-stack${compact ? ' fee-type-form--compact' : ''}`}
      onSubmit={onSubmit}
    >
      <h3>{t('admin.finance.feePlansWorkspace.createFeeType')}</h3>
      {error && <p className="form-error">{error}</p>}
      <label>
        {t('admin.finance.feeTypeName')}
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.feeTypeCode')}
        <input
          className="input mono"
          dir="ltr"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <label>
        {t('admin.finance.category')}
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {FEE_TYPE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(`admin.finance.feeTypesWorkspace.categories.${value}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('common.description')}
        <textarea
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={requiresSubscription}
          onChange={(e) => setRequiresSubscription(e.target.checked)}
        />
        {t('admin.finance.feeTypesWorkspace.requiresSubscription')}
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={requiresUsageTracking}
          onChange={(e) => setRequiresUsageTracking(e.target.checked)}
        />
        {t('admin.finance.feeTypesWorkspace.requiresUsageTracking')}
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
