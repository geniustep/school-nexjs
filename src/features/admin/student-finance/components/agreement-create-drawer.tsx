'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { StudentDetailsData } from '@/types/student-360';
import {
  createFinancialAgreement,
  previewAgreementSchedule,
  updateFinancialAgreement,
  generateAgreementSchedule,
} from '../api/finance-admin-api';
import type {
  FinancialAgreement,
  FinanceServiceCatalogItem,
  FinanceServiceTariff,
  StudentFinanceWorkspace,
} from '../types';
import { formatPeriodRange } from '../utils/format-period';
import {
  buildAgreementLineAddInput,
  buildAgreementLineAddPayload,
  isAgreementLineManualBillingMode,
  isAgreementLinePricingRecurrenceOdooError,
  logAgreementLineAddApiError,
  needsAgreementLineManualBillingMode,
  validateAgreementLineAddInput,
  validateAgreementLineAddPatch,
  type AgreementLineManualBillingMode,
} from '../utils/build-agreement-lines-patch';
import { useFormat } from '@/features/i18n/use-format';

const STEPS = ['basic', 'services', 'discounts', 'schedule', 'preview', 'save'] as const;
type Step = (typeof STEPS)[number];

type EligiblePartner = {
  type?: string;
  partner_id?: number;
  label?: string;
  is_default?: boolean;
};

