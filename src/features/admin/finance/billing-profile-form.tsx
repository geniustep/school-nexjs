'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { StudentFinanceProfile, UpdateBillingProfilePayload } from '@/types/finance';

export function FinanceBillingProfileForm({
  studentId,
  onDone,
  onCancel,
}: {
  studentId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [billingPartnerType, setBillingPartnerType] = useState('guardian');
  const [billingPartnerId, setBillingPartnerId] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const payload: UpdateBillingProfilePayload = {
      billing_partner_type: billingPartnerType,
      payer_name: payerName.trim() || undefined,
      payer_phone: payerPhone.trim() || undefined,
    };
    if (billingPartnerId.trim()) payload.billing_partner_id = Number(billingPartnerId);
    if (guardianId.trim()) payload.guardian_id = Number(guardianId);

    const res = await api.put<StudentFinanceProfile>(
      endpoints.admin.financeBillingProfile(studentId),
      payload,
    );
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone();
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.manageBillingProfile')}</h3>
      {error && <p className="form-error">{error}</p>}
      <label>
        {t('admin.finance.billingPartnerType')}
        <select className="input" value={billingPartnerType} onChange={(e) => setBillingPartnerType(e.target.value)}>
          <option value="guardian">{t('admin.finance.partnerGuardian')}</option>
          <option value="student">{t('admin.finance.partnerStudent')}</option>
          <option value="other">{t('admin.finance.partnerOther')}</option>
        </select>
      </label>
      {billingPartnerType === 'guardian' && (
        <label>
          {t('admin.finance.guardianId')}
          <input className="input" type="number" min="1" value={guardianId} onChange={(e) => setGuardianId(e.target.value)} />
        </label>
      )}
      <label>
        {t('admin.finance.billingPartnerId')}
        <input className="input" type="number" min="1" value={billingPartnerId} onChange={(e) => setBillingPartnerId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.payerName')}
        <input className="input" value={payerName} onChange={(e) => setPayerName(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.payerPhone')}
        <input className="input" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
