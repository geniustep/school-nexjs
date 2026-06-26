'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { resolveReferenceLabel } from '@/features/admin/student-finance/utils/reference-labels';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { parseFinanceList } from '@/lib/utils/finance-normalize';
import type { FinanceServiceCatalogItem, FinanceServiceTariff } from '@/features/admin/student-finance/types';

export function FinanceServiceTariffForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const refState = useFinanceReferenceData();
  const servicesState = useAdminResource<FinanceServiceCatalogItem[]>(endpoints.admin.financeServices, {
    page: 1,
    page_size: 100,
    active: 1,
  });
  const services = parseFinanceList(servicesState.data);

  const commitmentTypes = refState.data?.commitment_types ?? [];
  const pricingUnits = refState.data?.pricing_units ?? [];
  const chargeModes = refState.data?.schedule_generation_modes ?? [];
  const academicYears = refState.academicYears;

  const [serviceId, setServiceId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [commitmentType, setCommitmentType] = useState('');
  const [pricingUnit, setPricingUnit] = useState('');
  const [chargeGenerationMode, setChargeGenerationMode] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!serviceId && services.length) setServiceId(String(services[0].id));
  }, [services, serviceId]);

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      const current = academicYears.find((y) => y.is_current) ?? academicYears[0];
      setAcademicYearId(String(current.id));
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (!commitmentType && commitmentTypes.length) setCommitmentType(commitmentTypes[0].value);
  }, [commitmentTypes, commitmentType]);

  useEffect(() => {
    if (!pricingUnit && pricingUnits.length) setPricingUnit(pricingUnits[0].value);
  }, [pricingUnits, pricingUnit]);

  useEffect(() => {
    if (!chargeGenerationMode && chargeModes.length) setChargeGenerationMode(chargeModes[0].value);
  }, [chargeModes, chargeGenerationMode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await api.post<FinanceServiceTariff>(endpoints.admin.financeServiceTariffs, {
      service_id: Number(serviceId),
      academic_year_id: Number(academicYearId),
      commitment_type: commitmentType,
      pricing_unit: pricingUnit,
      charge_generation_mode: chargeGenerationMode,
      unit_price: Number(unitPrice) || 0,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone();
  }

  const loading = refState.loading || servicesState.loading;

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.services.createTariffTitle')}</h3>
      {error ? <p className="form-error">{error}</p> : null}
      <label>
        {t('admin.finance.services.columns.service')}
        <select
          className="input"
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          disabled={loading || !services.length}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('admin.finance.services.columns.academicYear')}
        <select
          className="input"
          required
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          disabled={loading || !academicYears.length}
        >
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('admin.finance.services.columns.commitmentType')}
        <select
          className="input"
          required
          value={commitmentType}
          onChange={(e) => setCommitmentType(e.target.value)}
          disabled={loading}
        >
          {commitmentTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {resolveReferenceLabel(t, 'commitment_type', option.value, commitmentTypes)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('admin.finance.services.columns.pricingUnit')}
        <select
          className="input"
          required
          value={pricingUnit}
          onChange={(e) => setPricingUnit(e.target.value)}
          disabled={loading}
        >
          {pricingUnits.map((option) => (
            <option key={option.value} value={option.value}>
              {resolveReferenceLabel(t, 'pricing_unit', option.value, pricingUnits)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('admin.finance.services.chargeGenerationMode')}
        <select
          className="input"
          required
          value={chargeGenerationMode}
          onChange={(e) => setChargeGenerationMode(e.target.value)}
          disabled={loading}
        >
          {chargeModes.map((option) => (
            <option key={option.value} value={option.value}>
              {resolveReferenceLabel(t, 'schedule_generation_mode', option.value, chargeModes)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('admin.finance.services.columns.unitPrice')}
        <FinanceAmountInput value={unitPrice} onChange={setUnitPrice} />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting || loading || !services.length}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
