'use client';

import { useEffect, useState } from 'react';
import { buildFinanceServiceFormPayload } from '@/features/admin/finance/finance-service-form-payload';
import {
  COLLECTION_ALLOCATION_PRIORITY_LEVELS,
  normalizeCollectionPriorityLevel,
} from '@/features/admin/finance/finance-service-priority';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { resolveReferenceLabel } from '@/features/admin/student-finance/utils/reference-labels';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FinanceServiceCatalogItem } from '@/features/admin/student-finance/types';

export function FinanceServiceForm({
  service,
  onDone,
  onCancel,
}: {
  service?: FinanceServiceCatalogItem | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const refState = useFinanceReferenceData();
  const categories = refState.data?.service_categories ?? [];
  const isEdit = service != null;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('normal');
  const [active, setActive] = useState(true);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!service) {
      setName('');
      setCode('');
      setCategory('');
      setPriorityLevel('normal');
      setActive(true);
      setDescription('');
      return;
    }
    setName(service.name ?? '');
    setCode(service.code ?? '');
    setCategory(service.category ?? '');
    setPriorityLevel(normalizeCollectionPriorityLevel(service.allocation_priority_level));
    setActive(service.active !== false);
    setDescription(service.description?.trim() ?? '');
  }, [service]);

  useEffect(() => {
    if (category || !categories.length || isEdit) return;
    setCategory(categories[0].value);
  }, [categories, category, isEdit]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = buildFinanceServiceFormPayload({
      name,
      category,
      priorityLevel,
      active,
      code,
      description,
    });

    const res = isEdit
      ? await api.patch<FinanceServiceCatalogItem>(endpoints.admin.financeService(service.id), payload)
      : await api.post<FinanceServiceCatalogItem>(endpoints.admin.financeServices, payload);

    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone();
  }

  return (
    <form className="card form-stack finance-services-form" onSubmit={onSubmit}>
      <h3 className="finance-services-form__title">
        {isEdit
          ? t('admin.finance.services.editServiceTitle')
          : t('admin.finance.services.createServiceTitle')}
      </h3>
      {error ? <p className="form-error">{error}</p> : null}

      <label className="finance-services-form__field">
        {t('admin.finance.services.columns.name')}
        <input
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          dir="auto"
        />
      </label>

      <label className="finance-services-form__field">
        {t('admin.finance.services.columns.serviceType')}
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

      <label className="finance-services-form__field">
        {t('admin.finance.services.columns.collectionPriority')}
        <select
          className="input"
          required
          value={priorityLevel}
          onChange={(e) => setPriorityLevel(e.target.value)}
        >
          {COLLECTION_ALLOCATION_PRIORITY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`admin.finance.services.priority.${level}`)}
            </option>
          ))}
        </select>
        <span className="tiny muted finance-services-form__hint">
          {t('admin.finance.services.priorityHint')}
        </span>
      </label>

      <label className="finance-services-form__field">
        {t('academic.status')}
        <select
          className="input"
          value={active ? 'active' : 'inactive'}
          onChange={(e) => setActive(e.target.value === 'active')}
        >
          <option value="active">{t('admin.finance.states.active')}</option>
          <option value="inactive">{t('admin.finance.states.inactive')}</option>
        </select>
      </label>

      <details className="finance-collection-advanced">
        <summary>{t('admin.finance.services.advancedSettings')}</summary>
        <div className="finance-collection-advanced__body form-stack">
          <label className="finance-services-form__field">
            {t('admin.finance.services.columns.code')}
            <input
              className="input mono"
              dir="ltr"
              required={!isEdit}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <label className="finance-services-form__field">
            {t('common.description')}
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              dir="auto"
            />
          </label>
        </div>
      </details>

      <div className="finance-services-form__actions">
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
