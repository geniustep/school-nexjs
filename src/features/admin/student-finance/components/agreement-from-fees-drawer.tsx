'use client';

import { useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import { createAgreementFromCurrentFees } from '../api/finance-admin-api';
import {
  createAgreementFromCurrentFeesErrorMessageKey,
  isCreateAgreementFromCurrentFeesDuplicateError,
  readCreateAgreementFromCurrentFeesAgreementId,
} from '../utils/create-agreement-from-current-fees-errors';

export function AgreementFromFeesDrawer({
  open,
  studentId,
  financialOverview,
  onClose,
  onSuccess,
  onDuplicateDraft,
}: {
  open: boolean;
  studentId: number;
  financialOverview: StudentFinancialOverview | null;
  onClose: () => void;
  onSuccess: (agreementId: number) => void;
  onDuplicateDraft?: (agreementId: number | null, message: string) => void;
}) {
  const t = useT();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const academicYearId = financialOverview?.academic_year?.id;

  async function submit() {
    if (!academicYearId) {
      setError(t('admin.student360.financialAgreement.fromFees.errors.missingYear'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await createAgreementFromCurrentFees(studentId, academicYearId);
    setSubmitting(false);
    if (!res.success) {
      const message = t(createAgreementFromCurrentFeesErrorMessageKey(res.error.code));
      if (isCreateAgreementFromCurrentFeesDuplicateError(res.error.code)) {
        const agreementId = readCreateAgreementFromCurrentFeesAgreementId(res.error);
        onDuplicateDraft?.(agreementId, message);
        toast.show(message, 'info');
        onClose();
        return;
      }
      setError(message);
      return;
    }
    const agreementId = res.data?.id;
    toast.success(t('admin.student360.financialAgreement.fromFees.success'));
    onSuccess(agreementId ?? 0);
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

        <div className="form-actions">
          <button type="button" className="btn btn--primary" disabled={submitting} onClick={() => void submit()}>
            {submitting ? t('common.saving') : t('admin.student360.financialAgreement.fromFees.createButton')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </SetupDrawer>
  );
}
