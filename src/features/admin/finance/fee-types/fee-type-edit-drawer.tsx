'use client';

import { useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildFeeTypeUpdatePayload,
  feeTypeFormValuesFromDetail,
  feeTypeErrorMessageKey,
  resolveFeeTypeErrorCode,
  type FeeTypeFormValues,
} from '@/features/admin/finance/fee-types/normalize-fee-type';
import { FEE_TYPE_CATEGORIES } from '@/features/admin/finance/fee-types/fee-type-options';
import type { FeeTypeDetail } from '@/types/finance';

const EMPTY_VALUES: FeeTypeFormValues = {
  name: '',
  code: '',
  category: 'tuition',
  requiresSubscription: false,
  requiresUsageTracking: false,
  sequence: '',
  description: '',
};

export function FeeTypeEditDrawer({
  open,
  feeType,
  onClose,
  onSaved,
}: {
  open: boolean;
  feeType: FeeTypeDetail | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [values, setValues] = useState<FeeTypeFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const codeLocked = feeType?.usage?.historical_usage === true;

  useEffect(() => {
    if (!open || !feeType) {
      setValues(EMPTY_VALUES);
      setFieldErrors({});
      setSubmitting(false);
      return;
    }
    setValues(feeTypeFormValuesFromDetail(feeType));
    setFieldErrors({});
  }, [open, feeType]);

  const categoryOptions = useMemo(
    () =>
      FEE_TYPE_CATEGORIES.map((value) => ({
        value,
        label: t(`admin.finance.feeTypesWorkspace.categories.${value}`),
      })),
    [t],
  );

  function patch(patchValues: Partial<FeeTypeFormValues>) {
    setValues((prev) => ({ ...prev, ...patchValues }));
    setFieldErrors({});
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feeType || submitting) return;

    const payload = buildFeeTypeUpdatePayload(feeType, values);
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSubmitting(true);
    const res = await api.patch<FeeTypeDetail>(endpoints.admin.financeFeeType(feeType.id), payload);
    setSubmitting(false);

    if (res.success) {
      toast.success(t('admin.finance.feeTypesWorkspace.editSuccess'));
      onClose();
      onSaved();
      return;
    }

    const code = resolveFeeTypeErrorCode(res.error.code);
    if (code === 'fee_type_code_locked' || code === 'fee_type_code_exists') {
      setFieldErrors({ code: t(feeTypeErrorMessageKey(code)) });
      return;
    }
    toast.error(code ? t(feeTypeErrorMessageKey(code)) : res.error.message);
  }

  if (!feeType) return null;

  return (
    <SetupDrawer
      open={open}
      title={t('admin.finance.feeTypesWorkspace.editTitle')}
      onClose={onClose}
      size="medium"
    >
      <form className="fee-type-edit-drawer form-stack" onSubmit={onSubmit}>
        <label>
          {t('admin.finance.feeTypeName')}
          <input
            className="input"
            required
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>

        <label>
          {t('admin.finance.feeTypeCode')}
          <input
            className="input mono"
            dir="ltr"
            required
            value={values.code}
            disabled={codeLocked}
            onChange={(e) => patch({ code: e.target.value })}
          />
          {codeLocked ? (
            <span className="tiny muted">{t('admin.finance.feeTypesWorkspace.codeLockedHint')}</span>
          ) : null}
          {fieldErrors.code ? <span className="form-error">{fieldErrors.code}</span> : null}
        </label>

        <label>
          {t('admin.finance.category')}
          <select
            className="input"
            value={values.category}
            onChange={(e) => patch({ category: e.target.value })}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={values.requiresSubscription}
            onChange={(e) => patch({ requiresSubscription: e.target.checked })}
          />
          {t('admin.finance.feeTypesWorkspace.requiresSubscription')}
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={values.requiresUsageTracking}
            onChange={(e) => patch({ requiresUsageTracking: e.target.checked })}
          />
          {t('admin.finance.feeTypesWorkspace.requiresUsageTracking')}
        </label>

        <label>
          {t('admin.finance.feeTypesWorkspace.sequence')}
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={values.sequence}
            onChange={(e) => patch({ sequence: e.target.value })}
          />
        </label>

        <label>
          {t('common.description')}
          <textarea
            className="input"
            rows={3}
            value={values.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </label>

        <div className="fee-type-edit-drawer__footer row">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost" disabled={submitting} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
