'use client';

import { useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { updateFinancialAgreement } from '../api/finance-admin-api';
import type { FinanceServiceCatalogItem, FinanceServiceTariff, FinancialAgreementLine } from '../types';
import { buildAgreementLinesReplacePayload, validateAgreementLinesReplacePatch } from '../utils/build-agreement-lines-patch';

export type AgreementLineFormMode = 'add' | 'edit';

export function AgreementLineFormDrawer({
  open,
  mode,
  agreementId,
  existingLines,
  line,
  agreementNetAmount,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: AgreementLineFormMode;
  agreementId: number;
  existingLines: FinancialAgreementLine[];
  line?: FinancialAgreementLine | null;
  agreementNetAmount?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
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

  const title = useMemo(
    () =>
      mode === 'add'
        ? t('admin.student360.financialAgreement.customization.addLineTitle')
        : t('admin.student360.financialAgreement.customization.editLineTitle'),
    [mode, t],
  );

  async function save() {
    setError(null);
    if (mode === 'add' && !selectedServiceId) {
      setError(t('admin.student360.financialAgreement.customization.errors.serviceRequired'));
      return;
    }
    if (!reason.trim()) {
      setError(t('admin.student360.financialAgreement.customization.errors.reasonRequired'));
      return;
    }

    const parsedQuantity = Number(quantity) || 1;
    const parsedUnitPrice = Number(unitPrice);
    if (!Number.isFinite(parsedUnitPrice)) {
      setError(t('admin.student360.financialAgreement.customization.errors.priceRequired'));
      return;
    }

    const discountPayload =
      discountType === 'none'
        ? { discount_type: 'none' as const, discount_value: 0 }
        : {
            discount_type: discountType,
            discount_value: Number(discountValue) || 0,
          };

    let payload;
    const operation = mode === 'edit' && line?.id ? 'update' : 'add';
    if (mode === 'edit' && line?.id) {
      payload = buildAgreementLinesReplacePayload({
        lines: existingLines,
        updateLine: {
          id: line.id,
          patch: {
            quantity: parsedQuantity,
            unit_price: parsedUnitPrice,
            ...discountPayload,
            reason: reason.trim(),
          },
        },
      });
    } else {
      const tariff = tariffs.find((row) => row.id === Number(selectedTariffId));
      payload = buildAgreementLinesReplacePayload({
        lines: existingLines,
        appendLine: {
          service_id: Number(selectedServiceId),
          tariff_id: selectedTariffId ? Number(selectedTariffId) : null,
          quantity: parsedQuantity,
          unit_price: parsedUnitPrice || tariff?.unit_price,
          ...discountPayload,
          is_selected: true,
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
      setError(t(`admin.student360.financialAgreement.customization.errors.${validation.reason}`));
      return;
    }

    setSaving(true);
    const res = await updateFinancialAgreement(agreementId, payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
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

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      <div className="form-stack student-finance-agreement-line-drawer">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {mode === 'add' ? (
          <>
            <label>
              {t('admin.student360.financialAgreement.customization.fields.feeType')}
              <select
                className="input"
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value ? Number(e.target.value) : '');
                  setSelectedTariffId('');
                }}
              >
                <option value="">{t('admin.student360.financialAgreement.createDrawer.selectService')}</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedServiceId ? (
              <label>
                {t('admin.student360.financialAgreement.createDrawer.tariff')}
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
              </label>
            ) : null}
          </>
        ) : (
          <p className="muted" dir="auto">
            {(line as FinancialAgreementLine & { service_name?: string })?.service_name ??
              line?.service?.name ??
              t('common.dash')}
          </p>
        )}

        <label>
          {t('admin.student360.financialAgreement.customization.fields.unitPrice')}
          <input className="input" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </label>
        <label>
          {t('admin.student360.financialAgreement.customization.fields.quantity')}
          <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label>
          {t('admin.student360.financialAgreement.customization.fields.discountType')}
          <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
            <option value="none">{t('admin.student360.financialAgreement.createDrawer.discountNone')}</option>
            <option value="fixed">{t('admin.student360.financialAgreement.createDrawer.discountFixed')}</option>
            <option value="percent">{t('admin.student360.financialAgreement.createDrawer.discountPercent')}</option>
          </select>
        </label>
        {discountType !== 'none' ? (
          <label>
            {t('admin.student360.financialAgreement.customization.fields.discountValue')}
            <input className="input" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
          </label>
        ) : null}
        <label>
          {t('admin.student360.financialAgreement.customization.fields.reason')}
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>

        <div className="row">
          <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void save()}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </SetupDrawer>
  );
}