export function AgreementCreateDrawer({
  studentId,
  details,
  workspace,
  academicYearId,
  agreement,
  onClose,
  onSuccess,
}: {
  studentId: number;
  details: StudentDetailsData;
  workspace: StudentFinanceWorkspace | null;
  academicYearId: number;
  agreement: FinancialAgreement | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const [step, setStep] = useState<Step>('basic');
  const [agreementId, setAgreementId] = useState<number | null>(agreement?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [agreementDate, setAgreementDate] = useState(agreement?.agreement_date ?? '');
  const [validFrom, setValidFrom] = useState(agreement?.valid_from ?? '');
  const [validUntil, setValidUntil] = useState(agreement?.valid_until ?? '');
  const [billingPartnerId, setBillingPartnerId] = useState<number | ''>(
    agreement?.billing_partner_id ?? workspace?.finance_profile?.billing_partner?.id ?? '',
  );

  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [selectedTariffId, setSelectedTariffId] = useState<number | ''>('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineUnitPrice, setLineUnitPrice] = useState('');
  const [manualBillingMode, setManualBillingMode] = useState<AgreementLineManualBillingMode | ''>('');

  const [discountType, setDiscountType] = useState(agreement?.discount_type ?? 'none');
  const [discountAmount, setDiscountAmount] = useState(String(agreement?.discount_amount ?? ''));
  const [discountReason, setDiscountReason] = useState(agreement?.discount_reason ?? '');

  const [generationMode, setGenerationMode] = useState(
    agreement?.schedule_policies?.generation_mode ?? 'monthly',
  );
  const [dueDay, setDueDay] = useState(String(agreement?.schedule_policies?.due_day_of_month ?? 5));
  const [allowEarly, setAllowEarly] = useState(agreement?.schedule_policies?.allow_early_payment ?? false);
  const [firstPeriodPolicy, setFirstPeriodPolicy] = useState(
    agreement?.schedule_policies?.first_period_policy ?? 'full_period',
  );

  const [previewRows, setPreviewRows] = useState<
    { period_start?: string | null; period_end?: string | null; display_from?: string | null; due_date?: string | null; amount?: number }[]
  >([]);
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  const partnersState = useAdminResource<{ options?: EligiblePartner[] }>(
    endpoints.admin.financeEligibleBillingPartners(studentId),
  );
  const partners = partnersState.data?.options ?? [];

  const servicesState = useAdminResource<FinanceServiceCatalogItem[]>(endpoints.admin.financeServices, {
    page: 1,
    page_size: 100,
    active: 1,
  });
  const tariffsState = useAdminResource<FinanceServiceTariff[]>(
    selectedServiceId ? endpoints.admin.financeServiceTariffs : null,
    selectedServiceId
      ? { page: 1, page_size: 50, service_id: Number(selectedServiceId) }
      : undefined,
  );

  const services = servicesState.data ?? [];
  const tariffs = tariffsState.data ?? [];
  const selectedService = services.find((row) => row.id === Number(selectedServiceId));
  const selectedTariff = tariffs.find((row) => row.id === Number(selectedTariffId));

  const showManualBillingMode =
    !!selectedServiceId &&
    !selectedTariffId &&
    needsAgreementLineManualBillingMode({
      serviceId: Number(selectedServiceId),
      selectedTariff: null,
      service: selectedService,
      existingLines: [],
    });

  const isManualOneTime = manualBillingMode === 'one_time';

  useEffect(() => {
    if (isManualOneTime && lineQuantity !== '1') {
      setLineQuantity('1');
    }
  }, [isManualOneTime, lineQuantity]);

  useEffect(() => {
    if (agreementDate) return;
    const today = new Date().toISOString().slice(0, 10);
    setAgreementDate(today);
  }, [agreementDate]);

  const stepIndex = STEPS.indexOf(step);

  async function ensureAgreementId(): Promise<number | null> {
    if (agreementId) return agreementId;
    const enrollmentId = details.current_enrollment?.id;
    const profile = workspace?.finance_profile;
    if (!enrollmentId || !profile?.id || !billingPartnerId) {
      setError(t('admin.student360.financialAgreement.createDrawer.missingBilling'));
      return null;
    }
    setSaving(true);
    const res = await createFinancialAgreement(studentId, {
      academic_year_id: academicYearId,
      enrollment_id: enrollmentId,
      billing_profile_id: profile.id,
      billing_partner_id: Number(billingPartnerId),
      agreement_date: agreementDate,
      valid_from: validFrom || undefined,
      valid_until: validUntil || undefined,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return null;
    }
    setAgreementId(res.data.id);
    return res.data.id;
  }

  async function saveBasic(next: Step) {
    setError(null);
    const id = await ensureAgreementId();
    if (!id) return;
    setSaving(true);
    const res = await updateFinancialAgreement(id, {
      agreement_date: agreementDate,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setStep(next);
  }

  async function addServiceLine() {
    if (!selectedServiceId) return;
    setError(null);
    const id = await ensureAgreementId();
    if (!id) return;
    const tariff = selectedTariff;
    if (!Number.isFinite(Number(lineUnitPrice)) && tariff?.unit_price == null) {
      setError(t('admin.student360.financialAgreement.customization.errors.priceRequired'));
      return;
    }
    if (showManualBillingMode && !manualBillingMode) {
      setError(t('admin.student360.financialAgreement.customization.errors.billingModeRequired'));
      return;
    }
    const addInputValidation = validateAgreementLineAddInput({
      service_id: Number(selectedServiceId),
      selectedTariff: tariff,
      service: selectedService,
      existingLines: [],
      manualBillingMode: manualBillingMode || undefined,
    });
    if (!addInputValidation.ok) {
      setError(t(`admin.student360.financialAgreement.customization.errors.${addInputValidation.reason}`));
      return;
    }
    const quantity = isManualOneTime ? 1 : Number(lineQuantity) || 1;
    const addLine = buildAgreementLineAddInput({
      service_id: Number(selectedServiceId),
      tariff_id: selectedTariffId ? Number(selectedTariffId) : undefined,
      quantity,
      unit_price: Number(lineUnitPrice) || tariff?.unit_price,
      is_selected: true,
      selectedTariff: tariff,
      service: selectedService,
      existingLines: [],
      manualBillingMode: manualBillingMode || undefined,
    });
    const payload = buildAgreementLineAddPayload(addLine);
    const validation = validateAgreementLineAddPatch({ payload });
    if (!validation.ok) {
      setError(t(`admin.student360.financialAgreement.customization.errors.${validation.reason}`));
      return;
    }
    setSaving(true);
    const res = await updateFinancialAgreement(id, payload);
    setSaving(false);
    if (!res.success) {
      if (isAgreementLinePricingRecurrenceOdooError(res.error.message)) {
        logAgreementLineAddApiError(res.error.message);
        setError(
          t('admin.student360.financialAgreement.customization.errors.odooMissingPricingRecurrenceMetadata'),
        );
      } else {
        setError(res.error.message);
      }
      return;
    }
    toast.success(t('admin.student360.financialAgreement.createDrawer.lineAdded'));
    setSelectedServiceId('');
    setSelectedTariffId('');
    setLineQuantity('1');
    setLineUnitPrice('');
    setManualBillingMode('');
  }

  async function saveDiscounts(next: Step) {
    setError(null);
    const id = await ensureAgreementId();
    if (!id) return;
    setSaving(true);
    const res = await updateFinancialAgreement(id, {
      discount_type: discountType === 'none' ? null : discountType,
      discount_amount: discountType === 'none' ? null : Number(discountAmount) || 0,
      discount_reason: discountReason || null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setStep(next);
  }

  async function saveSchedulePolicies(next: Step) {
    setError(null);
    const id = await ensureAgreementId();
    if (!id) return;
    setSaving(true);
    const res = await updateFinancialAgreement(id, {
      schedule_policies: {
        generation_mode: generationMode,
        due_day_of_month: Number(dueDay) || 5,
        allow_early_payment: allowEarly,
        first_period_policy: firstPeriodPolicy,
      },
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setStep(next);
  }

  async function runPreview() {
    setError(null);
    const id = await ensureAgreementId();
    if (!id) return;
    setSaving(true);
    const res = await previewAgreementSchedule(id, {
      generation_mode: generationMode,
      due_day_of_month: Number(dueDay) || 5,
      allow_early_payment: allowEarly,
      first_period_policy: firstPeriodPolicy,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setPreviewRows(res.data.periods ?? []);
    setPreviewTotal(res.data.total ?? null);
    setPreviewWarnings(res.data.warnings ?? []);
  }

  async function saveDraft() {
    toast.success(t('admin.student360.financialAgreement.createDrawer.savedDraft'));
    onSuccess();
  }

  async function saveAndGenerateSchedule() {
    const id = await ensureAgreementId();
    if (!id) return;
    setSaving(true);
    const res = await generateAgreementSchedule(id);
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    toast.success(t('admin.student360.financialAgreement.createDrawer.scheduleGenerated'));
    onSuccess();
  }

  const stepLabels = useMemo(
    () =>
      STEPS.map((s) => t(`admin.student360.financialAgreement.createDrawer.steps.${s}`)),
    [t],
  );

  return (
    <SetupDrawer
      open
      size="wide"
      title={t('admin.student360.financialAgreement.createDrawer.title')}
      onClose={onClose}
    >
      <div className="student-finance-agreement-drawer">
        <ol className="student-finance-agreement-steps">
          {stepLabels.map((label, index) => (
            <li
              key={STEPS[index]}
              className={index === stepIndex ? 'is-active' : index < stepIndex ? 'is-done' : undefined}
            >
              {label}
            </li>
          ))}
        </ol>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {step === 'basic' ? (
          <section className="form-stack">
            <p className="muted">{t('admin.student360.financialAgreement.createDrawer.basicDesc')}</p>
            <label>
              {t('admin.student360.financialAgreement.fields.agreementDate')}
              <input className="input" type="date" value={agreementDate} onChange={(e) => setAgreementDate(e.target.value)} />
            </label>
            <label>
              {t('admin.student360.financialAgreement.fields.validFrom')}
              <input className="input" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </label>
            <label>
              {t('admin.student360.financialAgreement.fields.validUntil')}
              <input className="input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </label>
            <label>
              {t('admin.student360.financialAgreement.fields.billingParty')}
              <select
                className="input"
                value={billingPartnerId}
                onChange={(e) => setBillingPartnerId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">{t('admin.student360.financialAgreement.createDrawer.selectPartner')}</option>
                {partners.map((p) => (
                  <option key={`${p.type}-${p.partner_id}`} value={p.partner_id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="row">
              <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void saveBasic('services')}>
                {t('common.next')}
              </button>
            </div>
          </section>
        ) : null}

        {step === 'services' ? (
          <section className="form-stack">
            <p className="muted">{t('admin.student360.financialAgreement.createDrawer.servicesDesc')}</p>
            {servicesState.loading ? <LoadingState label={t('common.loading')} /> : null}
            <label>
              {t('admin.student360.financialAgreement.createDrawer.service')}
              <select
                className="input"
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value ? Number(e.target.value) : '');
                  setSelectedTariffId('');
                  setManualBillingMode('');
                  setLineUnitPrice('');
                }}
              >
                <option value="">{t('admin.student360.financialAgreement.createDrawer.selectService')}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedServiceId ? (
              <>
                <label>
                  {t('admin.student360.financialAgreement.createDrawer.tariff')}
                  <select
                    className="input"
                    value={selectedTariffId}
                    onChange={(e) => {
                      const next = e.target.value ? Number(e.target.value) : '';
                      setSelectedTariffId(next);
                      if (next) {
                        setManualBillingMode('');
                        const tariff = tariffs.find((row) => row.id === Number(next));
                        if (tariff?.unit_price != null) setLineUnitPrice(String(tariff.unit_price));
                      }
                    }}
                  >
                    <option value="">{t('admin.student360.financialAgreement.createDrawer.noTariff')}</option>
                    {tariffs.map((tariff) => (
                      <option key={tariff.id} value={tariff.id}>
                        {tariff.name ?? tariff.code} — {tariff.unit_price}
                      </option>
                    ))}
                  </select>
                </label>
                {showManualBillingMode ? (
                  <label>
                    {t('admin.student360.financialAgreement.customization.fields.billingMode')}
                    <select
                      className="input"
                      value={manualBillingMode}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (isAgreementLineManualBillingMode(next)) {
                          setManualBillingMode(next);
                          if (next === 'one_time') setLineQuantity('1');
                        } else {
                          setManualBillingMode('');
                        }
                      }}
                    >
                      <option value="">
                        {t('admin.student360.financialAgreement.customization.fields.billingModePlaceholder')}
                      </option>
                      <option value="monthly">
                        {t('admin.student360.financialAgreement.customization.fields.billingModeMonthly')}
                      </option>
                      <option value="one_time">
                        {t('admin.student360.financialAgreement.customization.fields.billingModeOneTime')}
                      </option>
                    </select>
                    {manualBillingMode === 'monthly' ? (
                      <span className="tiny muted" dir="auto">
                        {t('admin.student360.financialAgreement.customization.fields.billingModeMonthlyHint')}
                      </span>
                    ) : null}
                    {manualBillingMode === 'one_time' ? (
                      <span className="tiny muted" dir="auto">
                        {t('admin.student360.financialAgreement.customization.fields.billingModeOneTimeHint')}
                      </span>
                    ) : null}
                  </label>
                ) : null}
                <label>
                  {isManualOneTime
                    ? t('admin.student360.financialAgreement.customization.fields.unitPriceOneTime')
                    : showManualBillingMode && manualBillingMode === 'monthly'
                      ? t('admin.student360.financialAgreement.customization.fields.unitPriceMonthly')
                      : t('admin.student360.financialAgreement.customization.fields.unitPrice')}
                  <input
                    className="input"
                    value={lineUnitPrice}
                    onChange={(e) => setLineUnitPrice(e.target.value)}
                  />
                </label>
                {!isManualOneTime ? (
                  <label>
                    {showManualBillingMode && manualBillingMode === 'monthly'
                      ? t('admin.student360.financialAgreement.customization.fields.periodCount')
                      : t('admin.student360.financialAgreement.columns.quantity')}
                    <input className="input" value={lineQuantity} onChange={(e) => setLineQuantity(e.target.value)} />
                  </label>
                ) : null}
                <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => void addServiceLine()}>
                  {t('admin.student360.financialAgreement.createDrawer.addLine')}
                </button>
              </>
            ) : null}
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={() => setStep('basic')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setStep('discounts')}>
                {t('common.next')}
              </button>
            </div>
          </section>
        ) : null}

        {step === 'discounts' ? (
          <section className="form-stack">
            <label>
              {t('admin.student360.financialAgreement.createDrawer.discountType')}
              <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <option value="none">{t('admin.student360.financialAgreement.createDrawer.discountNone')}</option>
                <option value="fixed">{t('admin.student360.financialAgreement.createDrawer.discountFixed')}</option>
                <option value="percent">{t('admin.student360.financialAgreement.createDrawer.discountPercent')}</option>
              </select>
            </label>
            {discountType !== 'none' ? (
              <>
                <label>
                  {t('admin.student360.financialAgreement.createDrawer.discountValue')}
                  <input className="input" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                </label>
                <label>
                  {t('admin.student360.financialAgreement.createDrawer.discountReason')}
                  <input className="input" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                </label>
              </>
            ) : null}
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={() => setStep('services')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void saveDiscounts('schedule')}>
                {t('common.next')}
              </button>
            </div>
          </section>
        ) : null}

        {step === 'schedule' ? (
          <section className="form-stack">
            <label>
              {t('admin.student360.financialAgreement.createDrawer.generationMode')}
              <select className="input" value={generationMode} onChange={(e) => setGenerationMode(e.target.value)}>
                <option value="monthly">{t('admin.student360.financeOps.ref.schedule_generation_mode.monthly')}</option>
                <option value="weekly">{t('admin.student360.financeOps.ref.schedule_generation_mode.weekly')}</option>
                <option value="manual">{t('admin.student360.financeOps.ref.schedule_generation_mode.manual')}</option>
                <option value="custom">{t('admin.student360.financeOps.ref.schedule_generation_mode.custom')}</option>
              </select>
            </label>
            <label>
              {t('admin.student360.financialAgreement.schedulePolicy.dueDay')}
              <input className="input" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </label>
            <label className="student-finance-quick-filter">
              <input type="checkbox" checked={allowEarly} onChange={(e) => setAllowEarly(e.target.checked)} />
              <span>{t('admin.student360.financialAgreement.schedulePolicy.earlyPayment')}</span>
            </label>
            <label>
              {t('admin.student360.financialAgreement.schedulePolicy.firstPeriod')}
              <select className="input" value={firstPeriodPolicy} onChange={(e) => setFirstPeriodPolicy(e.target.value)}>
                <option value="full_period">{t('admin.student360.financeOps.ref.first_period_policy.full_period')}</option>
                <option value="prorata">{t('admin.student360.financeOps.ref.first_period_policy.prorata')}</option>
              </select>
            </label>
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={() => setStep('discounts')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void saveSchedulePolicies('preview')}>
                {t('common.next')}
              </button>
            </div>
          </section>
        ) : null}

        {step === 'preview' ? (
          <section className="form-stack">
            <p className="muted">{t('admin.student360.financialAgreement.createDrawer.previewDesc')}</p>
            <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={() => void runPreview()}>
              {t('admin.student360.financialAgreement.createDrawer.runPreview')}
            </button>
            {previewWarnings.length ? (
              <ul className="student-finance-preview-warnings">
                {previewWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {previewRows.length ? (
              <div className="student-finance-table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t('admin.student360.financialAgreement.scheduleColumns.period')}</th>
                      <th>{t('admin.student360.financialAgreement.scheduleColumns.displayFrom')}</th>
                      <th>{t('admin.student360.financialAgreement.scheduleColumns.dueDate')}</th>
                      <th>{t('admin.student360.financialAgreement.scheduleColumns.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr key={`${row.due_date}-${index}`}>
                        <td>{formatPeriodRange(formatDate, row.period_start, row.period_end)}</td>
                        <td>{formatDate(row.display_from)}</td>
                        <td>{formatDate(row.due_date)}</td>
                        <td>
                          <FinanceMoney amount={row.amount} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {previewTotal != null ? (
              <p>
                {t('admin.student360.financialAgreement.createDrawer.previewTotal')}:{' '}
                <FinanceMoney amount={previewTotal} />
              </p>
            ) : null}
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={() => setStep('schedule')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setStep('save')}>
                {t('common.next')}
              </button>
            </div>
          </section>
        ) : null}

        {step === 'save' ? (
          <section className="form-stack">
            <p className="muted">{t('admin.student360.financialAgreement.createDrawer.saveDesc')}</p>
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={() => setStep('preview')}>
                {t('common.back')}
              </button>
              <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void saveDraft()}>
                {t('admin.student360.financialAgreement.createDrawer.saveDraft')}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={saving}
                onClick={() => void saveAndGenerateSchedule()}
              >
                {t('admin.student360.financialAgreement.createDrawer.generateSchedule')}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </SetupDrawer>
  );
}
