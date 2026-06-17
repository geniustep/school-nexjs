'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { agreementFromFeesErrorMessageKey } from '@/lib/utils/collection-errors';
import { useStudentFinanceFees } from '@/features/admin/student-finance/hooks/use-student-finance-fees';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { AgreementFromCurrentFeesPayload } from '@/types/student-financial-overview';

export function AgreementFromFeesDrawer({
  open,
  studentId,
  financialOverview,
  onClose,
  onSuccess,
}: {
  open: boolean;
  studentId: number;
  financialOverview: StudentFinancialOverview | null;
  onClose: () => void;
  onSuccess: (agreementId: number) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [selectedFeeIds, setSelectedFeeIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const academicYearId = financialOverview?.academic_year?.id;
  const billingProfileId = financialOverview?.billing_profile_id ?? financialOverview?.billing_profile?.id;

  const feesState = useStudentFinanceFees(
    studentId,
    { page: 1, page_size: 100, academic_year_id: Number(academicYearId) },
    open && !!academicYearId,
  );

  const fees = feesState.data ?? [];

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setSelectedFeeIds(fees.map((f) => f.id));
    setError(null);
  }, [open, fees]);

  function toggleFee(id: number, checked: boolean) {
    if (checked) setSelectedFeeIds((prev) => [...new Set([...prev, id])]);
    else setSelectedFeeIds((prev) => prev.filter((v) => v !== id));
  }

  async function submit() {
    if (!academicYearId) {
      setError(t('admin.student360.financialAgreement.fromFees.errors.missingYear'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: AgreementFromCurrentFeesPayload = {
      academic_year_id: academicYearId,
      title: title.trim() || undefined,
      fee_ids: selectedFeeIds.length ? selectedFeeIds : undefined,
    };
    if (billingProfileId) payload.billing_profile_id = billingProfileId;

    const res = await api.post<{ agreement: { id: number } }>(
      endpoints.admin.financeStudentAgreementFromCurrentFees(studentId),
      payload,
    );
    setSubmitting(false);
    if (!res.success) {
      const key = agreementFromFeesErrorMessageKey(res.error.code);
      setError(key ? t(key) : res.error.message);
      return;
    }
    toast.success(t('admin.student360.financialAgreement.fromFees.success'));
    onSuccess(res.data.agreement.id);
    onClose();
  }

  if (!open) return null;

  return (
    <SetupDrawer
      open={open}
      title={t('admin.student360.financialAgreement.fromFees.title')}
      onClose={onClose}
    >
      <div className="form-stack">
        <p className="muted">{t('admin.student360.financialAgreement.fromFees.description')}</p>
        {error ? <p className="form-error">{error}</p> : null}

        <label>
          {t('admin.student360.finance.academicYear')}
          <input className="input" readOnly value={financialOverview?.academic_year?.name ?? ''} />
        </label>

        <label>
          {t('admin.student360.financialAgreement.fromFees.agreementTitle')}
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <fieldset>
          <legend>{t('admin.student360.financialAgreement.fromFees.includeFees')}</legend>
          {feesState.loading ? <p className="muted">{t('common.loading')}</p> : null}
          {fees.map((fee) => (
            <label key={fee.id} className="row">
              <input
                type="checkbox"
                checked={selectedFeeIds.includes(fee.id)}
                onChange={(e) => toggleFee(fee.id, e.target.checked)}
              />
              <span dir="auto">{fee.fee_type_name ?? fee.name ?? `#${fee.id}`}</span>
            </label>
          ))}
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn btn--primary" disabled={submitting} onClick={() => void submit()}>
            {submitting ? t('common.saving') : t('admin.student360.financialAgreement.fromFees.submit')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </SetupDrawer>
  );
}
