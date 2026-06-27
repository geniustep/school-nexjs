'use client';

import { useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import '@/features/admin/finance/finance-ui.css';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { updateFinancialAgreement } from '../api/finance-admin-api';
import type { FinanceServiceCatalogItem, FinanceServiceTariff, FinancialAgreementLine } from '../types';
import {
  buildAgreementLineAddInput,
  buildAgreementLineAddPayload,
  buildAgreementLineDeletePayload,
  buildAgreementLineDiscountPatchPayload,
  computeAgreementLineAmounts,
  isAgreementLineManualBillingMode,
  isAgreementLinePricingRecurrenceOdooError,
  logAgreementLineAddApiError,
  logAgreementLinePatchBlocked,
  needsAgreementLineManualBillingMode,
  resolveAgreementLineReasonKind,
  resolveDefaultUnitPrice,
  validateAgreementLineAddInput,
  validateAgreementLineAddPatch,
  validateAgreementLineDeletePatch,
  validateAgreementLineDiscountPatch,
  validateAgreementLinePatchSafety,
  validateAgreementLineReason,
  type AgreementLineManualBillingMode,
} from '../utils/build-agreement-lines-patch';

export type AgreementLineFormMode = 'add' | 'edit';

function lineServiceName(line: FinancialAgreementLine | null | undefined, fallback: string): string {
  return (
    (line as FinancialAgreementLine & { service_name?: string })?.service_name ??
    line?.service?.name ??
    fallback
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span className="form-error student-finance-line-drawer__field-error" role="alert">
      {message}
    </span>
  );
}

export function AgreementLineDeleteDrawer({
  open,
  agreementId,
  existingLines,
  line,
  agreementNetAmount,
  currency,
  onClose,
  onSuccess,
}: {
  open: boolean;
  agreementId: number;
  existingLines: FinancialAgreementLine[];
  line: FinancialAgreementLine | null;
  agreementNetAmount?: number | null;
  currency?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setReasonError(null);
  }, [open, line?.id]);

  async function confirmDelete() {
    if (!line?.id) return;
    setReasonError(null);

    const reasonValidation = validateAgreementLineReason(
      { mode: 'delete', discountType: 'none' },
      reason,
    );
    if (!reasonValidation.ok) {
      setReasonError(t(`admin.student360.financialAgreement.customization.errors.${reasonValidation.errorKey}`));
      return;
    }

    const payload = buildAgreementLineDeletePayload(line.id);
    const validation = validateAgreementLineDeletePatch({
      sourceLines: existingLines,
      lineId: line.id,
      payload,
    });
    if (!validation.ok) {
      const safety = validateAgreementLinePatchSafety({
        operation: 'delete',
        sourceLines: existingLines,
        payload,
        targetLineId: line.id,
      });
      if (!safety.ok) logAgreementLinePatchBlocked(safety.detail);
      toast.error(t(`admin.student360.financialAgreement.customization.errors.${validation.reason}`));
      return;
    }

    setSaving(true);
    const res = await updateFinancialAgreement(agreementId, payload);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }

    toast.success(t('admin.student360.financialAgreement.customization.lineDeleted'));
    onSuccess();
    onClose();
  }

  if (!open || !line) return null;

  const name = lineServiceName(line, t('common.dash'));

  return (
    <SetupDrawer
      open
      size="medium"
      className="student-finance-line-drawer"
      title={t('admin.student360.financialAgreement.customization.deleteLineTitle')}
      subtitle={t('admin.student360.financialAgreement.customization.drawerDesc')}
      onClose={onClose}
      footer={
        <div className="student-finance-line-drawer__footer">
          <button type="button" className="btn btn--danger" disabled={saving} onClick={() => void confirmDelete()}>
            {saving ? t('common.saving') : t('admin.student360.financialAgreement.customization.deleteLine')}
          </button>
          <button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      }
    >
      <div className="student-finance-line-drawer__content">
        <div className="student-finance-line-drawer__line-card">
          <strong dir="auto">{name}</strong>
          {line.unit_price != null ? (
            <span>
              {t('admin.student360.financialAgreement.customization.fields.originalPriceLabel')}:{' '}
              <FinanceMoney amount={line.unit_price} currency={currency ?? undefined} />
            </span>
          ) : null}
        </div>
        <p className="student-finance-line-drawer__notice" dir="auto">
          {t('admin.student360.financialAgreement.customization.deleteConfirm')}
        </p>
        <label className="student-finance-line-drawer__field">
          <span>{t('admin.student360.financialAgreement.customization.fields.deleteReasonRequired')}</span>
          <textarea
            className={`input${reasonError ? ' input--error' : ''}`}
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
          />
          <FieldError message={reasonError ?? undefined} />
        </label>
      </div>
    </SetupDrawer>
  );
}

