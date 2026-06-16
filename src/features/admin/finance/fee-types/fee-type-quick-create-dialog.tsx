'use client';

import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { FEE_TYPE_CATEGORIES } from '@/features/admin/finance/fee-types/fee-type-options';
import type { CreateFeeTypePayload, FeeType } from '@/types/finance';

export function FeeTypeQuickCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (feeType: FeeType) => void;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<string>(FEE_TYPE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setCode('');
    setCategory(FEE_TYPE_CATEGORIES[0]);
    setDescription('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function confirm() {
    if (submitting) return;
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (!trimmedName || !trimmedCode) {
      setError(t('admin.finance.feePlansWorkspace.errors.feeTypeNameCodeRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: CreateFeeTypePayload = {
      name: trimmedName,
      code: trimmedCode,
      category,
      description: description.trim() || undefined,
    };
    const res = await api.post<FeeType>(endpoints.admin.financeFeeTypes, payload);
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onCreated(res.data);
    handleClose();
  }

  return (
    <ConfirmationDialog
      open={open}
      size="wide"
      closeOnBackdrop={false}
      title={t('admin.finance.feePlansWorkspace.createFeeType')}
      body={
        <div className="fee-type-quick-create form-stack">
          {error ? <p className="form-error">{error}</p> : null}
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
        </div>
      }
      confirmLabel={t('common.save')}
      cancelLabel={t('common.cancel')}
      loading={submitting}
      onConfirm={confirm}
      onClose={handleClose}
    />
  );
}
