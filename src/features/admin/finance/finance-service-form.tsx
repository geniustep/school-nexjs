'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { resolveReferenceLabel } from '@/features/admin/student-finance/utils/reference-labels';
import { useT } from '@/features/i18n/locale-context';
import type { FinanceServiceCatalogItem } from '@/features/admin/student-finance/types';

export function FinanceServiceForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const refState = useFinanceReferenceData();
  const categories = refState.data?.service_categories ?? [];

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [requiresUsageTracking, setRequiresUsageTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (category || !categories.length) return;
    setCategory(categories[0].value);
  }, [categories, category]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await api.post<FinanceServiceCatalogItem>(endpoints.admin.financeServices, {
      name: name.trim(),
      code: code.trim(),
      category: category || undefined,
      requires_subscription: requiresSubscription || undefined,
      requires_usage_tracking: requiresUsageTracking || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone();
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.services.createServiceTitle')}</h3>
      {error ? <p className="form-error">{error}</p> : null}
      <label>
        {t('admin.finance.services.columns.name')}
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.services.columns.code')}
        <input
          className="input mono"
          dir="ltr"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <label>
        {t('admin.finance.services.columns.category')}
        <select
          className="input"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={refState.loading}
        >
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {resolveReferenceLabel(t, 'service_category', option.value, categories)}
            </option>
          ))}
        </select>
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={requiresSubscription}
          onChange={(e) => setRequiresSubscription(e.target.checked)}
        />
        {t('admin.finance.services.columns.requiresSubscription')}
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={requiresUsageTracking}
          onChange={(e) => setRequiresUsageTracking(e.target.checked)}
        />
        {t('admin.finance.services.columns.requiresUsageTracking')}
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting || refState.loading}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