export function AgreementLineFormDrawer({
  open,
  mode,
  agreementId,
  existingLines,
  line,
  agreementNetAmount,
  academicYearId,
  currency,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: AgreementLineFormMode;
  agreementId: number;
  existingLines: FinancialAgreementLine[];
  line?: FinancialAgreementLine | null;
  agreementNetAmount?: number | null;
  academicYearId?: number | null;
  currency?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const lineDiscountType =
    (line as FinancialAgreementLine & { discount_type?: string | null })?.discount_type ?? 'none';
  const lineDiscountValue =
    (line as FinancialAgreementLine & { discount_value?: number | null })?.discount_value ??
    line?.discount_amount ??
    0;

  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>(line?.service_id ?? '');
  const [selectedTariffId, setSelectedTariffId] = useState<number | ''>(line?.tariff_id ?? '');
  const [quantity, setQuantity] = useState(String(line?.quantity ?? 1));
  const [unitPrice, setUnitPrice] = useState(String(line?.unit_price ?? ''));
  const [discountType, setDiscountType] = useState(lineDiscountType === 'none' ? 'none' : lineDiscountType);
  const [discountValue, setDiscountValue] = useState(String(lineDiscountValue || ''));
  const [reason, setReason] = useState('');
  const [manualBillingMode, setManualBillingMode] = useState<AgreementLineManualBillingMode | ''>('');

  useEffect(() => {
    if (!open) return;
    setSelectedServiceId(line?.service_id ?? '');
    setSelectedTariffId(line?.tariff_id ?? '');
    setQuantity(String(line?.quantity ?? 1));
    setUnitPrice(String(line?.unit_price ?? ''));
    setDiscountType(lineDiscountType === 'none' ? 'none' : lineDiscountType);
    setDiscountValue(String(lineDiscountValue || ''));
    setReason('');
    setManualBillingMode('');
    setFormError(null);
    setFieldErrors({});
  }, [open, line, lineDiscountType, lineDiscountValue]);

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

  const lockedUnitPrice = mode === 'edit' ? Number(line?.unit_price ?? 0) : Number(unitPrice);
  const parsedQuantity = Number(quantity) || 1;
  const parsedDiscountValue = Number(discountValue) || 0;
  const defaultPrice = resolveDefaultUnitPrice({ service: selectedService, tariff: selectedTariff });

  const showManualBillingMode =
    mode === 'add' &&
    !!selectedServiceId &&
    !selectedTariffId &&
    needsAgreementLineManualBillingMode({
      serviceId: Number(selectedServiceId),
      selectedTariff: null,
      service: selectedService,
      existingLines,
    });

  const isManualOneTime = manualBillingMode === 'one_time';
  const effectiveQuantity = isManualOneTime ? 1 : parsedQuantity;

  useEffect(() => {
    if (isManualOneTime && quantity !== '1') {
      setQuantity('1');
    }
  }, [isManualOneTime, quantity]);

  const amounts = useMemo(
    () =>
      computeAgreementLineAmounts({
        unitPrice: lockedUnitPrice,
        quantity: effectiveQuantity,
        discountType,
        discountValue: parsedDiscountValue,
      }),
    [lockedUnitPrice, effectiveQuantity, discountType, parsedDiscountValue],
  );

  const reasonKind = resolveAgreementLineReasonKind({
    mode,
    discountType,
    discountValue: parsedDiscountValue,
    unitPrice: mode === 'add' ? lockedUnitPrice : undefined,
    defaultPrice: mode === 'add' ? defaultPrice : null,
  });

  const reasonLabelKey = useMemo(() => {
    const keys = {
      optional: 'internalNoteOptional',
      discount: 'discountReasonRequired',
      special_price: 'specialPriceReasonRequired',
      delete: 'deleteReasonRequired',
    } as const;
    return `admin.student360.financialAgreement.customization.fields.${keys[reasonKind]}`;
  }, [reasonKind]);

  const title = useMemo(
    () =>
      mode === 'add'
        ? t('admin.student360.financialAgreement.customization.addLineTitle')
        : t('admin.student360.financialAgreement.customization.editLineTitle'),
    [mode, t],
  );

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function save() {
    setFormError(null);
    setFieldErrors({});

    const nextFieldErrors: Record<string, string> = {};

    if (mode === 'add' && !selectedServiceId) {
      nextFieldErrors.service = t('admin.student360.financialAgreement.customization.errors.serviceRequired');
    }

    if (mode === 'add' && !Number.isFinite(Number(unitPrice))) {
      nextFieldErrors.unitPrice = t('admin.student360.financialAgreement.customization.errors.priceRequired');
    }

    const reasonValidation = validateAgreementLineReason(
      {
        mode,
        discountType,
        discountValue: parsedDiscountValue,
        unitPrice: mode === 'add' ? Number(unitPrice) : undefined,
        defaultPrice: mode === 'add' ? defaultPrice : null,
      },
      reason,
    );
    if (!reasonValidation.ok) {
      nextFieldErrors.reason = t(
        `admin.student360.financialAgreement.customization.errors.${reasonValidation.errorKey}`,
      );
    }

    if (mode === 'add' && showManualBillingMode && !manualBillingMode) {
      nextFieldErrors.billingMode = t(
        'admin.student360.financialAgreement.customization.errors.billingModeRequired',
      );
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setFormError(t('admin.student360.financialAgreement.customization.errors.formInvalid'));
      return;
    }

    const discountPayload =
      discountType === 'none'
        ? { discount_type: 'none' as const, discount_value: 0 }
        : {
            discount_type: discountType,
            discount_value: parsedDiscountValue,
          };

    const trimmedReason = reason.trim();
    let payload;
    let validation: { ok: true } | { ok: false; reason: string };

    if (mode === 'edit' && line?.id) {
      payload = buildAgreementLineDiscountPatchPayload({
        lineId: line.id,
        discountType: discountPayload.discount_type,
        discountValue: discountPayload.discount_value,
        reason: trimmedReason || undefined,
      });
      validation = validateAgreementLineDiscountPatch({
        sourceLines: existingLines,
        lineId: line.id,
        payload,
      });
    } else {
      const tariff = selectedTariff;
      const addInputValidation = validateAgreementLineAddInput({
        service_id: Number(selectedServiceId),
        selectedTariff: tariff,
        service: selectedService,
        existingLines,
        manualBillingMode: manualBillingMode || undefined,
      });
      if (!addInputValidation.ok) {
        setFormError(
          t(`admin.student360.financialAgreement.customization.errors.${addInputValidation.reason}`),
        );
        return;
      }

      const addLine = buildAgreementLineAddInput({
        service_id: Number(selectedServiceId),
        tariff_id: selectedTariffId ? Number(selectedTariffId) : undefined,
        quantity: effectiveQuantity,
        unit_price: Number(unitPrice) || tariff?.unit_price,
        ...discountPayload,
        is_selected: true,
        reason: trimmedReason || undefined,
        selectedTariff: tariff,
        service: selectedService,
        existingLines,
        manualBillingMode: manualBillingMode || undefined,
      });
      payload = buildAgreementLineAddPayload(addLine);
      if (existingLines.length === 0 && (agreementNetAmount ?? 0) > 0) {
        validation = { ok: false, reason: 'lines_not_loaded' };
      } else {
        validation = validateAgreementLineAddPatch({ payload });
      }
    }

    if (!validation.ok) {
      const safety = validateAgreementLinePatchSafety({
        operation: mode === 'edit' ? 'discount' : 'add',
        sourceLines: existingLines,
        payload,
        targetLineId: mode === 'edit' ? line?.id : undefined,
      });
      if (!safety.ok) logAgreementLinePatchBlocked(safety.detail);
      setFormError(t(`admin.student360.financialAgreement.customization.errors.${validation.reason}`));
      return;
    }

    setSaving(true);
    const res = await updateFinancialAgreement(agreementId, payload);
    setSaving(false);
    if (!res.success) {
      if (isAgreementLinePricingRecurrenceOdooError(res.error.message)) {
        logAgreementLineAddApiError(res.error.message);
        setFormError(
          t('admin.student360.financialAgreement.customization.errors.odooMissingPricingRecurrenceMetadata'),
        );
      } else {
        setFormError(res.error.message);
      }
      return;
    }

    toast.success(
      mode === 'add'
        ? t('admin.student360.financialAgreement.customization.lineAdded')
        : t('admin.student360.financialAgreement.customization.lineUpdated'),
    );
    onSuccess();
    onClose();
  }

  if (!open) return null;

  const editLineName = lineServiceName(line, t('common.dash'));

  return (
    <SetupDrawer
      open
      size="medium"
      className="student-finance-line-drawer"
      title={title}
      subtitle={t('admin.student360.financialAgreement.customization.drawerDesc')}
      onClose={onClose}
      footer={
        <div className="student-finance-line-drawer__footer">
          <div className="student-finance-line-drawer__summary">
            <div>
              <span className="student-finance-line-drawer__summary-label">
                {t('admin.student360.financialAgreement.customization.summary.gross')}
              </span>
              <FinanceMoney amount={amounts.gross} currency={currency ?? undefined} />
            </div>
            <div>
              <span className="student-finance-line-drawer__summary-label">
                {t('admin.student360.financialAgreement.customization.summary.discount')}
              </span>
              <FinanceMoney amount={amounts.discount} currency={currency ?? undefined} />
            </div>
            <div>
              <span className="student-finance-line-drawer__summary-label">
                {t('admin.student360.financialAgreement.customization.summary.net')}
              </span>
              <strong>
                <FinanceMoney amount={amounts.net} currency={currency ?? undefined} />
              </strong>
            </div>
          </div>
          <div className="student-finance-line-drawer__footer-actions">
            <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void save()}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      }
    >
      <div className="student-finance-line-drawer__content">
        {formError ? (
          <p className="form-error student-finance-line-drawer__form-error" role="alert">
            {formError}
          </p>
        ) : null}

        {mode === 'edit' && line ? (
          <div className="student-finance-line-drawer__line-card">
            <strong dir="auto">{editLineName}</strong>
            <dl className="student-finance-line-drawer__facts">
              <div>
                <dt>{t('admin.student360.financialAgreement.customization.fields.originalPriceLabel')}</dt>
                <dd>
                  <FinanceMoney amount={line.unit_price} currency={currency ?? undefined} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.student360.financialAgreement.customization.fields.quantity')}</dt>
                <dd>{line.quantity ?? t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.student360.financialAgreement.customization.columns.discount')}</dt>
                <dd>
                  <FinanceMoney amount={line.discount_amount} currency={currency ?? undefined} />
                </dd>
              </div>
              <div>
                <dt>{t('admin.student360.financialAgreement.customization.columns.net')}</dt>
                <dd>
                  <FinanceMoney amount={line.net_amount} currency={currency ?? undefined} />
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {mode === 'add' ? (
          <>
            <label className="student-finance-line-drawer__field">
              <span>{t('admin.student360.financialAgreement.customization.fields.feeType')}</span>
              <select
                className={`input${fieldErrors.service ? ' input--error' : ''}`}
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value ? Number(e.target.value) : '');
                  setSelectedTariffId('');
                  setManualBillingMode('');
                  clearFieldError('service');
                }}
              >
                <option value="">{t('admin.student360.financialAgreement.createDrawer.selectService')}</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.service} />
            </label>
            {selectedServiceId ? (
              <label className="student-finance-line-drawer__field">
                <span>{t('admin.student360.financialAgreement.customization.fields.defaultTariff')}</span>
                <select
                  className="input"
                  value={selectedTariffId}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : '';
                    setSelectedTariffId(next);
                    if (next) {
                      setManualBillingMode('');
                      const tariff = tariffs.find((row) => row.id === Number(next));
                      if (tariff?.unit_price != null) setUnitPrice(String(tariff.unit_price));
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
                {defaultPrice != null ? (
                  <span className="tiny muted student-finance-line-drawer__hint">
                    {t('admin.student360.financialAgreement.customization.fields.defaultPriceHint')}:{' '}
                    <FinanceMoney amount={defaultPrice} currency={currency ?? selectedService?.currency} />
                  </span>
                ) : null}
              </label>
            ) : null}
            {showManualBillingMode ? (
              <label className="student-finance-line-drawer__field">
                <span>{t('admin.student360.financialAgreement.customization.fields.billingMode')}</span>
                <select
                  className={`input${fieldErrors.billingMode ? ' input--error' : ''}`}
                  value={manualBillingMode}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (isAgreementLineManualBillingMode(next)) {
                      setManualBillingMode(next);
                      if (next === 'one_time') setQuantity('1');
                    } else {
                      setManualBillingMode('');
                    }
                    clearFieldError('billingMode');
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
                  <span className="tiny muted student-finance-line-drawer__hint" dir="auto">
                    {t('admin.student360.financialAgreement.customization.fields.billingModeMonthlyHint')}
                  </span>
                ) : null}
                {manualBillingMode === 'one_time' ? (
                  <span className="tiny muted student-finance-line-drawer__hint" dir="auto">
                    {t('admin.student360.financialAgreement.customization.fields.billingModeOneTimeHint')}
                  </span>
                ) : null}
                <FieldError message={fieldErrors.billingMode} />
              </label>
            ) : null}
            <label className="student-finance-line-drawer__field">
              <span>
                {isManualOneTime
                  ? t('admin.student360.financialAgreement.customization.fields.unitPriceOneTime')
                  : showManualBillingMode && manualBillingMode === 'monthly'
                    ? t('admin.student360.financialAgreement.customization.fields.unitPriceMonthly')
                    : t('admin.student360.financialAgreement.customization.fields.unitPrice')}
              </span>
              <input
                className={`input${fieldErrors.unitPrice ? ' input--error' : ''}`}
                value={unitPrice}
                onChange={(e) => {
                  setUnitPrice(e.target.value);
                  clearFieldError('unitPrice');
                }}
              />
              <FieldError message={fieldErrors.unitPrice} />
            </label>
            {!isManualOneTime ? (
              <label className="student-finance-line-drawer__field">
                <span>
                  {showManualBillingMode && manualBillingMode === 'monthly'
                    ? t('admin.student360.financialAgreement.customization.fields.periodCount')
                    : t('admin.student360.financialAgreement.customization.fields.quantity')}
                </span>
                <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </label>
            ) : null}
          </>
        ) : null}

        <label className="student-finance-line-drawer__field">
          <span>{t('admin.student360.financialAgreement.customization.fields.discountType')}</span>
          <select
            className="input"
            value={discountType}
            onChange={(e) => {
              setDiscountType(e.target.value);
              clearFieldError('reason');
            }}
          >
            <option value="none">{t('admin.student360.financialAgreement.createDrawer.discountNone')}</option>
            <option value="fixed">{t('admin.student360.financialAgreement.createDrawer.discountFixed')}</option>
            <option value="percent">{t('admin.student360.financialAgreement.createDrawer.discountPercent')}</option>
          </select>
        </label>
        {discountType !== 'none' ? (
          <label className="student-finance-line-drawer__field">
            <span>{t('admin.student360.financialAgreement.customization.fields.discountValue')}</span>
            <input
              className="input"
              value={discountValue}
              onChange={(e) => {
                setDiscountValue(e.target.value);
                clearFieldError('reason');
              }}
            />
          </label>
        ) : null}
        <label className="student-finance-line-drawer__field">
          <span>{t(reasonLabelKey)}</span>
          <input
            className={`input${fieldErrors.reason ? ' input--error' : ''}`}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              clearFieldError('reason');
            }}
          />
          <FieldError message={fieldErrors.reason} />
        </label>
      </div>
    </SetupDrawer>
  );
}
