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
  buildAgreementLinesReplacePayload,
  computeAgreementLineAmounts,
  resolveAgreementLineReasonKind,
  resolveDefaultUnitPrice,
  validateAgreementLineReason,
  validateAgreementLinesReplacePatch,
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

    const payload = buildAgreementLinesReplacePayload({
      lines: existingLines,
      excludeLineId: line.id,
    });
    const validation = validateAgreementLinesReplacePatch({
      sourceLines: existingLines,
      operation: 'delete',
      payload,
      excludeLineId: line.id,
      agreementNetAmount,
    });
    if (!validation.ok) {
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

  useEffect(() => {
    if (!open) return;
    setSelectedServiceId(line?.service_id ?? '');
    setSelectedTariffId(line?.tariff_id ?? '');
    setQuantity(String(line?.quantity ?? 1));
    setUnitPrice(String(line?.unit_price ?? ''));
    setDiscountType(lineDiscountType === 'none' ? 'none' : lineDiscountType);
    setDiscountValue(String(lineDiscountValue || ''));
    setReason('');
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

  const amounts = useMemo(
    () =>
      computeAgreementLineAmounts({
        unitPrice: lockedUnitPrice,
        quantity: parsedQuantity,
        discountType,
        discountValue: parsedDiscountValue,
      }),
    [lockedUnitPrice, parsedQuantity, discountType, parsedDiscountValue],
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
    const operation = mode === 'edit' && line?.id ? 'update' : 'add';

    if (mode === 'edit' && line?.id) {
      payload = buildAgreementLinesReplacePayload({
        lines: existingLines,
        updateLine: {
          id: line.id,
          patch: {
            ...discountPayload,
            ...(trimmedReason ? { reason: trimmedReason } : {}),
          },
        },
      });
    } else {
      const tariff = selectedTariff;
      payload = buildAgreementLinesReplacePayload({
        lines: existingLines,
        appendLine: {
          service_id: Number(selectedServiceId),
          tariff_id: selectedTariffId ? Number(selectedTariffId) : null,
          quantity: parsedQuantity,
          unit_price: Number(unitPrice) || tariff?.unit_price,
          ...discountPayload,
          is_selected: true,
          ...(trimmedReason ? { reason: trimmedReason } : {}),
        },
      });
    }

    const validation = validateAgreementLinesReplacePatch({
      sourceLines: existingLines,
      operation,
      payload,
      updateLineId: mode === 'edit' ? line?.id : undefined,
      agreementNetAmount,
    });
    if (!validation.ok) {
      setFormError(t(`admin.student360.financialAgreement.customization.errors.${validation.reason}`));
      return;
    }

    setSaving(true);
    const res = await updateFinancialAgreement(agreementId, payload);
    setSaving(false);
    if (!res.success) {
      setFormError(res.error.message);
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
            <label className="student-finance-line-drawer__field">
              <span>{t('admin.student360.financialAgreement.customization.fields.unitPrice')}</span>
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
            <label className="student-finance-line-drawer__field">
              <span>{t('admin.student360.financialAgreement.customization.fields.quantity')}</span>
              <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
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
